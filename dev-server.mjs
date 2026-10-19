// Local preview server. Serves dist/ and implements POST /api/lead with the same contract as production,
// storing leads in .local-leads.jsonl. Usage: node dev-server.mjs [port]
// Set FAIL=storage to simulate an outage, FAIL=slow to simulate a slow server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLead, newLeadId, isSpam } from './functions/_lib/lead-core.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const store = path.join(path.dirname(root), '.local-leads.jsonl');
const idem = new Map();
const port = Number(process.argv[2] || 8787);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  // Netlify Forms emulation: urlencoded POST to "/" with form-name. Stores the fields like Netlify would.
  if (req.method === 'POST' && url.pathname === '/') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 8000) req.destroy(); });
    req.on('end', () => {
      if (process.env.FAIL === 'storage') { res.writeHead(500); return res.end('error'); }
      const f = Object.fromEntries(new URLSearchParams(raw));
      if (!f['form-name']) { res.writeHead(404); return res.end('not found'); }
      if (!f.company) fs.appendFileSync(store, JSON.stringify({ netlifyForm: f['form-name'], receivedAt: new Date().toISOString(), fields: f }) + '\n');
      res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<p>Thank you</p>');
    });
    return;
  }
  if (url.pathname === '/api/lead') {
    if (req.method !== 'POST') return send(res, 405, { accepted: false, message: 'Method not allowed.' });
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 8000) req.destroy(); });
    req.on('end', () => {
      const go = () => {
        if (process.env.FAIL === 'storage') return send(res, 503, { accepted: false, message: 'Online requests are temporarily unavailable.' });
        let input; try { input = JSON.parse(raw); } catch { return send(res, 400, { accepted: false, message: 'We could not read your request.' }); }
        const key = req.headers['idempotency-key'];
        if (key && idem.has(key)) return send(res, 200, { accepted: true, id: idem.get(key), duplicate: true });
        const id = newLeadId();
        if (isSpam(input)) return send(res, 201, { accepted: true, id });
        const { lead, fields, ok } = validateLead(input);
        if (!ok) return send(res, 422, { accepted: false, fields, message: 'Please check the highlighted fields.' });
        fs.appendFileSync(store, JSON.stringify({ id, receivedAt: new Date().toISOString(), lead }) + '\n');
        if (key) idem.set(key, id);
        send(res, 201, { accepted: true, id });
      };
      process.env.FAIL === 'slow' ? setTimeout(go, 3000) : go();
    });
    return;
  }
  let p = path.join(root, decodeURIComponent(url.pathname));
  if (!p.startsWith(root)) { res.writeHead(400); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) {
    if (!url.pathname.endsWith('/') && !path.extname(url.pathname) && fs.existsSync(path.join(root, url.pathname, 'index.html'))) {
      res.writeHead(301, { Location: url.pathname + '/' + url.search }); return res.end();
    }
    res.writeHead(404, { 'Content-Type': types['.html'] }); return res.end(fs.readFileSync(path.join(root, '404.html')));
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(port, () => console.log(`Preview on http://localhost:${port}  (leads -> ${store})`));
