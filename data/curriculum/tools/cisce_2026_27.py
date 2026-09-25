"""CISCE 2026-27 file, assembled 25 Sep 2026 (one-off; kept for provenance).

Run from a working directory holding the fetched cisce.org pages (*.html),
cisce-links.json and pdf/ (regulation + curriculum PDFs). Subject lists are
transcribed from the regulations' "Subjects of Examination" and the I-VIII
curriculum's "Subjects to be studied" tables (read from the PDFs in pdf/;
26 Sep 2026: no excerpts in the repo, see below); syllabus PDFs are matched by
file name. Writes data/curriculum/cisce/cisce-2026-27.json and the PDF link
lists in sources/cisce/*.links.json.
"""
import json, re, hashlib

REPO = str(__import__("pathlib").Path(__file__).resolve().parents[1])
BASE = "https://cisce.org/wp-content/uploads/"
links = json.load(open("cisce-links.json", encoding="utf-8"))
PAGES = {
    "icse2027": ("https://cisce.org/regulations-and-syllabus-icse-2027/", "regulations-and-syllabus-icse-2027.html"),
    "icse2028": ("https://cisce.org/regulations-and-syllabuses-icse-2028/", "regulations-and-syllabuses-icse-2028.html"),
    "isc2027": ("https://cisce.org/regulations-and-syllabus-isc-2027/", "regulations-and-syllabus-isc-2027.html"),
    "isc2028": ("https://cisce.org/regulations-and-syllabus-isc-2028/", "regulations-and-syllabus-isc-2028.html"),
    "rdcd": ("https://cisce.org/rdcd-curriculum-internal-page/", "rdcd-curriculum-internal-page.html"),
    "icse2027voc": ("https://cisce.org/vocational-subjects-icse-2027/", "vocational-subjects-icse-2027.html"),
    "icse2028voc": ("https://cisce.org/vocational-subjects-icse-2028/", "vocational-subjects-icse-2028.html"),
}
for _k in ("icse2027voc", "icse2028voc"):
    _f = PAGES[_k][1]
    _s = open(_f, encoding="utf-8", errors="replace").read()
    _u = []
    for _m in re.finditer(r"window\.open\(&#039;([^&]+?\.pdf)&#039;|href=\"([^\"]+?uploads[^\"]+?\.pdf)\"", _s):
        _x = _m.group(1) or _m.group(2)
        if not any(b in _x for b in ("Invitation", "Bifurcation", "RFP", "Circular-Health")) and _x not in _u:
            _u.append(_x)
    links[_f] = [{"label": "", "url": _x} for _x in _u]

def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()

def pdfs(page_file):
    seen, out = set(), []
    for r in links[page_file]:
        u = r["url"]
        if u.startswith("/"):
            u = "https://cisce.org" + u
        if u in seen or "French_25" in u:
            continue
        seen.add(u)
        out.append(u)
    return out

def key(s):
    s = s.lower().replace("&", " and ").replace("_", " ").replace("-", " ")
    s = re.sub(r"\b(a|an|the|and|isc|icse|20\d\d|group|grp)\b", " ", s)
    s = re.sub(r"(application)s\b", r"\1", s)
    return re.sub(r"[^a-z]", "", s)

def fname_key(u):
    f = u.rsplit("/", 1)[-1]
    f = re.sub(r"\.(doc|docx)?\.?pdf$", "", f, flags=re.I).replace(".pdf", "")
    f = re.sub(r"^\d+[\.\-]*\s*-?", "", f)
    f = re.sub(r"-\d$", "", f)
    return key(f.replace("-", " ").replace("_", " "))

ALIAS = {  # subject key -> filename key fragment when names differ
    key("A Second Language"): "secondlanguages", key("An Indian Language"): "indianlanguages",
    key("A Modern Foreign Language"): "modernforeignlanguage", key("A Classical Language"): "classicallanguage",
    key("History, Civics and Geography"): "historycivics", key("Science (Physics, Chemistry, Biology)"): "physics",
    key("Music (Hindustani, Carnatic or Western)"): "music", key("Art (Papers 1 to 6)"): "art",
    key("Business Studies (previously known as Commerce)"): "businessstudies",
    key("Socially Useful Productive Work and Community Service"): "supw", key("Health and Physical Education"): key("Health and Physical Education"),
    key("English (or Modern English)"): "english", key("Robotics and Artificial Intelligence"): "robotics",
    key("A Modern Foreign Language (Group III)"): "modernforeignlanguagesiii",
}

def attach(subjects, urls):
    out = []
    for s in subjects:
        k = key(s["name"])
        frag = ALIAS.get(k, k)
        hits = [u for u in urls if frag and fname_key(u) == frag] or [u for u in urls if frag and fname_key(u).startswith(frag)]
        if s["name"].startswith("Science (Physics"):
            hits = [u for u in urls if fname_key(u) in ("physics", "chemistry", "biology")]
        if s["name"].startswith("History, Civics and Geography"):
            hits = [u for u in urls if fname_key(u).startswith("historycivics") or fname_key(u).startswith("geography")]
            hits = [u for u in hits if ("Thailand" in u) == ("Thailand" in s["name"])]
        if s["name"].startswith("English (or Modern"):
            hits = [u for u in urls if fname_key(u) in ("english", "modernenglish")]
        e = dict(s)
        if hits:
            e["syllabusUrls"] = hits
        out.append(e)
    return out

def S(group, *names, **kw):
    return [{"name": n, "group": group, **kw} for n in names]

ICSE_I = S("Group I (compulsory)", "English", "A Second Language", "History, Civics and Geography") + \
         S("Group I (compulsory)", "History, Civics and Geography (Thailand)", note="alternative, only for affiliated schools in Thailand")
ICSE_II = S("Group II (any two/three)", "Mathematics", "Science (Physics, Chemistry, Biology)", "Economics", "Commercial Studies",
            "A Modern Foreign Language", "A Classical Language", "Environmental Science")
ICSE_B = S("Group III Section B", "Robotics and Artificial Intelligence", "Assistant Beauty Therapist", "Assistant Hair Stylist",
           "Basic Data Entry Operator", "Dietetic Aide", "Cashier", "Early Years Physical Activity Facilitator", "Auto Service Technician")
ICSE_2028_A = S("Group III Section A (one/two of Group III)", "Computer Applications", "Economic Applications", "Commercial Applications", "Art",
                "Performing Arts", "Home Science", "Cookery", "Fashion Designing", "Physical Education", "Yoga",
                "Technical Drawing Applications", "Environmental Applications", "Mass Media & Communication", "Hospitality Management")
ICSE_2027_A = S("Group III Section A (one/two of Group III)", "Computer Applications", "Economic Applications", "Commercial Applications", "Art",
                "Performing Arts", "Home Science", "Cookery", "Fashion Designing", "Physical Education", "Yoga",
                "Technical Drawing Applications", "Environmental Applications", "A Modern Foreign Language (Group III)",
                "Mass Media & Communication", "Hospitality Management")
ISC_ELECTIVES_2027 = ["An Indian Language", "A Modern Foreign Language", "A Classical Language", "Elective English", "History",
                      "Political Science", "Geography", "Sociology", "Psychology", "Economics", "Commerce", "Accountancy",
                      "Business Studies", "Mathematics", "Physics", "Chemistry", "Biology", "Home Science", "Fashion Designing",
                      "Electricity & Electronics", "Engineering Science", "Computer Science", "Geometrical & Mechanical Drawing",
                      "Geometrical & Building Drawing", "Art (Papers 1 to 6)", "Music (Hindustani, Carnatic or Western)",
                      "Physical Education", "Environmental Science", "Biotechnology", "Mass Media & Communication",
                      "Hospitality Management", "Legal Studies", "Artificial Intelligence", "Robotics", "Applied Mathematics"]
ISC_ELECTIVES_2028 = ["An Indian Language", "A Modern Foreign Language", "A Classical Language", "Elective English", "History",
                      "Political Science", "Geography", "Sociology", "Psychology", "Economics",
                      "Business Studies (previously known as Commerce)", "Accountancy", "Entrepreneurship", "Mathematics", "Physics",
                      "Chemistry", "Biology", "Home Science", "Fashion Designing", "Electricity & Electronics", "Engineering Science",
                      "Computer Science", "Geometrical & Mechanical Drawing", "Geometrical & Building Drawing", "Art (Papers 1 to 6)",
                      "Music (Hindustani, Carnatic or Western)", "Physical Education", "Environmental Science", "Biotechnology",
                      "Mass Media & Communication", "Hospitality Management", "Legal Studies", "Artificial Intelligence", "Robotics",
                      "Applied Mathematics"]

def reg(url_path, local):
    return {"url": BASE + url_path, "sha256": sha("pdf/" + local)}

u27 = pdfs(PAGES["icse2027"][1]) + pdfs(PAGES["icse2027voc"][1])
u28 = pdfs(PAGES["icse2028"][1]) + pdfs(PAGES["icse2028voc"][1])
i27, i28 = pdfs(PAGES["isc2027"][1]), pdfs(PAGES["isc2028"][1])
rd = pdfs(PAGES["rdcd"][1])
RDCD_PRIMARY = BASE + "2025/03/PrimaryCurriculum.pdf"
RDCD_UPPER = BASE + "2025/03/UpperPrimary.pdf"
extra_primary = [u for u in rd if "I-V" in u and "VI-VIII" not in u]
extra_upper = [u for u in rd if "VI-VIII" in u or "V-VIII" in u]

levels = [
    {"classes": [1, 2], "stage": "Primary (Classes I-II)",
     "document": {"title": "CISCE Curriculum — Primary Classes (I-V)", "url": RDCD_PRIMARY, "sha256": sha("pdf/2025_03_PrimaryCurriculum.pdf"), "dated": "November 2016"},
     "subjects": [{"name": n} for n in ["English", "Second Language", "Mathematics", "Environmental Studies (EVS)", "Computer Studies", "Arts Education"]],
     "subjectListSource": "PrimaryCurriculum.pdf / UpperPrimary.pdf introduction, 'Subjects to be studied at the Primary Level' (Classes I-II column)",
     "supplementaryDocuments": extra_primary},
    {"classes": [3, 4, 5], "stage": "Primary (Classes III-V)",
     "document": {"title": "CISCE Curriculum — Primary Classes (I-V)", "url": RDCD_PRIMARY, "sha256": sha("pdf/2025_03_PrimaryCurriculum.pdf"), "dated": "November 2016"},
     "subjects": [{"name": n} for n in ["English", "Second Language", "Mathematics", "Science", "Social Studies", "Computer Studies", "Arts Education"]],
     "subjectListSource": "'Subjects to be studied at the Primary Level' (Classes III – V column)",
     "supplementaryDocuments": extra_primary},
    {"classes": [6, 7, 8], "stage": "Upper Primary (Classes VI-VIII)",
     "document": {"title": "CISCE Curriculum — Upper Primary Classes (VI-VIII)", "url": RDCD_UPPER, "sha256": sha("pdf/2025_03_UpperPrimary.pdf"), "dated": "November 2016"},
     "subjects": [{"name": n} for n in ["English", "Second Language", "Mathematics", "Science (Physics, Chemistry, Biology)",
                                        "History, Civics & Geography (History & Civics, Geography)", "Computer Studies", "Arts Education"]],
     "subjectListSource": "'Subjects to be studied at the Upper Primary Level' (Classes VI - VIII)",
     "supplementaryDocuments": extra_upper},
]
for lv in levels:
    lv["alsoTakenUp"] = ["Third Language (at least Class V-VIII)", "Physical Education/ Yoga", "Education in Moral and Spiritual Values",
                         "Socially Useful Productive Work and Community Service (SUPW) (VI -VIII)"]
    lv["alsoTakenUpQuote"] = "NOTE: In addition to the above, the following should also be taken up at the Primary and Upper Primary levels"
levels += [
    {"classes": [9], "stage": "ICSE (Class IX of the IX-X course)", "examinationYear": "ICSE 2028",
     "sessionMapping": "ICSE is a two-year course (Classes IX-X) examined at the end of Class X, so Class IX in 2026-27 follows the ICSE Examination Year 2028 regulations and syllabuses (our derivation from the course structure).",
     "syllabusPage": PAGES["icse2028"][0], "regulations": reg("2026/07/ICSE-Regulations-July-2026.pdf", "2026_07_ICSE-Regulations-July-2026.pdf"),
     "subjects": attach(ICSE_I + ICSE_II + ICSE_2028_A + ICSE_B +
                        S("Internal assessment (compulsory)", "Socially Useful Productive Work and Community Service", "Health and Physical Education"), u28),
     "rules": ["Candidates may select one subject either from Section A or Section B OR Two subjects, one from Section A and one from Section B",
               "It is expected that candidates will normally opt for both Science and Mathematics from Group II.",
               "Part I: Compulsory — (a) A third language from at least Class V to Class VIII (Internal Examination). (b) Art (Internal Assessment). (c) Socially Useful Productive Work and Community Service (Internal Assessment). (d) Health and Physical Education (Internal Assessment). (e) Education in Moral and Spiritual Values."],
     "allSyllabusPdfs": u28},
    {"classes": [10], "stage": "ICSE (Class X, examined in 2027)", "examinationYear": "ICSE 2027",
     "sessionMapping": "Class X in 2026-27 sits the ICSE Examination Year 2027.",
     "syllabusPage": PAGES["icse2027"][0], "regulations": reg("2025/03/1.-Regulations.pdf", "2025_03_1.-Regulations.pdf"),
     "subjects": attach(ICSE_I + ICSE_II + ICSE_2027_A + ICSE_B +
                        S("Internal assessment (compulsory)", "Socially Useful Productive Work and Community Service"), u27),
     "rules": ["Candidates may select one subject either from Section A or Section B … Two subjects, one from Section A and one from Section B",
               "It is expected that candidates will normally offer both Science and Mathematics from Group II."],
     "allSyllabusPdfs": u27},
    {"classes": [11], "stage": "ISC (Class XI of the XI-XII course)", "examinationYear": "ISC 2028",
     "sessionMapping": "ISC is a two-year course (Classes XI-XII) examined at the end of Class XII, so Class XI in 2026-27 follows the ISC Examination Year 2028 regulations and syllabuses (our derivation from the course structure).",
     "syllabusPage": PAGES["isc2028"][0], "regulations": reg("2026/07/ISC-Regulations-July-2026.pdf", "2026_07_ISC-Regulations-July-2026.pdf"),
     "subjects": attach(S("Compulsory", "English (or Modern English)") + S("Elective (four or five)", *ISC_ELECTIVES_2028), i28) +
                 attach(S("Internal assessment (compulsory)", "Socially Useful Productive Work and Community Service", "Health and Physical Education"), i28),
     "rules": ["All candidates for the Examination must enter for English / Modern English (compulsory), with four or five elective subjects.",
               "A candidate may not enter for more than six subjects including the compulsory subject English / Modern English.",
               "Not permitted together: English with Modern English; Physics with Engineering Science; Geometrical & Mechanical Drawing with Geometrical & Building Drawing; Mathematics with Applied Mathematics; Robotics with Artificial Intelligence."],
     "allSyllabusPdfs": i28},
    {"classes": [12], "stage": "ISC (Class XII, examined in 2027)", "examinationYear": "ISC 2027",
     "sessionMapping": "Class XII in 2026-27 sits the ISC Examination Year 2027.",
     "syllabusPage": PAGES["isc2027"][0], "regulations": reg("2025/04/1.-ISC-Regulations.pdf", "2025_04_1.-ISC-Regulations.pdf"),
     "subjects": attach(S("Compulsory", "English (or Modern English)") + S("Elective (four or five)", *ISC_ELECTIVES_2027), i27) +
                 attach(S("Internal assessment (compulsory)", "Socially Useful Productive Work and Community Service"), i27),
     "rules": ["Not permitted together: English with Modern English; Physics with Engineering Science; Geometrical & Mechanical Drawing with Geometrical & Building Drawing; Mathematics with Applied Mathematics; Robotics with Artificial Intelligence."],
     "allSyllabusPdfs": i27},
]
doc = {
    "board": "CISCE", "session": "2026-27", "fetchedOn": "2026-09-25",
    "note": "CISCE prescribes syllabuses, not a single textbook series. This file lists subjects per class and the official regulation/syllabus PDFs only; it lists no textbooks and no chapters.",
    "sources": {k: {"url": v[0], "snapshotLinks": f"data/curriculum/sources/cisce/{v[1].replace('.html', '.links.json')}", "sha256": sha(v[1])} for k, v in PAGES.items()},
    "levels": levels,
}
open(REPO + "/cisce/cisce-2026-27.json", "w", encoding="utf-8", newline="\n").write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
for k, (u, f) in PAGES.items():
    open(REPO + "/sources/cisce/" + f.replace(".html", ".links.json"), "w", encoding="utf-8", newline="\n").write(
        json.dumps({"page": u, "fetched": "2026-09-25", "sha256": sha(f), "pdfs": pdfs(f)}, indent=1) + "\n")
# 26 Sep 2026 (review): the regulation / curriculum excerpts are no longer
# written into the repo — the repo is public and CISCE's PDFs say no part may be
# reproduced without written approval. The subject lists above were read from
# them; the JSON keeps each PDF's URL + sha256, and the pdf/ folder here keeps
# the files themselves.
for lv in levels:
    miss = [s["name"] for s in lv["subjects"] if "syllabusUrls" not in s and lv["classes"][0] >= 9]
    print(lv["classes"], len(lv["subjects"]), "no syllabus pdf matched:", miss)
