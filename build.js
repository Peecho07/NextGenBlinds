#!/usr/bin/env node
// Static build: assembles src/pages/**.html fragments and generated product pages into full pages.
// Usage: node build.js            -> production build into dist/
//        node build.js --preview  -> same, plus a visible "draft preview" banner and noindex everywhere
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const PREVIEW = process.argv.includes('--preview');
// --base=/NextGenBlinds serves the site from a subfolder (GitHub Pages project sites).
const BASE = ((process.argv.find(a => a.startsWith('--base=')) || '').slice(7) || process.env.BASE_PATH || '').replace(/\/+$/, '');
const site = JSON.parse(fs.readFileSync(path.join(SRC, 'site.json'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(SRC, 'routes.json'), 'utf8'));
const products = JSON.parse(fs.readFileSync(path.join(SRC, 'products.json'), 'utf8'));
const portfolio = JSON.parse(fs.readFileSync(path.join(SRC, 'portfolio.json'), 'utf8'));
const byPath = Object.fromEntries(routes.routes.map(r => [r.path, r]));
const productById = Object.fromEntries(products.map(p => [p.id, p]));
const isBuilt = p => byPath[p] && byPath[p].status === 'built';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const read = f => fs.readFileSync(f, 'utf8');
const partial = n => read(path.join(SRC, 'partials', n + '.html'));
const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// ---------- Photos ----------
// Self-hosted copy wins if tools/fetch-images.sh has downloaded it; otherwise load from the Pexels CDN.
const PHOTO_DIR = path.join(SRC, 'assets', 'img', 'photos');
const WIDTHS = [640, 1024, 1600];
function photo(key, { eager = false, sizes = '(max-width: 900px) 100vw, 50vw', decorative = false } = {}) {
  const p = site.photos[key];
  if (!p) throw new Error('Unknown photo key: ' + key);
  const alt = decorative ? '' : esc(p.alt);
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  if (p.art) return `<img src="/assets/img/art/${p.art}.svg" alt="${alt}" width="800" height="500" ${load} data-asset="ASSET_REQUIRED: real photo">`;
  if (p.local) return `<img src="${p.local}" alt="${alt}" width="${p.w}" height="${p.h}" ${load} decoding="async">`;
  const local = WIDTHS.every(w => fs.existsSync(path.join(PHOTO_DIR, `${key}-${w}.jpg`)));
  const url = w => local ? `/assets/img/photos/${key}-${w}.jpg`
    : `https://images.pexels.com/photos/${p.pexels}/pexels-photo-${p.pexels}.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=${w}`;
  return `<img src="${url(1024)}" srcset="${WIDTHS.map(w => `${url(w)} ${w}w`).join(', ')}" sizes="${sizes}" alt="${alt}" width="1600" height="1067" ${load} decoding="async">`;
}

// ---------- Navigation ----------
function navHtml(current) {
  const items = [];
  routes.nav.forEach((item, i) => {
    const kids = (item.children || []).filter(isBuilt);
    const parentLive = isBuilt(item.path);
    if (!parentLive && !kids.length) return;
    const cur = current === item.path ? ' aria-current="page"' : '';
    if (!kids.length) { items.push(`<li><a class="top" href="${item.path}"${cur}>${esc(item.label)}</a></li>`); return; }
    const id = 'sub-' + i;
    const inSection = kids.includes(current) ? ' is-current' : '';
    const links = kids.map(k => `<li><a href="${k}"${current === k ? ' aria-current="page"' : ''}>${esc(byPath[k].title)}</a></li>`).join('');
    // With a parent page: link + separate chevron button. Without one: a single button that opens the menu.
    const control = parentLive
      ? `<a class="top" href="${item.path}"${cur}>${esc(item.label)}</a><button class="sub-toggle" type="button" aria-expanded="false" aria-controls="${id}"><span class="sr-only">Show ${esc(item.label)} pages</span>${chevron}</button>`
      : `<button class="sub-toggle sub-toggle-label top${inSection}" type="button" aria-expanded="false" aria-controls="${id}">${esc(item.label)}${chevron}</button>`;
    items.push(`<li class="nav-item">${control}<ul class="submenu" id="${id}">${links}</ul></li>`);
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
  return products.filter(p => isBuilt(p.path)).map(p => `<li><a href="${p.path}">${esc(p.name)}</a></li>`).join('');
}
function footerCompany() {
  return ['/portfolio-gallery/', '/about-us/', '/how-it-works/', '/service-areas/', '/window-treatment-faqs/', '/contact-us/'].filter(isBuilt)
    .map(p => `<li><a href="${p}">${esc(byPath[p].title)}</a></li>`).join('');
}

// Social icons. A platform with no URL in site.json still shows its icon, as plain text instead of a link.
const socialIcons = {
  instagram: ['Instagram', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>'],
  facebook: ['Facebook', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.4V14h2.7v8z"/></svg>'],
  youtube: ['YouTube', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-4.8.5-4.8s0-3.2-.5-4.8zM9.7 15.1V8.9l5.8 3.1z"/></svg>']
};
function socialHtml() {
  const s = site.social || {};
  return '<ul class="social">' + Object.keys(socialIcons).map(k => {
    const [label, svg] = socialIcons[k];
    return s[k]
      ? `<li><a href="${esc(s[k])}" target="_blank" rel="noopener" aria-label="${site.name} on ${label}">${svg}</a></li>`
      : `<li><span title="${label} link coming soon" aria-label="${label} (link coming soon)" role="img">${svg}</span></li>`;
  }).join('') + '</ul>';
}

// Portfolio: filter chips + photo grid. Works without JS (all photos shown, each links to the full image).
const catBySlug = Object.fromEntries(portfolio.categories.map(c => [c.slug, c]));
const pfSlug = item => item.file.split('/')[0];
function pfTile(item, i) {
  const c = catBySlug[pfSlug(item)];
  return `<li class="pf-item" data-cat="${c.slug}"><a class="pf-link" href="/assets/img/portfolio/${item.file}" data-caption="${esc(c.name)}">` +
    `<img src="/assets/img/portfolio/${item.file}" alt="${esc(item.alt)}" width="${item.w}" height="${item.h}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async">` +
    `<span class="pf-tag">${esc(c.name)}</span></a></li>`;
}
function portfolioGallery() {
  const counts = {};
  portfolio.items.forEach(it => { counts[pfSlug(it)] = (counts[pfSlug(it)] || 0) + 1; });
  const chip = (slug, name, n, on) => `<button type="button" class="pf-chip" data-filter="${slug}" aria-pressed="${on}">${esc(name)} <span class="n">${n}</span></button>`;
  const chips = [chip('all', 'All', portfolio.items.length, true)]
    .concat(portfolio.categories.filter(c => counts[c.slug]).map(c => chip(c.slug, c.name, counts[c.slug], false))).join('');
  return `<div class="pf-filters" role="group" aria-label="Filter photos by category">${chips}</div>` +
    `<p class="sr-only" id="pf-status" aria-live="polite"></p>` +
    `<ul class="pf-grid">${portfolio.items.map(pfTile).join('')}</ul>` +
    `<dialog class="pf-lightbox" id="pf-lightbox" aria-label="Photo viewer"><figure><img alt=""><figcaption></figcaption></figure>` +
    `<button type="button" class="pf-prev" aria-label="Previous photo">&#8249;</button><button type="button" class="pf-next" aria-label="Next photo">&#8250;</button>` +
    `<button type="button" class="pf-close" aria-label="Close">&times;</button></dialog>`;
}
// Home page strip: one photo from each listed category, linking into the filtered gallery.
function portfolioPreview() {
  const picks = ['drapery/drapery-01.jpg', 'shutters/shutters-05.jpg', 'zebra/zebra-01.webp', 'faux-wood/faux-wood-02.webp'];
  const link = isBuilt('/portfolio-gallery/') ? '/portfolio-gallery/' : '/contact-us/';
  return `<ul class="pf-grid pf-preview">` + picks.map(f => {
    const item = portfolio.items.find(it => it.file === f); const c = catBySlug[pfSlug(item)];
    return `<li class="pf-item"><a class="pf-link" href="${link}?cat=${c.slug}"><img src="/assets/img/portfolio/${f}" alt="${esc(item.alt)}" width="${item.w}" height="${item.h}" loading="lazy" decoding="async"><span class="pf-tag">${esc(c.name)}</span></a></li>`;
  }).join('') + `</ul>`;
}

const assetVersion = p => require('crypto').createHash('sha1').update(fs.readFileSync(path.join(SRC, p))).digest('hex').slice(0, 8);
function footerLegal() {
  return ['/privacy-policy/', '/terms/', '/accessibility/'].filter(isBuilt)
    .map(p => `<a href="${p}">${esc(byPath[p].title)}</a>`).join(' · ');
}

// ---------- Components ----------
const productHref = p => isBuilt(p.path) ? p.path : `/contact-us/?interest=${p.id}`;

function productCard(p, { featured = false } = {}) {
  return `<a class="family${featured ? ' featured' : ''}" href="${productHref(p)}">
  <div class="media">${photo(p.photo, { decorative: true, sizes: featured ? '(max-width: 960px) 100vw, 66vw' : '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw' })}</div>
  <div class="body"><h3>${esc(p.name)}</h3><p>${esc(p.short)}</p><span class="link-arrow">Explore ${esc(p.name.toLowerCase())}</span></div>
</a>`;
}
function cards(group, featureFirst) {
  return products.filter(p => p.group === group).map((p, i) => productCard(p, { featured: featureFirst && i === 0 })).join('\n');
}

function interestOptions(selected) {
  return products.map(p => `<option value="${p.id}"${p.id === selected ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
}

function leadForm(selected) {
  return partial('lead-form')
    .replace('{{interestOptions}}', interestOptions(selected))
    .replace('{{detailsOpen}}', selected ? ' open' : '');
}

function faqHtml(list) {
  return list.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="ans"><p>${esc(a)}</p></div></details>`).join('\n');
}

// ---------- Templating ----------
function fill(tpl, vars) {
  return tpl
    .replace(/\{\{photo:([\w-]+)(\|eager)?\}\}/g, (_, k, e) => photo(k, { eager: !!e, decorative: false }))
    .replace(/\{\{cards:(\w+)(\|featured)?\}\}/g, (_, g, f) => cards(g, !!f))
    .replace(/\{\{product:([\w-]+)\}\}/g, (_, id) => productHref(productById[id]))
    .replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));
}

function parsePage(file) {
  const raw = read(file);
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error('Missing front matter JSON in ' + file);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

function ldjson(meta) {
  const blocks = [];
  if (meta.path === '/') {
    const a = site.address;
    blocks.push({ '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness', name: site.name, url: site.origin + '/',
      telephone: site.phoneE164, email: site.email, areaServed: { '@type': 'AdministrativeArea', name: site.serviceArea },
      address: { '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.city, addressRegion: a.region, postalCode: a.zip, addressCountry: 'US' },
      openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '18:00' }] });
  }
  if (meta.service) {
    blocks.push({ '@context': 'https://schema.org', '@type': 'Service', name: meta.service, serviceType: meta.service,
      provider: { '@type': 'HomeAndConstructionBusiness', name: site.name, url: site.origin + '/', telephone: site.phoneE164 },
      areaServed: { '@type': 'AdministrativeArea', name: site.serviceArea }, url: site.origin + meta.path });
  }
  if (meta.faq) {
    blocks.push({ '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: meta.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  }
  if (meta.breadcrumbs) {
    blocks.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: meta.breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b[0], item: site.origin + b[1] })) });
  }
  return blocks.map(b => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n');
}

function crumbs(meta) {
  if (!meta.breadcrumbs) return '';
  const li = meta.breadcrumbs.map((b, i, a) => i === a.length - 1
    ? `<li><span aria-current="page">${esc(b[0])}</span></li>`
    : `<li>${b[1] ? `<a href="${b[1]}">${esc(b[0])}</a>` : esc(b[0])}</li>`).join('');
  return `<nav class="crumbs wrap" aria-label="Breadcrumb"><ol>${li}</ol></nav>`;
}

// ---------- Product pages (generated) ----------
function productPage(p) {
  const related = products.filter(o => o.id !== p.id && (o.group === p.group || o.id === 'motorized-shades')).slice(0, 3);
  const body = fill(partial('product'), {
    groupLabel: p.group === 'outdoor' ? 'Outdoor living' : 'Indoor window treatments',
    h1: esc(p.h1), lead: esc(p.lead), name: esc(p.name), nameLower: esc(p.name.toLowerCase()),
    heroPhoto: photo(p.photo, { eager: true }),
    measurePhoto: photo('measuring'),
    goodFor: p.goodFor.map(g => `<li>${esc(g)}</li>`).join(''),
    know: p.know.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join(''),
    faq: faqHtml(p.faq),
    related: related.map(o => productCard(o)).join('\n'),
    leadForm: leadForm(p.id)
  });
  return {
    meta: { path: p.path, title: p.title, description: p.description, service: p.name, faq: p.faq,
      breadcrumbs: [['Home', '/'], [p.group === 'outdoor' ? 'Outdoor Living' : 'Indoor Treatments', ''], [p.name, p.path]] },
    body
  };
}

// ---------- Ad landing pages (generated, noindex, no site navigation) ----------
function lpPage(p) {
  const slug = p.path.split('/').filter(Boolean).pop();
  const body = fill(partial('lp'), {
    headline: esc(p.lp.headline), sub: esc(p.lp.sub), name: esc(p.name), nameLower: esc(p.name.toLowerCase()),
    defaultArea: 'Palm Beach County',
    areasJson: esc(JSON.stringify(site.adAreas || {})).replace(/&quot;/g, '"').replace(/'/g, '&#39;'),
    bullets: p.lp.bullets.map(b => `<li>${esc(b)}</li>`).join(''),
    goodForCards: p.goodFor.map(g => `<li>${esc(g)}</li>`).join(''),
    heroPhoto: photo(p.photo, { eager: true, sizes: '(max-width: 900px) 100vw, 55vw' }),
    faq: faqHtml(p.faq),
    leadForm: leadForm(p.id)
  });
  return {
    meta: { path: `/lp/${slug}/`, lp: true, noActionBar: false, bodyClass: 'lp',
      title: `${p.lp.headline} in Palm Beach County | Free Consultation | NextGen Blinds`,
      description: `${p.lp.sub} Free in-home consultation across Palm Beach County.` },
    body
  };
}

// Ad tracking tags load only when IDs are filled in src/site.json. ngConversion fires once per accepted lead on /thank-you/.
function trackingTags() {
  const a = site.ads || {};
  let out = '';
  if (a.googleTagId) {
    out += `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(a.googleTagId)}"></script>` +
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(a.googleTagId)}');</script>`;
  }
  if (a.metaPixelId) {
    out += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(a.metaPixelId)}');fbq('track','PageView');</script>`;
  }
  if (out) {
    out += `<script>window.ngConversion=function(id){try{${a.googleAdsConversion ? `if(window.gtag)gtag('event','conversion',{send_to:'${esc(a.googleAdsConversion)}',transaction_id:id});` : ''}if(window.fbq)fbq('track','Lead',{},{eventID:id});}catch(e){}};</script>`;
  }
  return out;
}

// ---------- Build ----------
function outPath(p) { return p.endsWith('.html') ? path.join(DIST, p) : path.join(DIST, p, 'index.html'); }
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

fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
const layout = partial('layout'), header = partial('header'), footer = partial('footer');
const lpHeader = partial('lp-header'), lpFooter = partial('lp-footer');
const pages = walk(path.join(SRC, 'pages')).map(parsePage).concat(products.map(productPage), products.map(lpPage));
const built = [];

for (const { meta, body } of pages) {
  const r = byPath[meta.path];
  if (!r) throw new Error(`Page ${meta.path} is not in routes.json`);
  if (r.status !== 'built') { console.log('skip (not marked built):', meta.path); continue; }
  const index = r.index && !PREVIEW;
  const shared = { phone: site.phone, phoneE164: site.phoneE164, email: site.email, name: site.name,
    serviceArea: site.serviceArea, year: String(new Date().getFullYear()), legalName: site.legalNameApproved ? ' · ' + esc(site.legalName) : '',
    social: socialHtml(), address: esc(site.address.full), hours: esc(site.hours.text) };
  const main = fill(body, { ...shared, leadForm: leadForm(null), portfolioGallery: portfolioGallery(), portfolioPreview: portfolioPreview() });
  let html = fill(layout, {
    title: esc(meta.title), description: esc(meta.description || ''),
    canonical: meta.path === '/404.html' ? '' : `<link rel="canonical" href="${site.origin}${meta.path}">`,
    robots: index ? 'index,follow' : 'noindex,follow',
    og: `<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(site.name)}"><meta property="og:title" content="${esc(meta.title)}"><meta property="og:description" content="${esc(meta.description || '')}"><meta property="og:url" content="${site.origin}${meta.path}">`,
    ldjson: ldjson(meta) + trackingTags(),
    draft: PREVIEW ? '<div class="draft-banner" role="note">Draft preview. Not for public release. Stock photos and some details are placeholders pending owner approval.</div>' : '',
    header: meta.lp ? fill(lpHeader, shared) : fill(header, { ...shared, nav: navHtml(meta.path), mobileNav: mobileNavHtml() }),
    crumbs: meta.lp ? '' : crumbs(meta),
    main: fill(main, shared),
    footer: meta.lp ? fill(lpFooter, shared) : fill(footer, { ...shared, footerProducts: footerProducts(), footerCompany: footerCompany(), footerLegal: footerLegal() }),
    bodyClass: meta.bodyClass || '',
    actionBar: meta.noActionBar ? '' : `<div class="action-bar" id="action-bar"><a class="btn btn-secondary" href="tel:${site.phoneE164}">Call</a><a class="btn btn-primary" href="${meta.lp ? '#lp-form' : meta.service ? '#consultation' : '/contact-us/'}">Free Consultation</a></div>`
  });
  if (/\{\{\w/.test(html)) throw new Error('Unfilled placeholder in ' + meta.path + ': ' + html.match(/\{\{[^}]+\}\}/)[0]);
  const out = outPath(meta.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // Cache-bust CSS/JS with a content hash so browsers never pair new HTML with stale styles.
  html = html.replace(/(href|src)="(\/assets\/(?:css|js)\/[^"?]+)"/g, (_, a, p) => `${a}="${p}?v=${assetVersion(p)}"`);
  const rooted = BASE
    ? html.replace(/\b(href|src|action)="\/(?!\/)/g, `$1="${BASE}/`)
        .replace(/\bsrcset="([^"]+)"/g, (_, v) => `srcset="${v.replace(/(^|,\s*)\/(?!\/)/g, `$1${BASE}/`)}"`)
        .replace('<html lang="en">', `<html lang="en" data-base="${BASE}">`)
    : html;
  fs.writeFileSync(out, rooted.replace(/\r?\n(\r?\n){2,}/g, '\n\n'));
  built.push({ path: meta.path, index });
}

const urls = built.filter(b => b.index && b.path !== '/404.html').map(b => `  <url><loc>${site.origin}${b.path}</loc></url>`).join('\n');
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), PREVIEW ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nDisallow: /thank-you/\nDisallow: /api/\n\nSitemap: ${site.origin}/sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, '_headers'), ['/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Frame-Options: SAMEORIGIN', PREVIEW ? '  X-Robots-Tag: noindex' : '', '/assets/*', '  Cache-Control: public, max-age=604800', ''].filter(Boolean).join('\n'));
fs.writeFileSync(path.join(DIST, '_redirects'), '# Add one-hop 301s here only after verifying the live URL exists. See routes.json legacyRedirectCandidates.\n');
console.log(`Built ${built.length} pages${PREVIEW ? ' (preview mode, all noindex)' : ''}:\n  ` + built.map(b => b.path).join('\n  '));
