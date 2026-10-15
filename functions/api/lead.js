// Cloudflare Pages Function: POST /api/lead
// Bindings (Pages project > Settings): KV namespace LEADS. Env vars: RESEND_API_KEY (secret), NOTIFY_TO, NOTIFY_FROM, ALLOWED_ORIGIN.
import { validateLead, newLeadId, isSpam, sendNotification, json } from '../_lib/lead-core.mjs';

export async function onRequestPost({ request, env, waitUntil }) {
  const origin = request.headers.get('Origin');
  if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) return json(403, { accepted: false, message: 'Request not allowed.' });
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json(415, { accepted: false, message: 'Unsupported request.' });
  if (!env.LEADS) return json(503, { accepted: false, message: 'Online requests are temporarily unavailable.' });

  let input;
  try { const raw = await request.text(); if (raw.length > 8000) throw 0; input = JSON.parse(raw); }
  catch { return json(400, { accepted: false, message: 'We could not read your request.' }); }

  const idem = (request.headers.get('Idempotency-Key') || '').slice(0, 64);
  if (idem) {
    const prior = await env.LEADS.get('idem:' + idem);
    if (prior) return json(200, { accepted: true, id: prior, duplicate: true });
  }

  // Basic rate limit: 5 per IP per 10 minutes. IP is hashed, never stored raw.
  const ip = request.headers.get('CF-Connecting-IP') || '0';
  const ipHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + (env.IP_SALT || 'ng')))))
    .slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
  const rlKey = 'rl:' + ipHash;
  const count = Number(await env.LEADS.get(rlKey) || 0);
  if (count >= 5) return json(429, { accepted: false, message: 'Too many requests. Please call us instead.' });
  await env.LEADS.put(rlKey, String(count + 1), { expirationTtl: 600 });

  const id = newLeadId();
  if (isSpam(input)) return json(201, { accepted: true, id }); // silently dropped, looks normal to bots

  const { lead, fields, ok } = validateLead(input);
  if (!ok) return json(422, { accepted: false, fields, message: 'Please check the highlighted fields.' });

  const record = { id, receivedAt: new Date().toISOString(), lead, notified: false, attempts: 0 };
  try {
    await env.LEADS.put('lead:' + id, JSON.stringify(record));
    await env.LEADS.put('pending:' + id, '1'); // removed once notification succeeds
    if (idem) await env.LEADS.put('idem:' + idem, id, { expirationTtl: 86400 });
  } catch {
    return json(503, { accepted: false, message: 'Online requests are temporarily unavailable.' });
  }

  // Notification runs after the response. Failures stay in pending: and the retry worker picks them up.
  waitUntil((async () => {
    const sent = await sendNotification(env, record);
    record.attempts = 1;
    record.notified = sent;
    await env.LEADS.put('lead:' + id, JSON.stringify(record));
    if (sent) await env.LEADS.delete('pending:' + id);
  })());

  return json(201, { accepted: true, id });
}

export const onRequest = () => json(405, { accepted: false, message: 'Method not allowed.' });
