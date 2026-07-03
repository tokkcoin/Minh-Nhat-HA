/* ============================================================
   POST /api/cloudinary-sign-backup
   Signs a Cloudinary raw-file upload using the Pi user's username
   as the backup key. No body params needed — identity comes from
   the verified lb_session cookie set by /api/verify-auth.

   Returns: { cloudName, apiKey, timestamp, signature, publicId, username }
   ============================================================ */

const crypto = require('crypto');

function getSession(req) {
  const m = (req.headers.cookie || '').match(/lb_session=([^;]+)/);
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  const dot   = token.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig     = token.slice(dot + 1);
  const secret  = process.env.SESSION_SECRET;
  if (!secret) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (expected !== sig) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()); }
  catch { return null; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const session = getSession(req);
  if (!session?.username) {
    res.status(401).json({ error: 'Chưa đăng nhập Pi' });
    return;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Cloudinary chưa được cấu hình trên server' });
    return;
  }

  // Sanitise username → safe Cloudinary public_id
  const safeUser = session.username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const publicId = `lb_backup_${safeUser}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const paramStr  = `overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramStr + CLOUDINARY_API_SECRET).digest('hex');

  res.status(200).json({ cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, timestamp, signature, publicId, username: session.username });
};
