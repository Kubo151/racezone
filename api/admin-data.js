const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ORIGINS = ['https://www.bamper.sk', 'https://bamper.sk'];

function isAuthed(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!ADMIN_PASSWORD || !token) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_PASSWORD));
  } catch (_) { return false; }
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
}

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { type, id } = req.query;

  // UUID validácia — bráni PostgREST injection cez id parameter
  if (id && !UUID_RE.test(id)) return res.status(400).json({ error: 'Neplatné id' });

  try {
    if (req.method === 'GET') {
      if (type === 'reservations') return res.json(await sb('/reservations?order=created_at.desc&limit=200'));
      if (type === 'testimonials') return res.json(await sb('/testimonials?order=display_order.asc,created_at.desc'));
      if (type === 'blocked_dates') return res.json(await sb('/blocked_dates?order=date_from.asc'));
    }

    if (req.method === 'POST') {
      if (type === 'testimonials') return res.json(await sb('/testimonials', 'POST', req.body));
      if (type === 'blocked_dates') return res.json(await sb('/blocked_dates', 'POST', req.body));
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'Chýba id' });
      if (type === 'testimonials') return res.json(await sb(`/testimonials?id=eq.${id}`, 'PATCH', req.body));
      if (type === 'reservations') return res.json(await sb(`/reservations?id=eq.${id}`, 'PATCH', req.body));
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Chýba id' });
      if (type === 'testimonials') { await sb(`/testimonials?id=eq.${id}`, 'DELETE'); return res.status(204).end(); }
      if (type === 'blocked_dates') { await sb(`/blocked_dates?id=eq.${id}`, 'DELETE'); return res.status(204).end(); }
    }

    return res.status(400).json({ error: 'Neznámy typ alebo metóda' });
  } catch (e) {
    console.error('admin-data error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
