# GK → Biology Question Bank

This README explains where the Biology bank will live, how its hierarchy and IDs work, and what the JSON fields mean. The exact chapter and topic names will be filled in from `Biology.pdf` after the PDF can be read.

## Where each part lives

```text
StudyOrbit247
├── GK / GS collection
│   └── Biology subject (BIO)
│       └── Chapters from Biology.pdf
│           └── Topics from each chapter
├── D1
│   ├── Biology subject, chapter and topic codes
│   ├── Per-topic question ID counters
│   └── R2 upload and question-change history
└── R2
    └── question-bank/gk/biology/latest.json
```

- **GK / GS** is the broad collection and R2 path. In D1, the taxonomy starts at the actual subject, **Biology (BIO)**, then follows **chapter → topic**. This matches the current three-level taxonomy.
- **D1** stores the controlled names/codes and reserves permanent question numbers. It does not store the full public question-bank file.
- **R2** stores the JSON snapshot containing the questions.
- This README documents the bank in GitHub. It is not a question file and should not be uploaded as a question JSON.

## Question ID

Pattern:

```text
BIO-<CHAPTER>-<TOPIC>-<LEVEL>-<SERIAL>
```

Example only:

```text
BIO-CELL-MEMBRANE-M-000001
```

- `BIO`: Biology subject code.
- `CHAPTER`: stable code for a chapter from the PDF.
- `TOPIC`: stable code for a topic under that chapter.
- `LEVEL`: `E` easy, `M` medium, or `H` hard.
- `SERIAL`: reserved number from `000001` to `999999` for that topic. The sequence does not reset when the level changes.
- `recordId`: a separate permanent UUID used for internal tracking. Keep it unchanged when correcting the readable ID, chapter, or topic.

The example is illustrative; it is not a claim that “Cell Membrane” appears in the supplied PDF. Codes will be created from the PDF’s actual contents page and topic headings.

## R2 JSON fields

The file uses the existing StudyOrbit question-bank format:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Version of the JSON structure. |
| `bankId` | Stable name for this collection: `studyorbit-gk-biology`. |
| `bankVersion` | Increases when a new bank snapshot is prepared. |
| `generatedAt` | UTC time when the JSON snapshot was generated. |
| `subjectCode` | Registered subject code, `BIO`. |
| `questions` | List of question records. |
| `recordId` | Immutable UUID for tracking the same question over time. |
| `id` | Readable permanent question code shown above. |
| `chapterCode`, `topicCode` | Registered D1 codes; do not free-type alternate names. |
| `type`, `questionType` | Renderer-compatible and explicit question-type labels. |
| `prompt`, `options`, `correct`, `explanation` | Question, choices, correct answer and explanation used by the current renderer. |
| `optionIds`, `correctOptionIds` | Stable option references aligned with `options`. |
| `level` | `E`, `M` or `H`. |
| `examHistory` | Verified past exam appearances only, with year/paper/source details. Leave empty when unverified. |
| `relevantExams` | Exams where the question may be useful. This does not claim it appeared in those exams. |
| `source` | Document name, PDF page/section, rights note and verification status. |
| `translations` | Hindi/English question, choices or explanation when available. |
| `media` | R2 object key and alt text for an image/diagram, if any. |
| `revision`, `status`, timestamps and actor fields | Question lifecycle and editing history. |

## Question record template

This is a template, not a finished question. Replace every placeholder with verified content before upload.

```json
{
  "schemaVersion": 1,
  "bankId": "studyorbit-gk-biology",
  "bankVersion": 1,
  "generatedAt": "<UTC timestamp>",
  "subjectCode": "BIO",
  "questions": [
    {
      "recordId": "<permanent UUID>",
      "id": "BIO-<CHAPTER>-<TOPIC>-E-000001",
      "subjectCode": "BIO",
      "chapterCode": "<registered chapter code>",
      "topicCode": "<registered topic code>",
      "level": "E",
      "type": "mcq",
      "questionType": "single_mcq",
      "prompt": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct": "<exact correct option text>",
      "optionIds": ["A", "B", "C", "D"],
      "correctOptionIds": ["A"],
      "explanation": "<answer explanation>",
      "examHistory": [],
      "relevantExams": [],
      "source": {
        "document": "Biology.pdf",
        "page": "<PDF page>",
        "section": "<chapter or topic heading>",
        "verificationStatus": "needs_review"
      },
      "translations": {},
      "media": [],
      "revision": 1,
      "status": "draft"
    }
  ]
}
```

## Upload and live display

1. Extract and review all chapter/topic names from the PDF.
2. Register **Biology**, then its chapters and topics under **Admin → Taxonomy & IDs**. Use short stable codes; keep names readable.
3. Prepare the JSON with question IDs reserved by the D1 allocator and cite the PDF page for each question.
4. Upload the JSON through **Admin → R2 storage** to `question-bank/gk/biology/latest.json`.
5. Connect this new object to the student Practice catalog/API before expecting it to appear on the live Practice page. Uploading an R2 file alone stores it; it does not automatically import or publish it.

## Source and review rules

- Do not invent chapter/topic headings or PDF page numbers.
- Do not label an exam appearance as verified without a reliable source.
- Keep the original `recordId` and never reuse a retired question number.
- Review the question, correct answer and explanation before changing `status` from `draft`.
