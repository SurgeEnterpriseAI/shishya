# School curriculum spine (official sources only)

Built 25 Sep 2026 for the school expansion (NCERT/CBSE first, then CISCE, then state boards). Reviewed and corrected 26 Sep 2026.
Everything here comes from the official site named next to it. Nothing is typed from memory.
Where the official text could not be read reliably, the item is marked **unresolved** with the reason. It is never guessed.

| File | What it holds | Official source (fetched 25 Sep 2026) |
|---|---|---|
| `ncert/class-01.json` … `class-12.json`, `class-11-12-combined.json` | Every subject, book and chapter NCERT lists per class: chapter number, title, chapter PDF URL, the pieces printed inside a chapter PDF (`includes`), other-language editions of each book | https://ncert.nic.in/textbook.php + each book's contents page (`<code>ps.pdf`) |
| `ncert/titles.json` | Chapter titles (and `includes`) of the 126 transcribed books, from each contents page (the only hand step, re-checked by the test) | same |
| `cbse/cbse-2026-27.json` | CBSE scheme of studies per class band, every subject with its syllabus PDF, which NCERT books a CBSE subject prescribes (with the evidence and how it was matched), for XI-XII the class CBSE teaches each book in, and CBSE's prescribed piece lists for the English readers | https://cbseacademic.nic.in/curriculum_2027.html and the PDFs it links |
| `cisce/cisce-2026-27.json` | CISCE subjects per class (I-VIII curriculum, ICSE 2027/2028, ISC 2027/2028) with regulation and syllabus PDF URLs. No textbooks: CISCE prescribes syllabuses, not one book series | https://cisce.org (regulations and syllabus pages, RDCD curriculum page) |
| `sources/` | What the files above were read from, as evidence lines and hashes only (see "What is committed") | see each file header |
| `tools/` | `ncert_spine.py` (the NCERT builder: index → contents → PDF checks → evidence → class files); `cbse_2026_27.py`, `cisce_2026_27.py` (one-off assemblers, kept for provenance) | — |

## Counts (NCERT index of 25 Sep 2026)

- 194 books have their chapters listed (English-medium books, plus every book in the Hindi, Urdu and Sanskrit subjects, plus Hindi-only books). 861 other-language editions (Hindi, Urdu and 20 other Indian languages) are recorded against their book or subject.
- 1,146 chapters are **resolved**: the title is printed in NCERT's own contents text, ends where NCERT's entry ends, and the chapter PDF returned HTTP 200.
- 78 **pieces** are printed inside a resolved chapter's PDF (26 Sep 2026): First Flight's 10 poems and 5 numbered parts, Hornbill's 5 poems, Kaveri's 8, the 46 lessons of the three Poorvi books (whose chapter PDFs are units), Vistas' "Memories of Childhood" pair, and Woven Words' two interludes. Each was found in its chapter PDF (`sources/ncert/chapter-checks-2026-09-26.tsv`). They become child Topics.
- 893 chapters are **unresolved**; the 79 chapters in the "Class XI & XII Combined" set count in both Class 11 and Class 12, which gives the 972 in the seed summary. By reason:
  - Hindi, Urdu and Sanskrit books whose PDFs use legacy non-Unicode fonts, so the text layer is gibberish.
  - Devanagari PDFs whose text layer drops conjuncts (for example पुषप for पुष्प).
  - Urdu script that was not verified.
  - Scanned PDFs with no text layer.
  - 5 English chapters whose PDF returned 404: Words and Expressions 2 units 4 and 9, and Health and Physical Education (Class 10) chapters 6, 8 and 13.
  All of these need a human reading of the PDF. None of them gets a DB topic.
- 26 Sep 2026 review: 8 titles had been cut at the end of the first line of a wrapped contents entry, for example "Chanda Mama Counts" for "Chanda Mama Counts the Stars" and "Predicting What Comes Next: Exploring Sequences" for "… Sequences and Progressions" (Class 9 Maths). They are corrected, each confirmed as the heading of its own chapter PDF, and `trim-contents` plus the test now refuse a title whose entry visibly goes on.
- Maths and Science, Classes 6-10 (the first build slice): all 124 chapter PDFs were downloaded on 25 Sep. The chapter's title words are on pages 1-2 of 123 of them. The other is Ganita Prakash Part II chapter 2, whose first pages spell "Baudhāyana" with a diacritic, so the plain-text match missed it. That 25 Sep check (`titleOnFirstPages`) is a substring test; the 26 Sep check (`titleHeading`, chapters with pieces and the 8 corrected ones) requires the whole title as the heading.

## What is committed (the repo is public)

NCERT's prelims say "all rights reserved", CBSE allows reproduction only with permission, and CISCE's PDFs forbid it without written approval. So `sources/` holds evidence, not copies:
- `sources/ncert/textbook-php-<date>.html`: only the index script of textbook.php (the class → subject → book lists), with the whole page's sha256 in its header.
- `sources/ncert/contents/<code>.txt`: for every transcribed title, the contents line(s) that print it plus the next two lines, which is enough to prove the title is NCERT's and complete. The whole contents pages stay in the builder cache; the file header gives their sha256.
- `sources/ncert/chapter-title-lines/`: the first 3 lines of 7 chapter PDFs whose contents page is an image or mis-encoded.
- `*.tsv`: URLs, HTTP status, sha256 and fetch time of every PDF read.
- CBSE and CISCE: the PDF hash list and the PDF link lists. The subject lists and short quotes live in the JSON files. The CBSE page snapshot and the CBSE/CISCE regulation excerpts were removed on 26 Sep 2026.

## How it was built / how to rebuild

```
python data/curriculum/tools/ncert_spine.py fetch-index
python data/curriculum/tools/ncert_spine.py fetch-prelims    --cache <dir outside the repo>
python data/curriculum/tools/ncert_spine.py extract-contents --cache <same dir>
python data/curriculum/tools/ncert_spine.py check-pdfs       --cache <same dir>
python data/curriculum/tools/ncert_spine.py check-includes   --cache <same dir> [--also <stem>,…]
python data/curriculum/tools/ncert_spine.py trim-contents    --cache <same dir>
python data/curriculum/tools/ncert_spine.py build
npx vitest run tests/unit/school-spine.test.ts
```

Needs Python 3.11+, PyMuPDF and `pdftotext`. Raw PDFs and the whole contents text stay in the cache.
When NCERT changes a book, re-run the tool, then re-transcribe `ncert/titles.json` for that book from `<cache>/contents-full/<code>.txt`. `trim-contents` stops on a title that is not printed, on a title whose entry goes on (a lowercase or ":"/"–" continuation, or a title ending on "of"/"and"), and on any title followed by a line it cannot place until a person labels that line in `BOUNDARY_REVIEWED`. This catches, for example, a wrapped "White Horse" line, which looks like an author's name.
If NCERT reuses a book code for a different book (it did: `iemh1` was the old Class 9 Mathematics and is Ganita Manjari from 2026-27), give that book an `editionTag` (`ncertTopicCode()` in `src/lib/school/spine.ts`). Otherwise old content would re-attach to the new chapter.

## Into the DB (`scripts/seed-school-spine.ts`)

Dry run by default. Writing needs `--apply --chat-gate-checked`. It never deletes and never changes an existing row's `active`.
It creates one Exam per (curriculum, class) with category `SCHOOL_BOARD`: `NCERT_C01`…`NCERT_C12` and `CISCE_C01`…`CISCE_C12`. Every one is **inactive**.
It creates one Subject per subject, one Topic per resolved NCERT chapter (`<bookcode>.ch<NN>`, the chapter PDF's own number), and one child Topic per piece inside a chapter PDF (`<bookcode>.ch<NN>.p<KK>`).
It creates one `KnowledgeSource` link row per official PDF: tier STANDARD_TEXT for NCERT, OFFICIAL for CISCE. These rows have **no chunks**.
Before `--apply`: `/api/chat` looks an exam up by code alone and upserts an Enrollment, so it must first 404 inactive/SCHOOL_BOARD exams and skip their Enrollment. That is what `--chat-gate-checked` confirms.

## Rules this data must keep

- **Link, never copy.** NCERT's licence allows reading and downloading. It forbids adapting, translating or summarising the books (ePathshala licence; NCERT press release, 7 Apr 2024). Chapter titles and numbers are facts. Book text, exercises and figures are not, so they never go into this folder, the DB or a prompt.
- **Nothing is public yet.** School pages built on this spine stay `noindex`. They stay out of the sitemap, `llms.txt`/`llms-full.txt`, robots and `context.md`, and they are not linked from the home page, until checked content exists.
- **Honest labels.** A CBSE→NCERT link marked `inferred` is our reading, not CBSE's wording. `reference-only` means CBSE names the NCERT book only as a reference. For XI-XII, `classFrom: "ncert-index"` means we took NCERT's class for the book. Economics is the one subject where CBSE's course structure says otherwise, and it is quoted. The class 1-8 CBSE band has no CBSE scheme document. Using NCERT books there is a working default, not a CBSE statement.
