# StudyOrbit247 Question Bank Format

The public practice bank is an R2 JSON snapshot. D1 holds upload records, taxonomy codes, question change history, and student attempt data.

## Bank object

Each JSON bank should include:

- `schemaVersion`: format version, such as `1`.
- `bankId`: stable key for this collection, such as `studyorbit-gk`.
- `bankVersion`: monotonically increasing content version.
- `generatedAt`: UTC ISO 8601 timestamp.
- `subjectCode`: a registered subject code, such as `GK`.
- `questions`: array of question records.

## Question record

Keep the existing practice fields (`id`, `type`, `prompt`, `options`, `correct`, and `explanation`) so current question rendering remains compatible. Add the management fields:

- `recordId`: immutable UUID created by the ID allocator. Database relations and audit history use this stable key.
- `id`: readable question code: `SUBJECT-CHAPTER-TOPIC-LEVEL-NUMBER`, e.g. `GK-POL-FR-M-000001`. The per-topic serial increments from `000001` to `999999`; it never gets reused.
- `subjectCode`, `chapterCode`, `topicCode`: codes from the controlled taxonomy, not free-typed names.
- `level`: `E`, `M`, or `H` for Easy, Medium, or Hard.
- `optionIds` and `correctOptionIds`: stable option references. Keep them aligned with `options` until the renderer moves to option objects.
- `questionType`: explicit type for validation, alongside the existing `type`.
- `examHistory`: only verified appearances, each with exam, year, paper, and a source reference.
- `relevantExams`: curated exam relevance; this does not claim the question appeared there.
- `source`: document/title, page or section, URL when available, rights/license note, and verification status.
- `translations`: translated question, options, and explanation when both languages are available.
- `media`: R2 object key and alt text for each image or diagram.
- `revision`, `status`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`: per-record lifecycle metadata when the authoring workflow supplies it.

Upload actor, file name, object key, UTC upload times, size, hash, bank/schema versions, validation findings, question count, and added/updated/removed question diffs are recorded in D1. Question attempt statistics stay in the student activity tables and are not written back into the question JSON on every attempt.

## ID behavior

- The database allocator reserves the next sequence number atomically per topic.
- The readable code is unique within the registered subject/chapter/topic/level code space.
- The hidden `recordId` is immutable. If taxonomy or difficulty is corrected later, history keeps the original readable code and the record remains linked by `recordId`.
- Archived question codes and sequence numbers are never reused.

## Upload checks

For JSON files up to 10 MiB, the Worker checks for a top-level `questions` array, unique non-empty question IDs, prompts, MCQ options, and a valid correct answer. It flags exact duplicate prompts. It records the count and per-question create/update/remove history. The source and exam claims still need human verification.
