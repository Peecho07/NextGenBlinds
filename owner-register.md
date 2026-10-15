# NextGen Blinds: Owner Approvals Register

Everything here is either drafted from provisional inputs or blocked on something only the owner can supply. Nothing marked OWNER_CONFIRM should go live until it's checked off.

## Launch blockers (P0)

| Item | Status | What's needed |
|---|---|---|
| Lead delivery live | Code done, not configured | Cloudflare KV namespace `LEADS`, Resend account + verified sending domain, `NOTIFY_TO` inbox. Then one controlled end-to-end test. |
| Privacy policy | Draft | Owner + counsel review. Fill in providers, retention period, last-updated date. |
| Logo | ASSET_REQUIRED | Approved logo file as SVG (or 2x PNG). Confirm spelling "NextGen Blinds" vs "Next Gen Blinds". |
| Photography | ASSET_REQUIRED | Every `.media` slot uses an original illustration as a stand-in. Replace with rights-cleared NextGen install photos before public launch. |

## Business facts to confirm

| Claim on the site | Where | Confirm |
|---|---|---|
| Free in-home consultation | Home, Contact, form | Is it free? Any geographic limits? No obligation? |
| Samples brought to the home | Home hero, Contact | True for every visit? |
| Measurement + written proposal | How it works, Contact | Who measures? Is the proposal written? |
| Professional installation | Fact strip, How it works | Own installers or subcontracted? (Do not publish "our own team" until confirmed.) |
| Walkthrough after install | How it works | Standard practice? |
| Service area: all of Palm Beach County + 8 listed cities | Home, header, footer | Any ZIPs or areas excluded? Travel limits? |
| Cordless and motorized options | FAQ | Confirm offered on the products sold. |
| Motorization: remote, wall switch, app, schedule, battery and wired | Motorization section | Which motor brands and hubs are actually supplied? Needed for the compatibility matrix. |
| "We confirm compatibility before you order" | Motorization section | Process commitment, confirm. |
| Product list (7 indoor families) | Cards, form, footer | Remove any not actually sold. |
| Phone 561-332-8091, admin@nextgenblinds.com | Everywhere | Confirm both monitored. |
| Business hours | Contact (not shown yet) | Supply hours to publish. |
| Response window | Not stated anywhere | Supply only if the team can reliably meet it. |
| Legal entity LKPM Group LLC | Hidden (`legalNameApproved: false` in `src/site.json`) | Confirm before showing in footer. |

## Content intentionally left out until evidence exists

- Featured project section (needs a real, permissioned job)
- Reviews and star ratings (need source-linked, dated, permitted reviews)
- Team names and photos
- Warranty terms
- Outdoor products: screens, exterior solar shades, awnings (gated until confirmed sold and installed)
- Pricing ranges (need owner-approved, dated examples)

## Technical decisions to confirm

- Hosting: built for Cloudflare Pages (free tier, includes serverless function for the form). Change only if you prefer another host.
- Canonical host: set to `https://www.nextgenblinds.com`. Confirm www vs non-www matches the current site.
- Legacy URLs: before switching DNS, crawl the live site and export its URLs. Only then fill `_redirects`. The four prototype aliases in `routes.json` are candidates, not confirmed live URLs.
- Fonts: loaded from Google Fonts. Can be self-hosted if you'd rather avoid the third-party request.
