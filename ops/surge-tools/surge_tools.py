#!/usr/bin/env python3
"""Surge tools gateway (13 Oct 2026): web search + page/PDF fetch for Shishya's
local research jobs, so Qwen on this server can do what Claude's web_search tool
did. Standard library only (plus pdftotext from poppler-utils).

  GET  /health                         -> {"ok": true}
  POST /search {q, n?, allowed_domains?} -> {"results": [{url, title, snippet, engines}]}
  POST /fetch  {url, max_chars?, allowed_domains?}
                                       -> {url, final_url, status, content_type, title, text, links, truncated}

Paths also work under /tools/... (the Tailscale Funnel mount). Every request
needs "Authorization: Bearer <SURGE_TOOLS_KEY>" (the vLLM key, from the unit's
EnvironmentFile; never logged). Listens on 127.0.0.1 only.

Safety: fetch only http(s) on ports 80/443, and never a private, loopback,
link-local, CGNAT/Tailscale or multicast address (checked after DNS and on
every redirect). 15 MB cap, 25 s timeout, 1 s gap per host, 4 fetches at once,
30-minute cache. Search goes to SearXNG on 127.0.0.1:8888 with the engine sets
that answered from this IP on 13 Oct; an allowed_domains list keeps only hits
on those hosts (subdomains included).
"""

import html
import html.parser
import ipaddress
import json
import os
import re
import socket
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KEY = os.environ.get("SURGE_TOOLS_KEY") or os.environ.get("VLLM_API_KEY") or ""
SEARXNG = os.environ.get("SEARXNG_URL", "http://127.0.0.1:8888")
PORT = int(os.environ.get("SURGE_TOOLS_PORT", "8100"))
UA = "Mozilla/5.0 (compatible; ShishyaResearch/1.0; +https://shishya.in)"
MAX_BYTES = 15 * 1024 * 1024
FETCH_TIMEOUT = 25
CACHE_TTL = 30 * 60
RETRY_ENGINE_SETS = [None, ["yahoo", "duckduckgo web"], ["bing", "yandex"]]

_cache: dict = {}
_cache_lock = threading.Lock()
_fetch_slots = threading.Semaphore(4)
_host_last: dict = {}
_host_lock = threading.Lock()


def cache_get(k):
    with _cache_lock:
        v = _cache.get(k)
        if v and time.time() - v[0] < CACHE_TTL:
            return v[1]
        return None


def cache_put(k, v):
    with _cache_lock:
        if len(_cache) > 2000:
            for old in sorted(_cache, key=lambda x: _cache[x][0])[:500]:
                _cache.pop(old, None)
        _cache[k] = (time.time(), v)


def host_ok(host, allowed):
    host = (host or "").lower().rstrip(".")
    if host.startswith("www."):
        host = host[4:]
    if not allowed:
        return True
    for d in allowed:
        d = d.lower().strip().lstrip(".")
        if d.startswith("www."):
            d = d[4:]
        if host == d or host.endswith("." + d):
            return True
    return False


def public_address(host):
    """True only when every address the host resolves to is public."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return False
    if not infos:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split("%")[0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved
                or ip.is_unspecified or ip in ipaddress.ip_network("100.64.0.0/10")):
            return False
    return True


def check_url(url, allowed):
    p = urllib.parse.urlsplit(url)
    if p.scheme not in ("http", "https"):
        raise ValueError("only http(s)")
    if p.port not in (None, 80, 443):
        raise ValueError("port not allowed")
    if not p.hostname or not public_address(p.hostname):
        raise ValueError("address not allowed")
    if not host_ok(p.hostname, allowed):
        raise ValueError("host not in allowed_domains")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


_opener = urllib.request.build_opener(NoRedirect)


class TextAndLinks(html.parser.HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template", "head"}
    BLOCK = {"p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "table", "section", "article", "ul", "ol", "td", "th"}

    def __init__(self, base):
        super().__init__(convert_charrefs=True)
        self.base = base
        self.out = []
        self.skip = 0
        self.title = ""
        self.in_title = False
        self.links = []
        self.href = None
        self.atext = []

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
        if tag in self.SKIP:
            self.skip += 1
        if tag in self.BLOCK:
            self.out.append("\n")
        if tag == "td" or tag == "th":
            self.out.append(" | ")
        if tag == "a":
            href = dict(attrs).get("href")
            if href and not href.startswith(("javascript:", "mailto:", "#")):
                self.href = urllib.parse.urljoin(self.base, href)
                self.atext = []

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        if tag == "a" and self.href:
            t = re.sub(r"\s+", " ", "".join(self.atext)).strip()
            self.links.append({"text": t[:200], "url": self.href})
            self.href = None

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.skip:
            return
        self.out.append(data)
        if self.href is not None:
            self.atext.append(data)


def pdf_text(data):
    with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
        f.write(data)
        f.flush()
        r = subprocess.run(["pdftotext", "-layout", "-l", "40", f.name, "-"], capture_output=True, timeout=60)
        return r.stdout.decode("utf-8", "replace")


def polite(host):
    with _host_lock:
        last = _host_last.get(host, 0)
        wait = 1.0 - (time.time() - last)
        _host_last[host] = max(time.time(), last + 1.0)
    if wait > 0:
        time.sleep(wait)


def do_fetch(url, max_chars, allowed):
    key = ("fetch", url, max_chars)
    hit = cache_get(key)
    if hit:
        return hit
    current = url
    with _fetch_slots:
        for _ in range(6):
            check_url(current, allowed)
            polite(urllib.parse.urlsplit(current).hostname)
            req = urllib.request.Request(current, headers={"User-Agent": UA, "Accept": "text/html,application/pdf,*/*;q=0.8", "Accept-Language": "en-IN,en;q=0.9,hi;q=0.6"})
            try:
                resp = _opener.open(req, timeout=FETCH_TIMEOUT)
            except urllib.error.HTTPError as e:
                if e.code in (301, 302, 303, 307, 308) and e.headers.get("Location"):
                    current = urllib.parse.urljoin(current, e.headers["Location"])
                    continue
                return {"url": url, "final_url": current, "status": e.code, "content_type": "", "title": "", "text": "", "links": [], "truncated": False, "error": f"HTTP {e.code}"}
            break
        else:
            raise ValueError("too many redirects")
        status = resp.status
        ctype = (resp.headers.get("Content-Type") or "").lower()
        data = resp.read(MAX_BYTES + 1)
    big = len(data) > MAX_BYTES
    data = data[:MAX_BYTES]
    title, links = "", []
    if "pdf" in ctype or current.lower().split("?")[0].endswith(".pdf") or data[:5] == b"%PDF-":
        text = pdf_text(data)
        ctype = ctype or "application/pdf"
    elif "html" in ctype or data.lstrip()[:1] == b"<":
        cm = re.search(r"charset=([A-Za-z0-9_-]+)", ctype)
        if cm:
            enc = cm.group(1)
        else:
            bm = re.search(rb'charset=["\']?([A-Za-z0-9_-]+)', data[:4000])
            enc = bm.group(1).decode() if bm else "utf-8"
        try:
            doc = data.decode(enc, "replace")
        except LookupError:
            doc = data.decode("utf-8", "replace")
        p = TextAndLinks(current)
        p.feed(doc)
        text = "".join(p.out)
        title, links = html.unescape(p.title).strip(), p.links[:400]
    else:
        text = data.decode("utf-8", "replace")
    text = re.sub(r"[ \t ]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    out = {"url": url, "final_url": current, "status": status, "content_type": ctype, "title": title[:300],
           "text": text[:max_chars], "links": links, "truncated": big or len(text) > max_chars}
    cache_put(key, out)
    return out


def do_search(q, n, allowed):
    key = ("search", q, n, tuple(allowed or ()))
    hit = cache_get(key)
    if hit:
        return hit
    site = re.search(r"(?:^|\s)site:([a-z0-9.-]+)", q, re.I)
    keep = list(allowed or []) + ([site.group(1)] if site else [])
    results = []
    for engines in RETRY_ENGINE_SETS:
        params = {"q": q, "format": "json", "safesearch": "1", "language": "en-IN"}
        if engines:
            params["engines"] = ",".join(engines)
        try:
            req = urllib.request.Request(f"{SEARXNG}/search?{urllib.parse.urlencode(params)}", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.load(r)
        except Exception:
            data = {"results": []}
        seen = set()
        results = []
        for r in data.get("results", []):
            u = r.get("url") or ""
            if not u or u in seen:
                continue
            if keep and not host_ok(urllib.parse.urlsplit(u).hostname, keep):
                continue
            seen.add(u)
            results.append({"url": u, "title": (r.get("title") or "")[:300], "snippet": (r.get("content") or "")[:600], "engines": r.get("engines") or []})
        if results:
            break
        time.sleep(1.5)
    out = {"results": results[: max(1, min(n, 20))]}
    cache_put(key, out)
    return out


RESEARCH_DIR = os.environ.get("RESEARCH_SHADOW_DIR", "/var/lib/research-shadow")
ITEM_KEYS = ("kind", "label", "date", "evidence", "sourceUrl", "official", "verified")
NEWS_KEYS = ("title", "date", "evidence", "sourceUrl", "official", "verified")


def do_research(code):
    """The latest (up to 3) nightly research runs for one exam: verified dates and news with
    the sentence each was quoted from. Read-only over RESEARCH_DIR (14 Oct 2026)."""
    if not re.fullmatch(r"[A-Z0-9_]{2,40}", code or ""):
        raise ValueError("bad exam code")
    runs = []
    days = sorted((d for d in os.listdir(RESEARCH_DIR) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d)), reverse=True)
    for day in days:
        for run in sorted(os.listdir(os.path.join(RESEARCH_DIR, day)), reverse=True):
            path = os.path.join(RESEARCH_DIR, day, run, f"{code}.json")
            if not os.path.isfile(path):
                continue
            with open(path, encoding="utf-8") as f:
                d = json.load(f)
            started = None
            summ = os.path.join(RESEARCH_DIR, day, run, "summary.json")
            if os.path.isfile(summ):
                with open(summ, encoding="utf-8") as f:
                    started = json.load(f).get("startedAt")
            runs.append({
                "run": f"{day}/{run}",
                "startedAt": started,
                "manual": run.endswith("-manual"),
                "items": [{k: it.get(k) for k in ITEM_KEYS} for it in (d.get("items") or [])],
                "news": [{k: n.get(k) for k in NEWS_KEYS} for n in (d.get("news") or [])],
            })
            if len(runs) >= 3:
                return {"code": code, "runs": runs}
    return {"code": code, "runs": runs}


class Handler(BaseHTTPRequestHandler):
    server_version = "surge-tools/1.0"

    def log_message(self, fmt, *args):  # one short line, never headers
        print(f"{self.address_string()} {self.command} {self.path.split('?')[0]} {args[1] if len(args) > 1 else ''}", flush=True)

    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _route(self):
        p = self.path.split("?")[0]
        return p[len("/tools"):] if p.startswith("/tools/") or p == "/tools" else p

    def _authed(self):
        return bool(KEY) and self.headers.get("Authorization", "") == f"Bearer {KEY}"

    def do_GET(self):
        if self._route() in ("/health", "/"):
            return self._send(200, {"ok": True})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if not self._authed():
            return self._send(401, {"error": "unauthorized"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(min(n, 100_000)) or b"{}")
            allowed = [str(d) for d in (body.get("allowed_domains") or [])][:50]
            route = self._route()
            if route == "/search":
                q = str(body.get("q") or "").strip()[:400]
                if not q:
                    return self._send(400, {"error": "q required"})
                return self._send(200, do_search(q, int(body.get("n") or 10), allowed))
            if route == "/fetch":
                url = str(body.get("url") or "").strip()
                return self._send(200, do_fetch(url, max(1000, min(int(body.get("max_chars") or 60000), 300_000)), allowed))
            if route == "/research":
                return self._send(200, do_research(str(body.get("code") or "").strip()))
            self._send(404, {"error": "not found"})
        except ValueError as e:
            self._send(400, {"error": str(e)[:200]})
        except Exception as e:  # network trouble etc.
            self._send(502, {"error": type(e).__name__ + ": " + str(e)[:200]})


if __name__ == "__main__":
    if not KEY:
        raise SystemExit("SURGE_TOOLS_KEY / VLLM_API_KEY not set")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
