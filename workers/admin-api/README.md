# StudyOrbit247 API (Cloudflare Worker + D1 + R2)

This service is the security boundary for the static GitHub Pages admin interface. Never put the admin password in HTML, JavaScript, a committed config file, or any browser-visible variable.

## D1 database and migrations

    cd workers/admin-api
    npx wrangler d1 create studyorbit247-admin

If the database already exists, do not create another one. Set its returned database ID in `wrangler.toml`, then apply the migrations:

    npx wrangler d1 migrations apply studyorbit247-admin --remote

## Create and connect the R2 bucket

The Worker has an R2 binding named `CONTENT_BUCKET` for the `studyorbit247` bucket.

    npx wrangler r2 bucket create studyorbit247

If Wrangler reports that the bucket already exists in your account, continue. Keep the bucket private; files are read through the Worker.

Upload a question-bank archive or media file with Wrangler:

    npx wrangler r2 object put studyorbit247/question-bank/gk/latest.zip --file ./latest.zip --content-type application/zip
    npx wrangler r2 object put studyorbit247/media/questions/diagram.png --file ./diagram.png --content-type image/png

The deployed API will serve these at `/api/content/question-bank/gk/latest.zip` and `/api/content/media/questions/diagram.png`. Only `question-bank/` and `media/` keys are publicly readable. Uploading with Wrangler avoids sending large archives through a Worker request.

## Configure secrets

Run each command and enter the value when Wrangler prompts. Use the administrator email supplied by the site owner for ADMIN_EMAIL; enter the chosen initial password for ADMIN_PASSWORD. Generate a long random session secret (for example, openssl rand -base64 32) for SESSION_SECRET.

    npx wrangler secret put ADMIN_EMAIL
    npx wrangler secret put ADMIN_PASSWORD
    npx wrangler secret put SESSION_SECRET
    npx wrangler secret put ADMIN_ORIGIN
    npx wrangler secret put PUBLIC_ORIGIN

For `ADMIN_ORIGIN`, enter the exact origin serving the admin page. Set `PUBLIC_ORIGIN` to the exact student site origin, such as `https://studyorbit247.web.app` (origin only; no path). For best cookie reliability, serve the Worker on the same custom domain under `/api/*` and configure the route in wrangler.toml. Cross-site cookie restrictions can affect a Worker on a separate workers.dev host.

## Deploy

    npx wrangler deploy

If using a separate Worker URL, set window.STUDYORBIT_ADMIN_API before the module scripts load in the admin HTML to that Worker origin plus /api, and ensure the exact frontend origin is in ADMIN_ORIGIN. Prefer a same-origin custom-domain route instead.

## API routes

- POST /api/admin/login — validates secrets and issues an HttpOnly, Secure session cookie.
- GET /api/admin/me — checks the signed session.
- POST /api/admin/logout — clears the session cookie.
- GET|POST /api/admin/questions/drafts — read/save question drafts in D1.
- POST /api/admin/questions/publish — marks selected drafts published in D1.
- GET|HEAD /api/content/question-bank/* — serves question-bank files from R2.
- GET|HEAD /api/content/media/* — serves question media from R2.

## Current implementation boundary

The D1 migrations include admin questions plus student profiles, mock-test attempts/results, and bookmarks. The student tables are a storage schema foundation; secure student authentication and the user-facing save/read API must be connected before those records are used. R2 file delivery is separate from D1 question publishing; uploading a question-bank file does not automatically publish D1 question records. AI translation, OCR, Word/PDF parsing, browser-based uploads, audit logs, rate limiting and multi-admin roles are future integrations.
