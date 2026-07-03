/* ============================================================
   POST /api/cloudinary-sign-backup
   Signs a Cloudinary raw-file upload for a user's backup.
   Identity = Pi username supplied by the client (no session cookie
   required). The username is validated server-side for format only.

   Body:    { username: "pi_username" }
   Returns: { cloudName, apiKey, timestamp, signature, publicId }
   ============================================================ */

const crypto = require('crypto');

// Pi usernames: letters, digits, underscores, 1-50 chars
const USERNAME_RE = /^[a-zA-Z0-9_]{1,50}$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { username } = req.body || {};
  if (!username || !USERNAME_RE.test(username)) {
    res.status(400).json({ error: 'Thiếu hoặc sai định dạng username' });
    return;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Cloudinary chưa cấu hình trên server' });
    return;
  }

  const publicId  = `lb_backup_${username.toLowerCase()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const paramStr  = `overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramStr + CLOUDINARY_API_SECRET).digest('hex');

  res.status(200).json({ cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, timestamp, signature, publicId });
};
