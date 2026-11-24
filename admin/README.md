# StudyOrbit247 Admin UI

This is a modular, static admin interface designed for the existing GitHub Pages site.

## Structure
- `index.html`: login screen; credentials are sent to the Worker API, never checked in browser code.
- `app.html`: admin workspace shell and responsive dashboard.
- `assets/css/admin.css`: shared admin/login/dashboard styles.
- `assets/js/login.js`, `auth.js`, `api.js`: login/session/API responsibilities.
- `assets/js/builder.js`, `question-model.js`, `bulk-import.js`, `preview.js`: question authoring modules.

## Current UI capabilities
Single-question entry, multi-question session, passage/chart/caselet linked question group, CSV/JSON import, bilingual fields, common exam metadata, option/answer selection, basic validation, local draft storage, and mobile/desktop preview.

## Important deployment note
The GitHub Pages frontend is static. Real authentication, durable drafts, server-side validation and publishing require the Cloudflare Worker + D1 service in `../workers/admin-api`. Follow that folder's README before using this for real administration. Drafts in the current UI are local to the browser until the API is deployed. CSV and JSON are implemented; Word/PDF import and AI translation are not enabled yet.
