/* ============================================================
   POST /api/cloudinary-sign-backup
   Signs a Cloudinary raw-file upload for the current Pi user's
   backup. The public_id is fixed per user so each save silently
   overwrites the previous backup on Cloudinary.

   Requires: lb_session cookie + SESSION_SECRET + CLOUDINARY_* env vars.
   Returns: { cloudName, apiKey, timestamp, signature, publicId, username }
   ============================================================ */

const crypto = require('crypto');

function getSession(req) {
  const cookie = req.headers.cookie || '';
  const match  = cookie.match(/lb_session=([^;]+)/);
  if (!match) return null;
  const token  = decodeURIComponent(match[1]);
  const dot    = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload  = token.slice(0, dot);
  const sig      = token.slice(dot + 1);
  const secret   = process.env.SESSION_SECRET;
  if (!secret) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (expected !== sig) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')); }
  catch { return null; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const session = getSession(req);
  if (!session?.uid) {
    res.status(401).json({ error: 'Not signed in — sign in with Pi first' });
    return;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Cloudinary env vars not configured' });
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId  = `lb_backup_${session.uid}`;

  // Params to sign — must be sorted alphabetically, concatenated, then append secret.
  // Cloudinary docs: https://cloudinary.com/documentation/signatures
  const paramStr = `overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramStr + CLOUDINARY_API_SECRET)
    .digest('hex');

  res.status(200).json({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey:    CLOUDINARY_API_KEY,
    timestamp,
    signature,
    publicId,
    username: session.username,
    uid:      session.uid,
  });
};
