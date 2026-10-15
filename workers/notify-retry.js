// Cloudflare Worker on a Cron Trigger (every 10 minutes). Bind the same LEADS KV namespace and email env vars.
// Retries notifications that failed, and raises an alert email once a lead has failed 5 times.
import { sendNotification } from '../functions/_lib/lead-core.mjs';

export default {
  async scheduled(event, env) {
    const list = await env.LEADS.list({ prefix: 'pending:', limit: 100 });
    for (const k of list.keys) {
      const id = k.name.slice('pending:'.length);
      const raw = await env.LEADS.get('lead:' + id);
      if (!raw) { await env.LEADS.delete(k.name); continue; }
      const record = JSON.parse(raw);
      const sent = await sendNotification(env, record);
      record.attempts = (record.attempts || 0) + 1;
      record.notified = sent;
      await env.LEADS.put('lead:' + id, JSON.stringify(record));
      if (sent) { await env.LEADS.delete(k.name); continue; }
      if (record.attempts === 5 && env.ALERT_WEBHOOK) {
        // Optional: point at a Slack/Discord/SMS webhook so a stuck lead is never silent.
        await fetch(env.ALERT_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `NextGen lead ${id} has failed email delivery 5 times. Check the LEADS store.` }) }).catch(() => {});
      }
    }
  }
};
