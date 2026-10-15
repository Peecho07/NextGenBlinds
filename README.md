# NextGen Blinds Website (Phase 1)

Static multi-page site with a real server-side lead endpoint. Built from the 2027 Rebuild Strategy audit and the Master Rebuild Prompt.

## What's in Phase 1

| Route | Status |
|---|---|
| `/` | Built. Full homepage per the master prompt sequence. |
| `/contact-us/` | Built. Short progressive form (name, ZIP, contact method + matching field; everything else optional). |
| `/thank-you/` | Built. Shows only after a server-accepted lead; neutral state on direct visits. Noindex. |
| `/privacy-policy/` | Built as a draft. Needs review before launch. |
| `404.html` | Built. Returns a real 404. |

All 41 routes from the master prompt are tracked in `src/routes.json` with status `built`, `planned`, or `gated`. Navigation and footer only link built pages, so nothing points at an unfinished route. Until a product page exists, product cards link to the consultation form with that product preselected.

## Run it locally

```
node tools/make-art.js        # regenerate draft illustrations (only if edited)
node build.js --preview       # build to dist/ with draft banner, everything noindex
node dev-server.mjs           # http://localhost:8787, leads saved to .local-leads.jsonl
FAIL=storage node dev-server.mjs   # simulate an outage to see the error state
```

`node build.js` (no flag) makes the production build: indexable pages, real robots.txt and sitemap.

## Adding the next page

1. Create `src/pages/<path>/index.html` with the JSON front matter (copy `contact-us` as a model).
2. Set that route's status to `built` in `src/routes.json`.
3. Rebuild. Nav, footer, sitemap, and product-card links update automatically.

## Deploy to Cloudflare Pages

1. Push this folder to a GitHub repo. In Cloudflare Pages, create a project from it.
2. Build command: `node build.js`. Output directory: `dist`.
3. Settings > Functions > KV bindings: create a namespace and bind it as `LEADS`.
4. Settings > Environment variables:
   - `RESEND_API_KEY` (secret) from resend.com, with the nextgenblinds.com domain verified
   - `NOTIFY_FROM` e.g. `NextGen Website <leads@nextgenblinds.com>`
   - `NOTIFY_TO` the inbox that receives leads (comma-separate for several)
   - `ALLOWED_ORIGIN` `https://www.nextgenblinds.com`
   - `IP_SALT` any random string
5. Deploy the retry worker in `workers/notify-retry.js` with a Cron Trigger (`*/10 * * * *`), bound to the same `LEADS` namespace and env vars. Optional `ALERT_WEBHOOK` for a Slack or Discord ping if a lead fails delivery 5 times.
6. Protect the preview URL with Cloudflare Access until launch.
7. Run one real test submission and confirm the email arrives before pointing DNS at it.

If `LEADS` is not bound, the form returns "temporarily unavailable" and shows the phone number. It never fakes a success.

## Lead flow

Browser validates → `POST /api/lead` with an Idempotency-Key → server validates, rate limits, drops honeypot spam → stores in KV with a reference ID (`NG-YYMMDD-XXXXXX`) → responds `201` → browser goes to `/thank-you/?ref=…` → email notification sent after the response; failures stay queued and the cron worker retries.

## Tested in this build

- Valid lead stored, duplicate key returns the same ID, double click creates one lead
- Server validation (422) with field messages, honeypot, GET returns 405, unknown path returns 404
- Outage: form stays, values kept, phone shown, button becomes "Try Again"
- Thank-you direct visit shows the neutral state; conversion event fires once per lead
- No horizontal overflow at 360, 390, 768, 1024, 1440px; mobile menu and Escape behavior
- Not yet tested: live Cloudflare deploy, real email delivery, screen reader pass

## Files

- `owner-register.md` every claim and asset still needing owner approval
- `src/routes.json` route manifest for the full site
- `functions/` production lead endpoint; `workers/` notification retry
