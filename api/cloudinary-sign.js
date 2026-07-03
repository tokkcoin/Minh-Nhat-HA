/* ============================================================
   Vercel Serverless Function — POST /api/cloudinary-sign
   Issues a short-lived signed-upload signature so the browser can
   upload a file directly to Cloudinary (no file passes through this
   function — only a JSON signature does, so large videos never hit
   Vercel's request-body limit). Needs CLOUDINARY_API_SECRET, which
   must never reach client-side JS — same rule as PI_API_KEY/
   SESSION_SECRET (Vercel project Environment Variable only).
   Signing algorithm: https://cloudinary.com/documentation/signatures

   Body:    { username?: "pi_username", kind?: "image" | "video" }
   Returns: { cloudName, apiKey, timestamp, signature, folder }
   Files land under life-balance/users/<username>/images|videos so the
   whole account stays browsable per-user, same tree as backups (see
   api/cloudinary-sign-backup.js). Uploads made before a user is known
   to the client (username omitted) fall under .../anonymous/.
   ============================================================ */

const crypto = require('crypto');

// Pi usernames: letters, digits, underscores, 1-50 chars
const USERNAME_RE = /^[a-zA-Z0-9_]{1,50}$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Server is missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET' });
    return;
  }

  const { username, kind } = req.body || {};
  const safeUser = username && USERNAME_RE.test(username) ? username.toLowerCase() : 'anonymous';
  const sub      = kind === 'video' ? 'videos' : 'images';
  const folder   = `life-balance/users/${safeUser}/${sub}`;

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest('hex');

  res.status(200).json({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
  });
};
