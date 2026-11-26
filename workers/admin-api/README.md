# StudyOrbit247 API (Cloudflare Worker + D1 + R2)

This service is the security boundary for the static GitHub Pages admin interface. Never put the admin password in HTML, JavaScript, a committed config file, or any browser-visible variable.

## D1 database and migrations

    cd workers/admin-api
    npx wrangler d1 create studyorbit247

If the database already exists, do not create another one. Set its returned database ID in `wrangler.toml`, then apply the migrations:

    npx wrangler d1 migrations apply studyorbit247 --remote

## Create and connect the R2 bucket

The Worker has an R2 binding named `CONTENT_BUCKET` for the `studyorbit247` bucket.

    npx wrangler r2 bucket create studyorbit247

If Wrangler reports that the bucket already exists in your account, continue. Keep the bucket private; files are read through the Worker.

Upload a question-bank archive or media file with Wrangler:

    npx wrangler r2 object put studyorbit247/question-bank/gk/latest.zip --file ./latest.zip --content-type application/zip
    npx wrangler r2 object put studyorbit247/media/questions/diagram.png --file ./diagram.png --content-type image/png

The deployed API will serve these at `/api/content/question-bank/gk/latest.zip` and `/api/content/media/questions/diagram.png`. Only `question-bank/` and `media/` keys are publicly readable. Uploading with Wrangler avoids sending large archives through a Worker request.

## Configure secrets

The site origins are set in `wrangler.toml`. Set the three authentication secrets before using admin login or browser uploads. Enter these only in your own terminal prompts; never commit them or send them in chat. Use the administrator email for `ADMIN_EMAIL`, choose an initial `ADMIN_PASSWORD`, and generate a long random `SESSION_SECRET` (for example, `openssl rand -base64 32`).

    npx wrangler secret put ADMIN_EMAIL
    npx wrangler secret put ADMIN_PASSWORD
    npx wrangler secret put SESSION_SECRET
The configured origins are exact and contain no path: `https://studyorbit247.web.app` for both the student site and admin page.

## Apply the audit and taxonomy migration

After pulling the repository, apply pending migrations first, then run the deploy command below:

    npx wrangler d1 migrations apply studyorbit247 --remote

Migration 0003 adds R2 upload history, per-question change snapshots, controlled subject/chapter/topic codes, and per-topic ID counters. The admin R2 upload screen records actor email, file name, object key, timestamps, size, question count, content hash, validation findings, and added/updated/removed IDs. Only uploads made through the authenticated admin screen are recorded; direct dashboard or CLI uploads bypass this audit trail.

## Deploy

    npx wrangler deploy

If using a separate Worker URL, set window.STUDYORBIT_ADMIN_API before the module scripts load in the admin HTML to that Worker origin plus /api, and ensure the exact frontend origin is in ADMIN_ORIGIN. Prefer a same-origin custom-domain route instead.

## API routes

- POST /api/admin/login — validates secrets and issues an HttpOnly, Secure session cookie.
- GET /api/admin/me — checks the signed session.
- POST /api/admin/logout — clears the session cookie.\n- POST /api/admin/uploads/start, PUT /api/admin/uploads/:id/parts/:number, POST /api/admin/uploads/complete — authenticated multipart uploads into the R2 bucket.\n- POST /api/admin/uploads/abort — cancels an incomplete multipart upload.
- GET /api/admin/uploads/history — lists recent R2 upload records.
- GET /api/admin/questions/history — lists question changes; accepts an optional questionId query.
- GET|POST /api/admin/taxonomy — lists or creates controlled subject, chapter, and topic codes.
- POST /api/admin/questions/next-id — atomically reserves the next composite question code for a registered topic.
- GET|POST /api/admin/questions/drafts — read/save question drafts in D1.
- POST /api/admin/questions/publish — marks selected drafts published in D1.
- GET|HEAD /api/content/question-bank/* — serves question-bank files from R2.
- GET|HEAD /api/content/media/* — serves question media from R2.

## Current implementation boundary

The D1 migrations include admin questions plus student profiles, mock-test attempts/results, and bookmarks. The student tables are a storage schema foundation; secure student authentication and the user-facing save/read API must be connected before those records are used. R2 file delivery is separate from D1 question publishing; uploading a question-bank file does not automatically publish D1 question records. AI translation, OCR, Word/PDF parsing, The admin website can upload files up to 500 MiB to `question-bank/` or `media/` using 8 MiB parts; R2 credentials remain bound to the Worker. The question builder still stores drafts and demo-published items in the browser. Uploading a file to R2 does not import it into the builder or publish it automatically. Audit logs, rate limiting and multi-admin roles are future integrations.
