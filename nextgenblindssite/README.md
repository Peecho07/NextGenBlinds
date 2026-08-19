# NextGen Blinds — Website

Static site, no build step, no framework. Every page is plain HTML/CSS/JS
so it can be hosted anywhere that serves static files.

## Structure

```
index.html                              Homepage
404.html                                Not-found page
assets/style.css                        Shared styles (all pages)
assets/lead-form.js                     Contact form submit logic (all pages)
assets/logo.svg                         PLACEHOLDER logo — replace with the real one
services/motorized-shades/index.html
services/plantation-shutters/index.html
services/custom-drapery/index.html
services/roller-solar-shades/index.html
services/zebra-banded-shades/index.html
services/outdoor-motorized-screens/index.html
services/retractable-awnings/index.html
netlify.toml                            Netlify config (safe to ignore on other hosts)
```

## What you still need to do before this can go live

1. **Get a Web3Forms access key** (free) at https://web3forms.com — sign up
   with `admin@nextgenblinds.com`, copy the key it gives you, then replace
   every occurrence of `REPLACE_WITH_YOUR_WEB3FORMS_KEY` in the `.html`
   files (one per page) with that key. Without this, the "Request My Free
   Consultation" form will not deliver leads to you.

2. **Replace the placeholder logo.** `assets/logo.svg` is a text placeholder
   so the site doesn't show broken images. Drop in your real logo as
   `assets/logo.png` (or `.svg`) and update the `src="/assets/logo.svg"`
   references, or just overwrite `logo.svg` with your real logo file (same
   filename, same folder).

3. **Add real photos.** Every "Your install photo" / "Showcase photo" box
   is a placeholder `<div>` styled to look intentional, not a broken image.
   Replace those with actual jobsite photos once available.

4. **Deploy to Netlify** (recommended, free tier):
   - Push this repo to GitHub (already done if you're reading this from the repo).
   - Go to https://app.netlify.com → "Add new site" → "Import an existing project" → connect GitHub → pick this repo.
   - Build command: leave blank. Publish directory: `.` (repo root).
   - Deploy — Netlify gives you a temporary `*.netlify.app` URL immediately.

5. **Point nextgenblinds.com at Netlify.** In Netlify: Site settings →
   Domain management → Add custom domain → `nextgenblinds.com`. Netlify
   will show you the DNS records to add at your domain registrar
   (usually an A record + CNAME, or Netlify DNS if you delegate the whole
   domain). Once DNS propagates, Netlify auto-issues a free SSL certificate.

After that, every future push to this branch/repo auto-deploys — no
manual re-upload needed.
