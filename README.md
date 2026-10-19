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

## Product landing pages (added Oct 2026)

Eight product pages, each a standalone landing page: photo hero with CTA, where it works well, good to know, how it works, FAQ (with FAQ schema), the consultation form with that product preselected, and related products.

| Route | Photo |
|---|---|
| `/services/blinds/` | Portfolio photo `faux-wood/faux-wood-02.webp` |
| `/services/motorized-shades/` | Pexels 6444253 |
| `/services/plantation-shutters/` | Pexels 2682318 |
| `/services/custom-drapery/` | Pexels 7546217 |
| `/services/roller-solar-shades/` | Pexels 6980665 |
| `/services/zebra-banded-shades/` | Pexels 9270061 |
| `/services/outdoor-motorized-screens/` | Pexels 5563471 |
| `/services/retractable-awnings/` | Illustration (no photo yet) |

- Content: `src/products.json`. Layout: `src/partials/product.html`. Edit the JSON and rebuild; no HTML needed.
- Homepage photos come from the reference build (nextgen-blinds.vercel.app): hero 36710315, how it works 5691534, motorization 6444253, layering 8135529, closing band 27195984, plus every product card.
- Photos load from the Pexels CDN (free commercial license). To self-host, run `bash tools/fetch-images.sh` on any machine with internet, then rebuild. To swap in a real install photo, edit `photos` in `src/site.json`.
- Confirmed business facts (address, hours, response time) live in `src/site.json` and feed the footer, contact page, and schema.
- Menu collapses to the Menu button below 1120px so the longer nav never wraps.

**Lead form on GitHub Pages:** Pages only serves static files, so `/api/lead` does not exist there and the form shows "temporarily unavailable" with the phone number. Real submissions need the Cloudflare Pages (or Netlify) deploy with the function and storage set up, as described above.

## Ad landing pages (`/lp/`)

One per product, for paid ads only: `/lp/blinds/`, `/lp/motorized-shades/`, `/lp/plantation-shutters/`, `/lp/custom-drapery/`, `/lp/roller-solar-shades/`, `/lp/zebra-banded-shades/`, `/lp/outdoor-motorized-screens/`, `/lp/retractable-awnings/`.

- No site menu, just logo and a call button, and the form next to the headline (it's the first thing after the bullets on phones). Fewer exits means more requests.
- Noindex and left out of the sitemap, so they never compete with the SEO product pages.
- Copy lives under `lp` in `src/products.json`.
- **City in the headline:** add `?area=avenir` (or any key in `adAreas` in `src/site.json`) to show "Motorized Shades in Avenir". Use it in ZIP-targeted ads so the page matches the ad.
- **Tracking:** UTM tags and Google's `gclid` are saved with every lead, along with the landing page. Use them on every ad link, e.g. `/lp/motorized-shades/?area=avenir&utm_source=facebook&utm_medium=paid&utm_campaign=avenir-33412`.
- **Conversion tags:** paste `googleTagId`, `googleAdsConversion` (format `AW-XXXXXXX/label`) and `metaPixelId` into `ads` in `src/site.json` and rebuild. The tags then load on every page, and one conversion fires per accepted lead on `/thank-you/`. Update the privacy policy before turning them on.

## Lead form on Netlify (current setup)

`formProvider` in `src/site.json` is `"netlify"`, so the consultation form uses **Netlify Forms**:

- At deploy, Netlify reads the `consultation` form in the HTML and stores every submission (free, unlimited since April 2026).
- The browser posts the form to `/` and, on success, goes to `/thank-you/` with a reference number like `NG-261018-82D180`. The same reference is in the submission, so you can match a phone call to a lead.
- Each submission includes `page` (the landing page) and `attribution` (ad source, campaign, gclid) in plain words.
- Spam: the `company` honeypot field plus Netlify's built-in spam filter.

**One-time setup in Netlify:** Site configuration > Forms > enable form detection, then redeploy. Then Forms > Form notifications > Add notification > Email notification > your lead inbox, form `consultation`.

To go back to the Cloudflare function instead, set `formProvider` to `"api"` and follow the Cloudflare steps above. GitHub Pages can't accept either kind of submission; it's preview only.
