/* ============================================================
   Vercel Serverless Function — POST /api/cloudinary-sign
   Issues a short-lived signed-upload signature so the browser can
   upload a file directly to Cloudinary (no file passes through this
   function — only a JSON signature does, so large videos never hit
   Vercel's request-body limit). Needs CLOUDINARY_API_SECRET, which
   must never reach client-side JS — same rule as PI_API_KEY/
   SESSION_SECRET (Vercel project Environment Variable only).
   Signing algorithm: https://cloudinary.com/documentation/signatures
   ============================================================ */

const crypto = require('crypto');

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

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest('hex');

  res.status(200).json({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    signature,
  });
};
