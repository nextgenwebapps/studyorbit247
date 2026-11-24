# StudyOrbit247 Mock Test Module

This directory contains the standalone mock-test attempt experience. It is intentionally separate from the main homepage.

## Open
- Development: run `npm run dev` from the repository root, then open `/mocktest/`.
- Production: deploy the root `npm run build` output (`dist-react/`). The bundled question bank is sourced from `../react-app/src/pages/mocktest/questions.json`.

## Current demo
- General Knowledge mixed-format test, 12 sample questions
- Timer, progress, question palette, visit/answer/review states
- Clear response, previous/next, submit confirmation
- Result report with score, accuracy, attempted/correct/wrong/skipped counts
- Question-wise answer review and retake

## Supported question schema types
The renderer is designed to support: `mcq`, `multi`, `truefalse`, `image`, `fill`, `numeric`, `match`, `ordering`, `assertion`, `passage`, `matrix`, `greText`, `greEquiv`, `greQuant`, `gateNat`, `gateMsq`, `di`, and `hotspot`. Some advanced exam formats can share the same renderer with exam-specific scoring and instructions.

Each question has an `id`, `type`, `prompt`, and `correct` answer. Depending on type, it may also contain `options`, `image`, `passage`, `left/right`, `items`, or `statements`.

## Important limitations of this first frontend demo
- The question bank is sample GK content, not a verified full exam question bank.
- Answers and results are calculated in the browser only; no account, database, server-side timer, leaderboard, or saved history is connected.
- Negative marking, sectional timers, adaptive tests, partial marks, and advanced interactive hotspot/drag-and-drop interactions need exam-specific scoring rules and further implementation.
- Image URLs need to be reachable by the browser. Use locally hosted assets or trusted image sources for production.
