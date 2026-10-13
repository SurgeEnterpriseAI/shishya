# Surge tools gateway

Web search (through SearXNG on the same server) and page/PDF fetch for Shishya's
local research jobs (`src/lib/ai/local-research.ts`), so Qwen on Surge's server can
do what Claude's `web_search` tool did.

- Runs on surgeai as `surge-tools.service`, `127.0.0.1:8100`, standard library Python + `pdftotext` (poppler-utils).
- Exposed through Tailscale Funnel at `/tools` (next to the model at `/v1`):
  `sudo tailscale funnel --bg --set-path /tools http://127.0.0.1:8100/tools`
- Auth: `Authorization: Bearer <VLLM_API_KEY>` — the model's key, read by systemd from `/etc/surge/vllm.env`; never logged.
- Fetch refuses non-http(s), ports other than 80/443, and private / loopback / link-local / CGNAT (Tailscale) / multicast addresses, checked after DNS and on every redirect; `allowed_domains` is enforced here too.

Install / update:

```bash
scp surge_tools.py surge-tools.service surgeai-ts:/tmp/
ssh surgeai-ts "sudo install -m 0644 /tmp/surge_tools.py /opt/surge-tools/surge_tools.py && sudo install -m 0644 /tmp/surge-tools.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl restart surge-tools"
```
