/* ============================================================
   Vercel Serverless Function — POST /api/verify-auth
   Validates a Pi accessToken (from Pi.authenticate() on the client)
   by calling Pi's GET /v2/me with it as a Bearer token. No Pi API
   key is needed for this — only for the payments endpoints.
   On success, issues a signed, HttpOnly session cookie (no database:
   the cookie itself carries {uid, username}, HMAC-signed with
   SESSION_SECRET so it can't be forged or tampered with).
   ============================================================ */

const crypto = require('crypto');

function signSession(payload) {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(payloadStr)
    .digest('base64url');
  return `${payloadStr}.${signature}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { accessToken } = req.body || {};
  if (!accessToken) {
    res.status(400).json({ error: 'accessToken is required' });
    return;
  }

  if (!process.env.SESSION_SECRET) {
    res.status(500).json({ error: 'Server is missing SESSION_SECRET' });
    return;
  }

  try {
    const meRes = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meRes.ok) {
      const detail = await meRes.json().catch(() => ({}));
      res.status(meRes.status).json({ error: 'Pi token validation failed', detail });
      return;
    }

    const piUser = await meRes.json();
    const session = signSession({ uid: piUser.uid, username: piUser.username, iat: Date.now() });

    res.setHeader(
      'Set-Cookie',
      `lb_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
    );
    res.status(200).json({ user: { uid: piUser.uid, username: piUser.username } });
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Pi Platform API', detail: String(err) });
  }
};
