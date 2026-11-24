'use strict';
/**
 * Maidanmoussecups — BACKEND + SITE (single deploy).
 * - Serves index.html at "/" (the page finds this server's /api by itself — owner pastes nothing)
 * - Serves the JSON API at "/api"
 * Run:   node app.js          (Node 18+)
 * Env:   OWNER_PIN (first-time PIN, default 1234; owner can change it from the page), PORT, DATA_FILE
 */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT       = process.env.PORT || 3000;
const OWNER_PIN  = process.env.OWNER_PIN || '1234';                 // first-time PIN only; after the owner changes it in the page, the new one is stored in the data file
const DATA_FILE  = process.env.DATA_FILE || path.join(__dirname, 'data', 'data.json');
const INDEX_FILE = path.join(__dirname, 'index.html');              // served at "/"

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const OWNER_HASH = sha(OWNER_PIN);
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

let db = { cfg: null, orders: [], alerts: [], ownerHash: null };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); } catch (e) { /* first run */ }
function save() { const t = DATA_FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(db)); fs.renameSync(t, DATA_FILE); }

const pub = c => { const o = JSON.parse(JSON.stringify(c)); delete o.pinHash; return o; };
const str = (v, n) => String(v == null ? '' : v).slice(0, n);

/* ---- owner PIN check ---- */
const fails = new Map();
function authOk(a, ip) {
  const now = Date.now(), list = (fails.get(ip) || []).filter(t => now - t < 600000);
  if (list.length >= 10) { fails.set(ip, list); return null; }
  if (typeof a === 'string' && /^[0-9a-f]{64}$/.test(a) && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(db.ownerHash || OWNER_HASH))) return true;
  list.push(now); fails.set(ip, list); return false;
}

/* ---- all actions (synchronous → atomic) ---- */
function act(name, b, ip) {
  const cfg = db.cfg;
  if (name === 'seed') {
    if (cfg) return { ok: true, cfg: pub(cfg) };
    const c = b.cfg; if (!c || !Array.isArray(c.items)) return { ok: false, error: 'Bad data' };
    delete c.pinHash; c.items.forEach(i => i.cap = i.stock); c.updatedAt = Date.now();
    db.cfg = c; save(); return { ok: true, cfg: pub(c) };
  }
  if (!cfg) return { ok: false, error: 'Shop is still being set up. Try again in a moment.' };

  if (name === 'order') {
    const o = b.order || {}, it = cfg.items.find(i => i.id === o.itemId), qty = parseInt(o.qty, 10);
    if (!it || !(qty > 0)) return { ok: false, error: 'Invalid order.', cfg: pub(cfg) };
    if (it.avail === 'out' || it.avail === 'hidden' || it.stock <= 0) return { ok: false, error: 'Sorry, sold out.', cfg: pub(cfg) };
    if (qty > it.stock) return { ok: false, error: 'Only ' + it.stock + ' left.', cfg: pub(cfg) };
    if (it.max && qty > it.max) return { ok: false, error: 'Maximum ' + it.max + ' per order.', cfg: pub(cfg) };
    it.stock -= qty; cfg.updatedAt = Date.now();
    db.orders.push({ t: Date.now(), code: str(o.code, 12), name: str(o.name, 80), phone: str(o.phone, 20), itemName: it.name, qty, total: qty * it.price, slot: str(o.slot, 40), note: str(o.note, 300) });
    if (db.orders.length > 5000) db.orders.shift();
    save(); return { ok: true, cfg: pub(cfg) };
  }
  if (name === 'alert') {
    db.alerts.push({ t: Date.now(), name: str(b.name, 80), phone: str(b.phone, 20) });
    if (db.alerts.length > 5000) db.alerts.shift();
    save(); return { ok: true };
  }

  /* ---- owner only ---- */
  const a = authOk(b.auth, ip);
  if (a === null) return { ok: false, error: 'Too many wrong tries. Wait 10 minutes.', slow: true };
  if (!a) return { ok: false, error: 'Wrong PIN', slow: true };
  if (name === 'login') return { ok: true };
  if (name === 'setPin') {                                            // owner changes PIN from the page; stored on the server
    if (typeof b.newAuth !== 'string' || !/^[0-9a-f]{64}$/.test(b.newAuth)) return { ok: false, error: 'Bad PIN' };
    db.ownerHash = b.newAuth; save(); return { ok: true };
  }

  if (name === 'adjust') {
    const it = cfg.items.find(i => i.id === b.itemId);
    if (it) { it.stock = Math.max(0, it.stock + (+b.delta || 0)); it.cap = Math.max(it.cap || 0, it.stock); }
    cfg.updatedAt = Date.now(); save(); return { ok: true, cfg: pub(cfg) };
  }
  if (name === 'saveConfig') {
    const old = {}; cfg.items.forEach(i => old[i.id] = i);
    const nc = b.cfg, set = b.stockSet || {};
    if (!nc || !Array.isArray(nc.items)) return { ok: false, error: 'Bad data' };
    delete nc.pinHash;
    nc.items.forEach(it => {
      const o = old[it.id];
      if (set[it.id] !== undefined) { it.stock = Math.max(0, +set[it.id] || 0); it.cap = it.stock; }
      else if (o) { it.stock = o.stock; it.cap = o.cap || o.stock; }
      else it.cap = it.stock;
    });
    nc.updatedAt = Date.now(); db.cfg = nc; save(); return { ok: true, cfg: pub(nc) };
  }
  if (name === 'orders') {
    const fmt = t => new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return { ok: true, orders: db.orders.slice(-200).reverse().map(o => Object.assign({}, o, { at: fmt(o.t) })), alerts: db.alerts.slice(-200).reverse() };
  }
  return { ok: false, error: 'Unknown action' };
}

/* ---- Server & Auto-Injection ---- */
const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const send = (res, code, body, type) => { res.writeHead(code, Object.assign({ 'Content-Type': type || 'application/json; charset=utf-8' }, H)); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };

function serveIndex(req, res) {
  try {
    let html = fs.readFileSync(INDEX_FILE, 'utf8');
    const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
    const host  = req.headers['x-forwarded-host'] || req.headers.host || ('localhost:' + PORT);
    const origin = proto + '://' + host;
    // Inject the backend URL into the HTML automatically (the page can also find /api by itself)
    html = html.replace(/"cloudUrl"\s*:\s*"[^"]*"/, `"cloudUrl": ${JSON.stringify(origin + '/api')}`);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(html);
  } catch (e) {
    send(res, 200, 'Maidanmoussecups backend is running ✅ (put index.html next to app.js)', 'text/plain; charset=utf-8');
  }
}

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  if (req.method === 'OPTIONS') return send(res, 204, '', 'text/plain');
  if (u.pathname === '/healthz')    return send(res, 200, 'ok', 'text/plain');
  if (u.pathname === '/favicon.ico'){ res.writeHead(204); return res.end(); }

  const isApi  = u.pathname === '/api';
  const isRoot = u.pathname === '/' || u.pathname === '/index.html';
  if (!isApi && !isRoot) return send(res, 404, 'Not found', 'text/plain');

  if (req.method === 'GET') {
    const action = u.searchParams.get('action');
    if (!action) {
      if (isRoot) return serveIndex(req, res);
      return send(res, 200, 'Maidanmoussecups backend is running ✅', 'text/plain; charset=utf-8');
    }
    if (!db.cfg) return send(res, 200, { empty: true });
    return send(res, 200, action === 'ver' ? { v: db.cfg.updatedAt || 0 } : { cfg: pub(db.cfg), v: db.cfg.updatedAt || 0 });
  }
  if (req.method !== 'POST') return send(res, 405, 'Method not allowed', 'text/plain');
  let body = '', big = false;
  req.on('data', d => { body += d; if (body.length > 12e6) { big = true; req.destroy(); } });
  req.on('end', () => {
    if (big) return;
    let out; try { const b = JSON.parse(body); out = act(b.action, b, ip); } catch (e) { out = { ok: false, error: 'Server error' }; }
    if (out.slow) { delete out.slow; setTimeout(() => send(res, 200, out), 800); } else send(res, 200, out);
  });
}).listen(PORT, () => console.log('Maidanmoussecups backend running on port ' + PORT));