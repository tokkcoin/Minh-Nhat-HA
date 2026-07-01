/* ============================================================
   POST /api/cloud-save
   Saves the app's localStorage backup to Vercel KV, keyed by
   the authenticated Pi user's uid.

   Requires:
     • lb_session cookie (set by /api/verify-auth after Pi sign-in)
     • SESSION_SECRET env var  (same secret used by verify-auth)
     • KV_REST_API_URL + KV_REST_API_TOKEN  (Vercel KV → connect
       a KV store to this project in the Vercel dashboard)

   Body: { localStorage: { "lifebalance_*": "..." } }
   ============================================================ */

const crypto = require('crypto');

function getSessionUid(req) {
  const cookie = req.headers.cookie || '';
  const match  = cookie.match(/lb_session=([^;]+)/);
  if (!match) return null;
  const token  = decodeURIComponent(match[1]);
  const dot    = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig     = token.slice(dot + 1);
  const secret  = process.env.SESSION_SECRET;
  if (!secret) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (expected !== sig) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')).uid || null; }
  catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const uid = getSessionUid(req);
  if (!uid) { res.status(401).json({ error: 'Not signed in — please sign in with Pi first' }); return; }

  const { localStorage: lsData } = req.body || {};
  if (!lsData || typeof lsData !== 'object') {
    res.status(400).json({ error: 'Missing localStorage data' }); return;
  }

  const payload = JSON.stringify({ savedAt: new Date().toISOString(), localStorage: lsData });
  if (payload.length > 512 * 1024) {
    res.status(413).json({ error: 'Backup too large (max 512 KB)' }); return;
  }

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    res.status(503).json({ error: 'Cloud storage not configured — set up Vercel KV in dashboard' }); return;
  }

  try {
    const kvRes = await fetch(KV_REST_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      // Upstash REST single-command format; 2-year TTL
      body: JSON.stringify(['SET', `backup:${uid}`, payload, 'EX', '63072000']),
    });
    const { result, error } = await kvRes.json();
    if (error || result !== 'OK') throw new Error(error || 'KV write failed');
    res.status(200).json({ ok: true, savedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[cloud-save]', e.message);
    res.status(502).json({ error: 'Cloud write failed — try again' });
  }
};
