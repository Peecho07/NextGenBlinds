// Generates simple original SVG illustrations used as draft stand-ins for photography.
// Every file is a placeholder: replace with rights-cleared NextGen install photos before launch.
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'src', 'assets', 'img', 'art');
fs.mkdirSync(out, { recursive: true });

const W = 800, H = 500;
const wall = '#EDE6DA', trim = '#FFFFFF', floor = '#D9CBB5';
const sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD6EA"/><stop offset="1" stop-color="#E9F1F7"/></linearGradient>
<linearGradient id="sun" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6E0" stop-opacity=".9"/><stop offset="1" stop-color="#FFF6E0" stop-opacity="0"/></linearGradient>`;
const palm = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" opacity=".55"><path d="M0 0 C4 -40 2 -80 8 -120" stroke="#6E8A6A" stroke-width="5" fill="none"/><g fill="#7D9B78"><path d="M8 -120 c-30 -10 -55 0 -70 18 c25 -8 45 -10 70 -18z"/><path d="M8 -120 c30 -12 58 -2 72 16 c-26 -8 -48 -10 -72 -16z"/><path d="M8 -120 c-8 -26 -30 -40 -50 -42 c20 12 34 24 50 42z"/><path d="M8 -120 c10 -26 34 -38 54 -38 c-22 10 -38 22 -54 38z"/></g></g>`;
function room(inner, opts = {}) {
  const wx = opts.wx ?? 250, wy = opts.wy ?? 70, ww = opts.ww ?? 300, wh = opts.wh ?? 300;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label}">
<defs>${sky}</defs>
<rect width="${W}" height="${H}" fill="${wall}"/>
<rect y="${H - 70}" width="${W}" height="70" fill="${floor}"/>
<rect y="${H - 72}" width="${W}" height="4" fill="#C9B89E"/>
<rect x="${wx - 14}" y="${wy - 14}" width="${ww + 28}" height="${wh + 28}" fill="${trim}"/>
<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="url(#sky)"/>
${palm(wx + ww * 0.72, wy + wh, 1.1)}
<rect x="${wx + ww / 2 - 3}" y="${wy}" width="6" height="${wh}" fill="${trim}"/>
${inner(wx, wy, ww, wh)}
<rect x="${wx - 24}" y="${wy + wh + 14}" width="${ww + 48}" height="12" fill="${trim}"/>
<polygon points="${wx},${wy + wh} ${wx + ww},${wy + wh} ${wx + ww + 160},${H - 70} ${wx - 120},${H - 70}" fill="url(#sun)" opacity=".5"/>
${opts.extra || ''}
</svg>`;
}

const art = {
  'blinds': room((x, y, w, h) => {
    let s = `<rect x="${x - 10}" y="${y - 4}" width="${w + 20}" height="14" rx="2" fill="#F4EFE7"/>`;
    for (let i = 0; i < 15; i++) s += `<rect x="${x - 6}" y="${y + 14 + i * 13}" width="${w + 12}" height="8" rx="2" fill="#F7F3EC" stroke="#E2D9CB"/>`;
    s += `<line x1="${x + 30}" y1="${y + 10}" x2="${x + 30}" y2="${y + 210}" stroke="#D8CDBB"/><line x1="${x + w - 30}" y1="${y + 10}" x2="${x + w - 30}" y2="${y + 210}" stroke="#D8CDBB"/>`;
    return s;
  }, { label: 'Illustration of custom horizontal blinds on a window' }),
  'shades': room((x, y, w, h) => `<rect x="${x - 10}" y="${y - 6}" width="${w + 20}" height="16" rx="3" fill="#E7E1D6"/><rect x="${x - 4}" y="${y + 10}" width="${w + 8}" height="${h * 0.55}" fill="#CFC5B5" opacity=".92"/><rect x="${x - 4}" y="${y + 10 + h * 0.55}" width="${w + 8}" height="8" fill="#B9AD9A"/>`,
    { label: 'Illustration of a fabric shade partly lowered on a window' }),
  'motorized': room((x, y, w, h) => `<rect x="${x - 10}" y="${y - 6}" width="${w + 20}" height="18" rx="3" fill="#DCD6CC"/><rect x="${x - 4}" y="${y + 12}" width="${w + 8}" height="${h * 0.38}" fill="#8F9AA3" opacity=".85"/><rect x="${x - 4}" y="${y + 12 + h * 0.38}" width="${w + 8}" height="8" fill="#6F7A84"/>`,
    { label: 'Illustration of a motorized shade with a wall remote', extra: `<g transform="translate(640 230)"><rect width="46" height="78" rx="8" fill="#FFFFFF" stroke="#C9C1B3"/><circle cx="23" cy="22" r="8" fill="#356AA6"/><circle cx="23" cy="48" r="8" fill="#9AA8B3"/></g>` }),
  'shutters': room((x, y, w, h) => {
    let s = '';
    [[x, w / 2], [x + w / 2, w / 2]].forEach(([px, pw]) => {
      s += `<rect x="${px}" y="${y}" width="${pw}" height="${h}" fill="none" stroke="#FFFFFF" stroke-width="10"/>`;
      for (let i = 0; i < 16; i++) s += `<rect x="${px + 8}" y="${y + 10 + i * 17.5}" width="${pw - 16}" height="9" fill="#FFFFFF" opacity=".95"/>`;
      s += `<rect x="${px + pw / 2 - 2}" y="${y + 10}" width="4" height="${h - 20}" fill="#EFEAE2"/>`;
    });
    return s;
  }, { label: 'Illustration of white interior plantation shutters' }),
  'drapery': room((x, y, w, h) => {
    const panel = (px, flip) => { let s = ''; for (let i = 0; i < 6; i++) s += `<rect x="${px + (flip ? -i * 14 : i * 14)}" y="${y - 30}" width="16" height="${h + 90}" fill="${i % 2 ? '#C7B79F' : '#D6C8B2'}"/>`; return s; };
    return `<rect x="${x - 80}" y="${y - 36}" width="${w + 160}" height="6" rx="3" fill="#8A7A62"/>${panel(x - 74, false)}${panel(x + w + 58, true)}`;
  }, { label: 'Illustration of full-height custom drapery panels framing a window' }),
  'roller-solar': room((x, y, w, h) => `<rect x="${x - 10}" y="${y - 6}" width="${w + 20}" height="16" rx="3" fill="#D3CEC5"/><rect x="${x - 4}" y="${y + 10}" width="${w + 8}" height="${h * 0.7}" fill="#5D666E" opacity=".45"/><rect x="${x - 4}" y="${y + 10 + h * 0.7}" width="${w + 8}" height="7" fill="#4C545B"/>`,
    { label: 'Illustration of a solar roller shade that softens glare while keeping the view' }),
  'zebra': room((x, y, w, h) => {
    let s = `<rect x="${x - 10}" y="${y - 6}" width="${w + 20}" height="16" rx="3" fill="#E4DED3"/>`;
    for (let i = 0; i < 9; i++) s += `<rect x="${x - 4}" y="${y + 10 + i * 30}" width="${w + 8}" height="15" fill="#E9E2D6" opacity="${i % 2 ? .95 : .6}"/>`;
    return s;
  }, { label: 'Illustration of a zebra shade with alternating sheer and solid bands' }),
  'hero': room((x, y, w, h) => {
    let s = `<rect x="${x - 10}" y="${y - 6}" width="${w + 20}" height="16" rx="3" fill="#E7E1D6"/><rect x="${x - 4}" y="${y + 10}" width="${w + 8}" height="${h * 0.32}" fill="#D7CDBE" opacity=".93"/><rect x="${x - 4}" y="${y + 10 + h * 0.32}" width="${w + 8}" height="7" fill="#BCAE98"/>`;
    for (let i = 0; i < 6; i++) s += `<rect x="${x - 110 + i * 14}" y="${y - 30}" width="16" height="${h + 90}" fill="${i % 2 ? '#B9C6D4' : '#C9D4E0'}"/>`;
    for (let i = 0; i < 6; i++) s += `<rect x="${x + w + 24 + i * 14}" y="${y - 30}" width="16" height="${h + 90}" fill="${i % 2 ? '#B9C6D4' : '#C9D4E0'}"/>`;
    return s + `<rect x="${x - 120}" y="${y - 36}" width="${w + 240}" height="6" rx="3" fill="#7C8792"/>`;
  }, { label: 'Illustration of a bright living room window with a layered shade and drapery', wx: 230, ww: 340,
    extra: `<g><rect x="60" y="330" width="170" height="70" rx="10" fill="#B8A88F"/><rect x="50" y="310" width="190" height="34" rx="12" fill="#CDBFA8"/><rect x="600" y="300" width="70" height="100" rx="4" fill="#E2D7C6"/><circle cx="635" cy="282" r="26" fill="#93A98C"/></g>` })
};

// Retractable awning over a patio (no reference photo exists for this product yet)
art['awning'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Illustration of a retractable awning extended over a patio">
<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC3E4"/><stop offset="1" stop-color="#E4F0F8"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#sk)"/>
${palm(690, 380, 1.6)}${palm(90, 390, 1.3)}
<rect x="140" y="60" width="520" height="320" fill="#EFE6D6"/>
<rect x="140" y="52" width="520" height="12" fill="#D9CBB2"/>
<rect x="250" y="190" width="300" height="190" fill="#B9CFE0" stroke="#FFFFFF" stroke-width="10"/>
<rect x="397" y="190" width="6" height="190" fill="#FFFFFF"/>
<polygon points="170,110 630,110 700,230 100,230" fill="#356AA6"/>
${Array.from({ length: 9 }, (_, i) => `<polygon points="${170 + i * 51.1},110 ${195 + i * 51.1},110 ${100 + i * 66.7 + 33},230 ${100 + i * 66.7},230" fill="#FFFFFF" opacity=".9"/>`).join('')}
<path d="M100 230 q33 18 66 0 q33 18 66 0 q33 18 66 0 q33 18 66 0 q33 18 66 0 q33 18 66 0 q33 18 66 0 q33 18 66 0 q33 18 66 0" fill="#356AA6"/>
<line x1="170" y1="114" x2="110" y2="226" stroke="#6E7782" stroke-width="5"/><line x1="630" y1="114" x2="690" y2="226" stroke="#6E7782" stroke-width="5"/>
<rect x="0" y="380" width="${W}" height="120" fill="#D8C9AE"/>
<polygon points="100,248 700,248 790,380 10,380" fill="#1F3A55" opacity=".12"/>
<g><rect x="300" y="320" width="200" height="12" rx="3" fill="#8C6D4A"/><rect x="315" y="332" width="8" height="48" fill="#8C6D4A"/><rect x="477" y="332" width="8" height="48" fill="#8C6D4A"/>
<rect x="230" y="330" width="50" height="50" rx="6" fill="#FFFFFF" opacity=".9"/><rect x="520" y="330" width="50" height="50" rx="6" fill="#FFFFFF" opacity=".9"/></g>
</svg>`;

for (const [name, svg] of Object.entries(art)) fs.writeFileSync(path.join(out, name + '.svg'), svg);
console.log('Wrote', Object.keys(art).length, 'draft illustrations to', out);
