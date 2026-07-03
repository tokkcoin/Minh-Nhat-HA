/* ============================================================
   POST /api/cloudinary-sign-backup
   Signs a Cloudinary raw-file upload for the caller's device backup.
   No Pi authentication required — the backup key is a device UUID
   generated client-side and stored in localStorage. Anyone who knows
   their device UUID can back up and restore their own data.

   Body:    { deviceId: "<uuid-v4>" }
   Returns: { cloudName, apiKey, timestamp, signature, publicId }

   Requires: CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
   ============================================================ */

const crypto = require('crypto');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { deviceId } = req.body || {};
  if (!deviceId || !UUID_RE.test(deviceId)) {
    res.status(400).json({ error: 'Invalid or missing deviceId (must be UUID v4)' });
    return;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Cloudinary env vars not configured on server' });
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId  = `lb_backup_${deviceId.replace(/-/g, '')}`;

  // Cloudinary signature: params sorted alphabetically + API secret appended (no &).
  const paramStr  = `overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramStr + CLOUDINARY_API_SECRET).digest('hex');

  res.status(200).json({ cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, timestamp, signature, publicId });
};
