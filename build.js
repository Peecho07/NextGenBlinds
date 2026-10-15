#!/usr/bin/env node
// Static build: assembles src/pages/**.html fragments into full pages with the shared shell.
// Usage: node build.js            -> production build into dist/
//        node build.js --preview  -> same, plus a visible "draft preview" banner and noindex everywhere
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const PREVIEW = process.argv.includes('--preview');
const site = JSON.parse(fs.readFileSync(path.join(SRC, 'site.json'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(SRC, 'routes.json'), 'utf8'));
const byPath = Object.fromEntries(routes.routes.map(r => [r.path, r]));
const isBuilt = p => byPath[p] && byPath[p].status === 'built';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const read = f => fs.readFileSync(f, 'utf8');
const partial = n => read(path.join(SRC, 'partials', n + '.html'));
const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function navHtml(current) {
  const items = [];
  routes.nav.forEach((item, i) => {
    const kids = (item.children || []).filter(isBuilt);
    const parentLive = isBuilt(item.path);
    if (!parentLive && !kids.length) return;
    const cur = current === item.path ? ' aria-current="page"' : '';
    const label = parentLive
      ? `<a class="top" href="${item.path}"${cur}>${esc(item.label)}</a>`
      : `<span class="top">${esc(item.label)}</span>`;
    if (!kids.length) { items.push(`<li>${label}</li>`); return; }
    const id = 'sub-' + i;
    const links = kids.map(k => `<li><a href="${k}"${current === k ? ' aria-current="page"' : ''}>${esc(byPath[k].title)}</a></li>`).join('');
    items.push(`<li class="nav-item">${label}<button class="sub-toggle" type="button" aria-expanded="false" aria-controls="${id}"><span class="sr-only">Show ${esc(item.label)} pages</span>${chevron}</button><ul class="submenu" id="${id}">${links}</ul></li>`);
  });
  items.push(`<li><a class="top" href="/contact-us/"${current === '/contact-us/' ? ' aria-current="page"' : ''}>Contact</a></li>`);
  return items.join('');
}

function mobileNavHtml() {
  const out = [];
  routes.nav.forEach(item => {
    const kids = (item.children || []).filter(isBuilt);
    const parentLive = isBuilt(item.path);
    if (!parentLive && !kids.length) return;
    if (!kids.length) { out.push(`<li><a href="${item.path}">${esc(item.label)}</a></li>`); return; }
    const all = (parentLive ? [`<li><a href="${item.path}">All ${esc(item.label)}</a></li>`] : [])
      .concat(kids.map(k => `<li><a href="${k}">${esc(byPath[k].title)}</a></li>`)).join('');
    out.push(`<li><details><summary>${esc(item.label)}</summary><ul>${all}</ul></details></li>`);
  });
  out.push('<li><a href="/contact-us/">Contact</a></li>');
  return out.join('');
}

function footerProducts() {
  const kids = routes.nav[0].children.concat(routes.nav[1].children).filter(isBuilt);
  if (kids.length) return kids.map(k => `<li><a href="${k}">${esc(byPath[k].title)}</a></li>`).join('');
  // Until product pages exist, route product interest into the consultation form with context.
  return site.products.filter(p => !p.gated && p.id !== 'not-sure').map(p => `<li><a href="/contact-us/?interest=${p.id}">${esc(p.name)}</a></li>`).join('');
}

function footerCompany() {
  const list = ['/about-us/', '/how-it-works/', '/portfolio-gallery/', '/service-areas/', '/window-treatment-faqs/', '/contact-us/'].filter(isBuilt);
  return list.map(p => `<li><a href="${p}">${esc(byPath[p].title)}</a></li>`).join('');
}

function footerLegal() {
  return ['/privacy-policy/', '/terms/', '/accessibility/'].filter(isBuilt)
    .map(p => `<a href="${p}">${esc(byPath[p].title)}</a>`).join(' · ');
}

function parsePage(file) {
  const raw = read(file);
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error('Missing front matter JSON in ' + file);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

function fill(tpl, vars) {
  return tpl
    // {{href:/services/blinds/|blinds}} links to the page once it is built, otherwise to the form with product context.
    .replace(/\{\{href:([^|}]+)\|([^}]+)\}\}/g, (_, p, interest) => isBuilt(p) ? p : `/contact-us/?interest=${interest}`)
    .replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));
}
const interestOptions = site.products.filter(p => !p.gated && p.id !== 'not-sure')
  .map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');

function ldjson(meta) {
  const blocks = [];
  if (meta.path === '/') {
    blocks.push({
      '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness',
      name: site.name, url: site.origin + '/', telephone: site.phoneE164, email: site.email,
      areaServed: { '@type': 'AdministrativeArea', name: site.serviceArea }
    });
  }
  if (meta.breadcrumbs) {
    blocks.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: meta.breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b[0], item: site.origin + b[1] }))
    });
  }
  return blocks.map(b => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n');
}

function crumbs(meta) {
  if (!meta.breadcrumbs) return '';
  const li = meta.breadcrumbs.map((b, i, a) => i === a.length - 1
    ? `<li><span aria-current="page">${esc(b[0])}</span></li>`
    : `<li><a href="${b[1]}">${esc(b[0])}</a></li>`).join('');
  return `<nav class="crumbs wrap" aria-label="Breadcrumb"><ol>${li}</ol></nav>`;
}

function outPath(p) {
  if (p.endsWith('.html')) return path.join(DIST, p);
  return path.join(DIST, p, 'index.html');
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
}

// Build
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
const layout = partial('layout');
const header = partial('header');
const footer = partial('footer');
const built = [];

for (const file of walk(path.join(SRC, 'pages'))) {
  const { meta, body } = parsePage(file);
  const r = byPath[meta.path];
  if (!r) throw new Error(`Page ${meta.path} is not in routes.json`);
  if (r.status !== 'built') { console.log('skip (not marked built):', meta.path); continue; }
  const index = r.index && !PREVIEW;
  const shared = {
    phone: site.phone, phoneE164: site.phoneE164, email: site.email, name: site.name,
    serviceArea: site.serviceArea, year: String(new Date().getFullYear()), legalName: site.legalNameApproved ? ' · ' + esc(site.legalName) : ''
  };
  const html = fill(layout, {
    title: esc(meta.title),
    description: esc(meta.description || ''),
    canonical: meta.path === '/404.html' ? '' : `<link rel="canonical" href="${site.origin}${meta.path}">`,
    robots: index ? 'index,follow' : 'noindex,follow',
    og: `<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(site.name)}"><meta property="og:title" content="${esc(meta.title)}"><meta property="og:description" content="${esc(meta.description || '')}"><meta property="og:url" content="${site.origin}${meta.path}">`,
    ldjson: ldjson(meta),
    draft: PREVIEW ? '<div class="draft-banner" role="note">Draft preview. Not for public release. Photos and some details are placeholders pending owner approval.</div>' : '',
    header: fill(header, { ...shared, nav: navHtml(meta.path), mobileNav: mobileNavHtml() }),
    crumbs: crumbs(meta),
    main: fill(fill(body, { ...shared, leadForm: partial('lead-form') }), { ...shared, interestOptions }),
    footer: fill(footer, { ...shared, footerProducts: footerProducts(), footerCompany: footerCompany(), footerLegal: footerLegal() }),
    bodyClass: meta.bodyClass || '',
    actionBar: meta.noActionBar ? '' : `<div class="action-bar" id="action-bar"><a class="btn btn-secondary" href="tel:${site.phoneE164}">Call</a><a class="btn btn-primary" href="/contact-us/">Free Consultation</a></div>`
  });
  const out = outPath(meta.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html.replace(/\n{3,}/g, '\n\n'));
  built.push({ path: meta.path, index });
}

// Sitemap: public, canonical, indexable only
const urls = built.filter(b => b.index && b.path !== '/404.html').map(b => `  <url><loc>${site.origin}${b.path}</loc></url>`).join('\n');
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), PREVIEW
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nDisallow: /thank-you/\nDisallow: /api/\n\nSitemap: ${site.origin}/sitemap.xml\n`);
// Cloudflare Pages headers. Staging should also sit behind Cloudflare Access.
fs.writeFileSync(path.join(DIST, '_headers'), [
  '/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin', '  X-Frame-Options: SAMEORIGIN',
  PREVIEW ? '  X-Robots-Tag: noindex' : '', '/assets/*', '  Cache-Control: public, max-age=604800', ''
].filter(Boolean).join('\n'));
// Redirects stay empty until the live URL inventory is crawled and verified.
fs.writeFileSync(path.join(DIST, '_redirects'), '# Add one-hop 301s here only after verifying the live URL exists. See routes.json legacyRedirectCandidates.\n');
console.log(`Built ${built.length} pages${PREVIEW ? ' (preview mode, all noindex)' : ''}:`, built.map(b => b.path).join(', '));
