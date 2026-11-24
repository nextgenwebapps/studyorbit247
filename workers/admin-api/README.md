# StudyOrbit247 Admin API (Cloudflare Worker + D1)

This service is the security boundary for the static GitHub Pages admin interface. Never put the admin password in HTML, JavaScript, a committed config file, or any browser-visible variable.

## Create the D1 database

    cd workers/admin-api
    npx wrangler d1 create studyorbit247-admin

Copy the returned database ID into wrangler.toml in place of REPLACE_WITH_YOUR_D1_DATABASE_ID, then run:

    npx wrangler d1 migrations apply studyorbit247-admin --remote

## Configure secrets

Run each command and enter the value when Wrangler prompts. Use the administrator email supplied by the site owner for ADMIN_EMAIL; enter the chosen initial password for ADMIN_PASSWORD. Generate a long random session secret (for example, openssl rand -base64 32) for SESSION_SECRET.

    npx wrangler secret put ADMIN_EMAIL
    npx wrangler secret put ADMIN_PASSWORD
    npx wrangler secret put SESSION_SECRET
    npx wrangler secret put ADMIN_ORIGIN

For ADMIN_ORIGIN, enter the exact origin serving the admin page, e.g. https://YOUR-GITHUB-PAGES-HOST (origin only; no path). For best cookie reliability, serve the Worker on the same custom domain under /api/* and configure the route in wrangler.toml. Cross-site cookie restrictions can affect a Worker on a separate workers.dev host.

## Deploy

    npx wrangler deploy

If using a separate Worker URL, set window.STUDYORBIT_ADMIN_API before the module scripts load in the admin HTML to that Worker origin plus /api, and ensure the exact frontend origin is in ADMIN_ORIGIN. Prefer a same-origin custom-domain route instead.

## API routes

- POST /api/admin/login — validates secrets and issues an HttpOnly, Secure session cookie.
- GET /api/admin/me — checks the signed session.
- POST /api/admin/logout — clears the session cookie.
- GET|POST /api/admin/questions/drafts — read/save question drafts in D1.
- POST /api/admin/questions/publish — marks selected drafts published in D1.

## Current implementation boundary

The UI supports bilingual authoring, common question types, local draft persistence, CSV/JSON import and device preview. The Worker provides authentication and D1 draft/publish endpoints. The current public student question-bank reader is not yet connected to these published records; therefore this is not yet a complete learner-facing publishing pipeline. Add a read-only student API and connect it to mocktest/question pages before claiming published questions are live. AI translation, OCR, Word/PDF parsing, media uploads to R2, audit logs, rate limiting and multi-admin roles are future integrations.
