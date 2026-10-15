// Shared lead logic used by the Cloudflare Pages Function and the local dev server.
// Contract: POST /api/lead (JSON, Idempotency-Key header)
//  201 {accepted:true,id}            stored durably
//  200 {accepted:true,id,duplicate}  same Idempotency-Key seen before, no new lead
//  422 {accepted:false,fields,message} validation failed
//  429 {accepted:false,message}      rate limited
//  503 {accepted:false,message}      storage unavailable, nothing stored

export const PRODUCTS = ['blinds', 'shades', 'motorized-shades', 'shutters', 'drapery', 'roller-solar', 'zebra'];
const METHODS = ['phone', 'text', 'email'];
const WINDOWS = ['', '1 to 3', '4 to 8', '9 to 15', 'Whole home'];
const TIMING = ['', 'Mornings', 'Afternoons', 'Evenings'];

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

export function validateLead(input) {
  const fields = {};
  const lead = {
    name: clean(input.name, 80),
    zip: clean(input.zip, 5),
    contact_method: clean(input.contact_method, 10),
    phone: clean(input.phone, 20),
    email: clean(input.email, 120).toLowerCase(),
    interest: clean(input.interest, 40),
    windows: clean(input.windows, 20),
    timing: clean(input.timing, 20),
    notes: clean(input.notes, 1500),
    page: clean(input.page, 200),
    attribution: clean(input.attribution, 1000)
  };
  if (lead.name.length < 2) fields.name = 'Enter your name.';
  if (!/^\d{5}$/.test(lead.zip)) fields.zip = 'Enter a 5-digit ZIP code.';
  if (!METHODS.includes(lead.contact_method)) lead.contact_method = 'phone';
  const digits = lead.phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  const needPhone = lead.contact_method !== 'email';
  if ((needPhone || lead.phone) && digits.length !== 10) fields.phone = 'Enter a 10-digit phone number.';
  else if (digits) lead.phone = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  const needEmail = lead.contact_method === 'email';
  if ((needEmail || lead.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) fields.email = 'Enter a valid email address.';
  if (lead.interest && !PRODUCTS.includes(lead.interest)) lead.interest = '';
  if (!WINDOWS.includes(lead.windows)) lead.windows = '';
  if (!TIMING.includes(lead.timing)) lead.timing = '';
  try { lead.attribution = lead.attribution ? JSON.parse(lead.attribution) : {}; } catch { lead.attribution = {}; }
  return { lead, fields, ok: Object.keys(fields).length === 0 };
}

export function newLeadId(now = new Date()) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, '');
  const r = Array.from(crypto.getRandomValues(new Uint8Array(3))).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `NG-${d}-${r}`;
}

export function isSpam(input) {
  return !!(input.company && String(input.company).trim()); // honeypot
}

const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function notificationEmail(record) {
  const l = record.lead;
  const rows = [
    ['Reference', record.id], ['Received', record.receivedAt], ['Name', l.name], ['ZIP', l.zip],
    ['Preferred contact', l.contact_method], ['Phone', l.phone], ['Email', l.email],
    ['Interest', l.interest || 'Not specified'], ['Windows', l.windows], ['Best time', l.timing],
    ['Notes', l.notes], ['Submitted from', l.page], ['Source', [l.attribution.utm_source, l.attribution.utm_campaign, l.attribution.ref].filter(Boolean).join(' / ')]
  ].filter(r => r[1]);
  return {
    subject: `New consultation request ${record.id} (${l.zip})`,
    text: rows.map(r => `${r[0]}: ${r[1]}`).join('\n'),
    html: `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">${rows.map(r => `<tr><td><b>${escHtml(r[0])}</b></td><td>${escHtml(r[1]).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`
  };
}

// Resend HTTP API. Returns true only on a 2xx.
export async function sendNotification(env, record) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_TO || !env.NOTIFY_FROM) return false;
  const m = notificationEmail(record);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.NOTIFY_FROM, to: env.NOTIFY_TO.split(',').map(s => s.trim()), subject: m.subject, text: m.text, html: m.html,
        reply_to: record.lead.email || undefined })
    });
    return res.ok;
  } catch { return false; }
}

export const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
