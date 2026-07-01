/* ============================================================
   GET /api/cloud-load
   Returns the user's latest cloud backup from Vercel KV, or
   { backup: null } if they have no backup yet.
   Also acts as an auth-status probe: returns 401 when not
   signed in, so the client knows to show the sign-in prompt.
   ============================================================ */

const crypto = require('crypto');

function getSession(req) {
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
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')); }
  catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') { res.status(405).end(); return; }

  const session = getSession(req);
  if (!session?.uid) {
    res.status(401).json({ error: 'Not signed in' }); return;
  }

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    res.status(503).json({ error: 'Cloud storage not configured' }); return;
  }

  try {
    const kvRes = await fetch(KV_REST_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', `backup:${session.uid}`]),
    });
    const { result, error } = await kvRes.json();
    if (error) throw new Error(error);

    const backup = result ? JSON.parse(result) : null;
    res.status(200).json({
      username: session.username,
      backup,   // { savedAt, localStorage } or null
    });
  } catch (e) {
    console.error('[cloud-load]', e.message);
    res.status(502).json({ error: 'Cloud read failed — try again' });
  }
};
