/* ============================================================
   POST /api/backup-restore
   Fetches a user's backup JSON via the Cloudinary Admin API instead
   of the public delivery CDN (res.cloudinary.com). The delivery CDN
   caches raw-file responses by URL and ignores the app's ?v=timestamp
   query-string cache-buster, so it kept serving stale, long-out-of-
   date backups no matter how many times a newer one was uploaded.
   The Admin API is authenticated, never CDN-cached, and always
   reflects the current resource — including its live secure_url
   (with the correct /v<version>/ segment), which we then fetch once
   server-side and hand back to the client as the raw backup JSON.

   Body:    { username: "pi_username" }
   Returns: the backup JSON payload directly, or 404 if none exists.
   ============================================================ */

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

  const publicId = `lb_backup_${username.toLowerCase()}`;
  const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');

  try {
    const metaRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/raw/upload/${publicId}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    if (metaRes.status === 404) { res.status(404).json({ error: 'Chưa có bản sao lưu' }); return; }
    if (!metaRes.ok) {
      res.status(502).json({ error: `Cloudinary admin lookup failed (${metaRes.status})` });
      return;
    }
    const meta = await metaRes.json();

    // meta.secure_url includes the correct /v<version>/ path segment for
    // this exact upload, so even the delivery CDN can't serve a stale copy.
    const fileRes = await fetch(meta.secure_url);
    if (!fileRes.ok) {
      res.status(502).json({ error: `Could not fetch backup content (${fileRes.status})` });
      return;
    }
    const text = await fileRes.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ error: e.message || 'Restore lookup failed' });
  }
};
