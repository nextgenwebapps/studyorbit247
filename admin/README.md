# StudyOrbit247 Admin UI

The admin login and dashboard are React pages. Run `npm run dev` from the repository root and open `/admin/`.

- `index.html` and `../react-app/src/pages/admin/AdminLogin.jsx` mount the local demo login.
- `app.html` and `../react-app/src/pages/admin/Dashboard.jsx` mount the question workspace.
- `../react-app/src/pages/admin/QuestionBuilder.jsx` handles authoring, import and device preview.
- `../react-app/src/pages/admin/assets/js/` holds the demo storage API, auth, question model and import parser.
- `../react-app/src/pages/admin/assets/css/admin.css` styles both admin pages.

## Current UI capabilities
Single-question entry, multi-question session, passage/chart/caselet linked question group, CSV/JSON import, bilingual fields, common exam metadata, option/answer selection, basic validation, local draft storage, and mobile/desktop preview.

## Important deployment note
The GitHub Pages frontend is static. Real authentication, durable drafts, server-side validation and publishing require the Cloudflare Worker + D1 service in `../workers/admin-api`. Follow that folder's README before using this for real administration. Drafts in the current UI are local to the browser until the API is deployed. CSV and JSON are implemented; Word/PDF import and AI translation are not enabled yet.
