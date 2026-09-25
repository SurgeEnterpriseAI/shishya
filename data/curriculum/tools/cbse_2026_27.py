"""CBSE 2026-27 file, assembled 25 Sep 2026 (one-off; kept for provenance).

Run from a working directory holding what it read: curriculum_2027.html, the
two Curriculum_Sec*_2026-27.pdf files, cbse-links.json (subject links parsed
from the page), cbse-fetch.json (every syllabus PDF fetched, with sha256) and
cbse-ncert-links.json (the mechanical prescribed-book matches). The scheme
lists and the MANUAL / INFERRED links were read by hand from the quoted text.
Writes data/curriculum/cbse/cbse-2026-27.json and
data/curriculum/sources/cbse/syllabus-pdfs-<date>.tsv.

26 Sep 2026 (review):
- The repo is public and CBSE allows reproduction only with permission, so
  the page snapshot and the two curriculum-PDF excerpts are no longer written
  into the repo. The JSON keeps URL + sha256 + the pages read, and the short
  quotes it already carries.
- XI-XII links now say which class CBSE teaches each book in (`classes`).
  NCERT's index files Indian Economic Development under Class XI and
  Introductory Microeconomics under Class XII, but CBSE's Economics course
  puts Microeconomics in XI and Indian Economic Development in XII.
- Added links the matcher missed (Accountancy I/II Class XII, Kaleidoscope —
  NCERT's index spells it "Kaliedoscope" — and Words and Expressions 2), and
  marked Biotechnology's NCERT book "reference-only" (CBSE prescribes its own).
- English links carry CBSE's prescribed piece lists (`pieces`), so the test
  can check that every prescribed poem/lesson is in the NCERT spine.
"""
import json, re, hashlib, os

REPO = str(__import__("pathlib").Path(__file__).resolve().parents[1])
PAGE = "https://cbseacademic.nic.in/curriculum_2027.html"
P1 = "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Curriculum_SecP1_2026-27.pdf"
P2 = "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Curriculum_SecP2_2026-27.pdf"

def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()

links = json.load(open("cbse-links.json", encoding="utf-8"))
fetched = {f["url"]: f for f in json.load(open("cbse-fetch.json", encoding="utf-8"))}
evid = {(e["band"], e["url"]): e for e in json.load(open("cbse-ncert-links.json", encoding="utf-8"))}

# evidence found by reading the prescribed-books text where the mechanical
# matcher could not (quoted verbatim from the named syllabus PDF, 25 Sep 2026)
MANUAL = {
    ("XI-XII", "Political Science"): [("keps2", "manual-quote", "PART A INDIAN CONSTITUTION AT WORK Constitution: Why and How? Rights in the Indian Constitution … (the unit is named after the NCERT book and lists its chapter titles)")],
    ("XI-XII", "Economics"): [("leec1", "manual-quote", "Prescribed Books: 1. Statistics for Economics, NCERT 2. Indian Economic Development, NCERT 3. Introductory Microeconomics, NCERT 4. Macroeconomics, NCERT")],
    ("XI-XII", "Geography"): [("legy2", "ncert-url-in-syllabus", "https://ncert.nic.in/textbook.php?legy2=0-9")],
    ("IX", "Physical Education & Well Being"): [("iehp1", "cbse-statement+ncert-index", "The NCF-SE 2023 aligned new textbook of Physical Education and Well-being for Grade 9 developed by the NCERT. (NCERT index, Class IX, 'Physical Education and Well Being' lists one book: Khel Praveen)")],
    ("IX", "Vocational Education (Kaushal Vikas)"): [("iekv1", "title-in-cbse-subject-name", "CBSE subject 'Vocational Education (Kaushal Vikas)'; NCERT index, Class IX, 'Skill Education' lists 'Kaushal Vikas'")],
    # 26 Sep 2026 (review): read from the prescribed-books text the matcher missed
    ("X", "English - Language and Literature"): [
        ("jefp1", "manual-quote", "Prescribed Books: Published by NCERT, New Delhi 1. FIRST FLIGHT … 2. FOOTPRINTS WITHOUT FEET"),
        ("jewe2", "manual-quote", "3. WORDS AND EXPRESSIONS – II (WORKBOOK FOR CLASS X) – Units 1 to 4 and Units 7 to 11"),
    ],
    ("XI-XII", "Accountancy"): [
        ("leac1", "manual-quote", "Prescribed Books: Financial Accounting -I Class XI … Accountancy -II Class XI … Accountancy -I Class XII … Accountancy -II Class XII … Accountancy – Computerised Accounting System Class XII (NCERT Publication)"),
        ("leac2", "manual-quote", "Prescribed Books: … Accountancy -I Class XII … Accountancy -II Class XII … (NCERT Publication)"),
    ],
    ("XI-XII", "English Elective"): [("lekl1", "manual-quote", "Class XII Prescribed Books: 1. Kaleidoscope - Text book published by NCERT (NCERT's index spells the book 'Kaliedoscope')")],
}
# NCERT books CBSE names only "as reference" (its prescribed textbooks are CBSE's own)
REFERENCE_ONLY = {("XI-XII", "Biotechnology"): {"kebt1": "Prescribed Books: 1. A Text Book of Biotechnology - Class XI : Published by CBSE … 2. As reference- Biotechnology - Class XI : Published by NCERT"}}
# Which class CBSE teaches a XI-XII book in, where its course structure differs from the class NCERT's index files the book under
CBSE_CLASS = {
    ("XI-XII", "Economics"): {
        "kest1": [11], "leec2": [11], "leec1": [12], "keec1": [12],
        "_quote": "CLASS XI … Part A Statistics for Economics … Part B Introductory Microeconomics; CLASS XII … Part A Introductory Macroeconomics … Part B Indian Economic Development (Economics_SecP2_2026-27.pdf, course structure)",
    },
}
# CBSE's prescribed piece lists for NCERT English readers, as CBSE prints them (the test checks each is in the NCERT spine)
PIECES = {
    ("X", "English - Language and Literature", "jeff1"): [
        "A Letter to God", "Nelson Mandela - Long Walk to Freedom", "Stories About Flying", "From the Diary of Anne Frank", "Glimpses of India",
        "Mijbil the Otter", "Madam Rides the Bus", "The Sermon at Benares", "The Proposal (Play)",
        "Dust of Snow", "Fire and Ice", "A Tiger in the Zoo", "How to Tell Wild Animals", "The Ball Poem", "Amanda!", "The Trees", "Fog",
        "The Tale of Custard the Dragon", "For Anne Gregory"],
    ("X", "English - Language and Literature", "jefp1"): [
        "A Triumph of Surgery", "The Thief's Story", "The Midnight Visitor", "A Question of Trust", "Footprints Without Feet",
        "The Making of a Scientist", "The Necklace", "Bholi", "The Book that Saved the Earth"],
    ("XI-XII", "English Core", "kehb1"): [
        "The Portrait of a Lady (Prose)", "A Photograph (Poem)", "“We’re Not Afraid to Die… if We Can Be Together", "Discovering Tut: The Saga Continues",
        "The Laburnum Top (Poem)", "The Voice of the Rain (Poem)", "Childhood (Poem)", "The Adventure", "Silk Road (Prose)", "Father to Son"],
    ("XI-XII", "English Core", "kesp1"): [
        "The Summer of the Beautiful White Horse (Prose)", "The Address (Prose)", "Mother’s Day (Play)", "Birth (Prose)", "The Tale of Melon City"],
    ("XI-XII", "English Core", "lefl1"): [
        "The Last Lesson", "Lost Spring", "Deep Water", "The Rattrap", "Indigo", "Poets and Pancakes", "The Interview", "Going Places",
        "My Mother at Sixty-Six", "Keeping Quiet", "A Thing of Beauty", "A Roadside Stand", "Aunt Jennifer’s Tigers"],
    ("XI-XII", "English Core", "levt1"): [
        "The Third Level", "The Tiger King", "Journey to the End of the Earth", "The Enemy", "On the Face of It", "Memories of Childhood",
        "The Cutting of My Long Hair", "We Too are Human Beings"],
}


def ncert_class_of(code):
    """The class NCERT's index files a book under (from the committed spine)."""
    import glob
    for f in sorted(glob.glob(REPO + "/ncert/class-*.json")):
        d = json.load(open(f, encoding="utf-8"))
        for s in d["subjects"]:
            if any(b["code"] == code for b in s["books"]):
                return d["classes"]
    return None
URL_IN_SYLLABUS = {("XI-XII", "Geography"): ["kegy1", "kegy2", "kegy3", "legy1", "legy2", "legy3"],
                   ("XI-XII", "Chemistry"): ["kech1", "kech2", "lech1", "lech2"]}
INFERRED = {("IX", "Social Science"): [("iest1", "inferred", "CBSE: 'PRESCRIBED TEXT BOOKS … 1 Social Science-Part 1 NCERT … 2 Social Science-Part 2'; NCERT index, Class IX Social Science lists only 'Understanding Society India and Beyond PART-I' (iest1). Part 2 is not on the NCERT index on 25 Sep 2026.")]}
SKIP_FALSE = {("IX", "Mathematics"): {"iesc1"}}

def subject_entries(band):
    out = []
    for l in links:
        if l["band"] != band or "Initial" in (l["group"] or ""):
            continue
        g = l["group"]
        f = fetched.get(l["url"])
        e = evid.get((band, l["url"]))
        ncert = []
        if e:
            for x in e["links"]:
                if x["code"] in SKIP_FALSE.get((band, l["name"]), set()):
                    continue
                ncert.append({"book": x["code"], "class": x["class"], "method": x["method"], "evidence": x["evidence"][:300]})
        have = {n["book"] for n in ncert}
        for code in URL_IN_SYLLABUS.get((band, l["name"]), []):
            if code not in have:
                ncert.append({"book": code, "method": "ncert-url-in-syllabus", "evidence": f"https://ncert.nic.in/textbook.php?{code}=…"})
            else:
                for n in ncert:
                    if n["book"] == code:
                        n["method"] = "ncert-url-in-syllabus"
        for code, how, ev in MANUAL.get((band, l["name"]), []) + INFERRED.get((band, l["name"]), []):
            if code not in {n["book"] for n in ncert}:
                ncert.append({"book": code, "method": how, "evidence": ev})
        for n in ncert:
            ref = REFERENCE_ONLY.get((band, l["name"]), {}).get(n["book"])
            if ref:
                n["method"], n["evidence"] = "reference-only", ref
            if band == "XI-XII":
                # which class CBSE teaches it in: CBSE's course structure where it differs from NCERT's index class
                over = CBSE_CLASS.get((band, l["name"]), {})
                if n["book"] in over:
                    n["classes"], n["classFrom"], n["classEvidence"] = over[n["book"]], "cbse-course-structure", over["_quote"]
                else:
                    n["classes"], n["classFrom"] = ncert_class_of(n["book"]), "ncert-index"
            if (band, l["name"], n["book"]) in PIECES:
                n["pieces"] = PIECES[(band, l["name"], n["book"])]
        ent = {"name": l["name"], "group": g, "syllabusUrl": l["url"]}
        if f and f.get("status") == 200:
            ent["syllabusSha256"] = f["sha256"]
            ent["syllabusFetchedAt"] = f["fetchedAt"]
        elif "Languages" in (g or "") or re.search(r"/sec/\d{3}-", l["url"]):
            ent["syllabusNotFetched"] = "regional/foreign language or skill subject — link recorded, PDF not read in this pass"
        if ncert:
            for n in ncert:
                n.pop("class", None)
            ent["ncertBooks"] = ncert
        out.append(ent)
    return out

doc = {
    "board": "CBSE",
    "session": "2026-27",
    "fetchedOn": "2026-09-25",
    "sources": {
        # 26 Sep 2026: no copies of CBSE's page or PDF text in the (public) repo — URL, sha256 and the pages read
        "curriculumPage": {"url": PAGE, "sha256": sha("curriculum_2027.html"), "fetchedOn": "2026-09-25"},
        "secondaryPart1": {"url": P1, "sha256": sha("Curriculum_SecP1_2026-27.pdf"), "pagesRead": [7, 8, 15, 16, 17, 21, 22]},
        "seniorSecondaryPart2": {"url": P2, "sha256": sha("Curriculum_SecP2_2026-27.pdf"), "pagesRead": [8, 9, 10, 11, 12]},
        "syllabusPdfs": "data/curriculum/sources/cbse/syllabus-pdfs-2026-09-25.tsv",
    },
    "linkMethods": {
        "title-in-prescribed-or-ncert-context": "the NCERT book title appears in the syllabus PDF's 'Prescribed Books' text or next to the word NCERT",
        "subject-textbook-for-class": "the prescribed-books text says '<subject> … Textbook for Class <n> … NCERT' and NCERT's index lists that book under the same subject and class",
        "ncert-url-in-syllabus": "the syllabus PDF prints the book's ncert.nic.in/textbook.php link",
        "manual-quote": "read by hand from the prescribed-books text (quoted)",
        "cbse-statement+ncert-index": "CBSE names the NCERT textbook by subject; NCERT's index lists exactly one book for that subject and class",
        "title-in-cbse-subject-name": "the CBSE subject name contains the NCERT book title",
        "inferred": "CBSE's wording does not name the book; the link is our reading — confirm before relying on it",
        "reference-only": "CBSE lists the NCERT book only 'as reference'; the prescribed textbook is CBSE's own",
    },
    "classMethods": {
        "ncert-index": "XI-XII link: taught in the class NCERT's index files the book under",
        "cbse-course-structure": "XI-XII link: CBSE's course structure puts the book in another class than NCERT's index (quoted in classEvidence)",
    },
    "bands": [
        {
            "classes": [1, 2, 3, 4, 5, 6, 7, 8],
            "schemeOfStudies": None,
            "note": "The 2026-27 curriculum page lists only Secondary (IX, X) and Senior Secondary (XI-XII) documents; there is no CBSE subject scheme for Classes I-VIII on it. Using the NCERT class index for CBSE Classes I-VIII is a working default of this spine, not a CBSE statement.",
            "facts": [
                {"fact": "R3 (third language) is compulsory from Class VI with effect from 2026-27 (Class VII from 2027-28, Class VIII from 2028-29).", "source": "Curriculum_SecP1_2026-27.pdf, 'Table 1 (Revised): Phased Implementation of R3'", "url": P1},
                {"fact": "Computational Thinking is integrated across subjects in Classes III-V and CT with foundational AI literacy is introduced in Classes VI-VIII from 2026-27, embedded in existing subject periods.", "source": "Curriculum_SecP1_2026-27.pdf, Scheme of Studies, instruction vii", "url": P1},
            ],
        },
        {
            "classes": [9],
            "schemeOfStudies": {
                "source": "Curriculum_SecP1_2026-27.pdf, 02 - Scheme of Studies, Table 2 ('New 2026-27', Subject in Class IX)",
                "readingNote": "Table 2 is a multi-column table whose text layer interleaves columns; the list below is the 'Subject in Class IX' column. Per-row assessment wording is quoted only where it is unambiguous.",
                "items": [
                    {"subject": "Language 1 at R1 level", "status": "compulsory"},
                    {"subject": "Language 2 at R2 level", "status": "compulsory"},
                    {"subject": "Mathematics", "status": "compulsory", "quote": "Mathematics and Science … will be compulsory and will be studied by all students"},
                    {"subject": "Mathematics Advanced", "status": "optional", "quote": "Mathematics Advanced and Science Advanced: will be optional"},
                    {"subject": "Science", "status": "compulsory", "quote": "Mathematics and Science … will be compulsory and will be studied by all students"},
                    {"subject": "Science Advanced", "status": "optional", "quote": "Mathematics Advanced and Science Advanced: will be optional"},
                    {"subject": "Social Science", "status": "compulsory", "quote": "the three compulsory subjects (i.e., Science, Mathematics and Social Science)"},
                    {"subject": "Language 3 at R3 Level", "status": "compulsory", "quote": "In the transitional phase (for students entering Class IX in 2026–27 …), R3 shall be a mandatory subject. Students in Class IX 2026-27 shall study the Class VI level R3 textbooks … Assessment of R3 shall be entirely school-based/internal"},
                    {"subject": "Individuals in Society", "status": "listed"},
                    {"subject": "Art Education", "status": "listed"},
                    {"subject": "Physical Education and Well-being", "status": "listed"},
                    {"subject": "Vocational Education", "status": "listed"},
                    {"subject": "Optional Subject", "status": "optional", "quote": "OPTIONAL SUBJECTS (as on March 2026)** … ** This is a tentative list"},
                    {"subject": "CT & AI (Class IX-X) as Modules", "status": "compulsory-modules", "quote": "CT & AI (Class IX-X) as Modules* (compulsory) … *CT & AI as a compulsory subject in session 2027-28"},
                ],
                "boardExamNote": "Class IX has no Board examination; Mathematics and Science carry a common 80-mark paper (school-based annual in Class IX of 2026-27 onwards).",
            },
            "subjects": subject_entries("IX"),
        },
        {
            "classes": [10],
            "schemeOfStudies": {
                "source": "Curriculum_SecP1_2026-27.pdf, Table 2 ('Subjects in Class X') and instruction v.5",
                "readingNote": "Class X students of 2026-27 stay on the existing scheme: 'students of Class-X in 2026–27 will only continue under the existing scheme and may opt for Mathematics Basic, as applicable for the academic year 2025-26.'",
                "items": [
                    {"subject": "Language 1", "status": "compulsory-board"},
                    {"subject": "Language 2", "status": "compulsory-board"},
                    {"subject": "Mathematics (Basic/Standard)", "status": "compulsory-board"},
                    {"subject": "Science", "status": "compulsory-board"},
                    {"subject": "Social Science", "status": "compulsory-board"},
                    {"subject": "Skill-based or another Subject", "status": "optional"},
                    {"subject": "Language 3", "status": "listed"},
                    {"subject": "Health and Physical Education (Work Experience subsumed in HPE)", "status": "school-based"},
                    {"subject": "Art Education", "status": "school-based"},
                ],
                "quote": "School-based Internal Assessment (IA) and compulsory Board Examination",
            },
            "subjects": subject_entries("X"),
        },
        {
            "classes": [11, 12],
            "schemeOfStudies": {
                "source": "Curriculum_SecP2_2026-27.pdf, 3. Scheme of Studies and List of Subjects",
                "items": [
                    {"subject": "Subject 1: Hindi Elective or Hindi Core or English Elective or English Core", "status": "compulsory"},
                    {"subject": "Subject 2: Any one Language from Group – L not opted as Subject 1", "status": "compulsory"},
                    {"subject": "Subjects 3-5: electives from Group – A (or Group – S for subject 6 onward)", "status": "elective"},
                    {"subject": "Health and Physical Education, Work Experience, General Studies", "status": "internal-assessment"},
                ],
                "quotes": [
                    "Hindi or English must be one of the two languages to be studied in class XI and XII.",
                    "Students can offer a minimum of 5 or more subjects in class XI. They need to continue the same subjects in class XII.",
                    "Mathematics (Code 041) and Applied Mathematics (Code 241)", "Out of three Computer Science/IT related subjects i.e., Informatics Practices (065), Computer Science (Code 083), Information Technology (Code 802), a candidate can opt only for one subject.",
                ],
                "subjectCodes": {
                    "L": {"001": "English Elective", "301": "English Core", "002": "Hindi Elective", "302": "Hindi Core", "003": "Urdu Elective", "303": "Urdu Core", "022": "Sanskrit Elective", "322": "Sanskrit Core"},
                    "A": {"027": "History", "028": "Political Science", "029": "Geography", "030": "Economics", "037": "Psychology", "039": "Sociology", "041": "Mathematics", "241": "Applied Mathematics", "042": "Physics", "043": "Chemistry", "044": "Biology", "045": "Biotechnology", "046": "Engineering Graphics", "048": "Physical Education", "054": "Business Studies", "055": "Accountancy", "064": "Home Science", "065": "Informatics Practices", "083": "Computer Science", "066": "Entrepreneurship", "073": "Knowledge Tradition and Practices of India", "074": "Legal Studies", "076": "National Cadet Corps (NCC)"},
                },
            },
            "subjects": subject_entries("XI-XII"),
        },
    ],
}
os.makedirs(REPO + "/cbse", exist_ok=True)
open(REPO + "/cbse/cbse-2026-27.json", "w", encoding="utf-8", newline="\n").write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
# sources: only the hash list goes into the repo (26 Sep 2026 — the page
# snapshot and PDF excerpts stay in this working directory)
rows = [f for f in json.load(open("cbse-fetch.json", encoding="utf-8"))]
with open(REPO + "/sources/cbse/syllabus-pdfs-2026-09-25.tsv", "w", encoding="utf-8", newline="\n") as f:
    f.write("# CBSE 2026-27 subject syllabus PDFs read for prescribed NCERT books (English/Hindi/Sanskrit/Urdu + all non-skill academic subjects)\n")
    f.write("band\tgroup\tname\turl\tstatus\tbytes\tsha256\tfetchedAt\n")
    for r in rows:
        f.write("\t".join(str(r.get(k, "")) for k in ("band", "group", "name", "url", "status", "bytes", "sha256", "fetchedAt")) + "\n")
n = sum(len(b.get("subjects", [])) for b in doc["bands"])
print("cbse subjects", n, "linked", sum(1 for b in doc["bands"] for s in b.get("subjects", []) if s.get("ncertBooks")))
