/* ============================================================
   Vercel Serverless Function — POST /api/approve-payment
   Server-side step 1 of the Pi U2A payment flow. Calls Pi's
   Payments API with the app's secret key (PI_API_KEY env var —
   set in Vercel project settings, never committed to the repo).
   ============================================================ */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { paymentId } = req.body || {};
  if (!paymentId) {
    res.status(400).json({ error: 'paymentId is required' });
    return;
  }

  if (!process.env.PI_API_KEY) {
    res.status(500).json({ error: 'Server is missing PI_API_KEY' });
    return;
  }

  try {
    const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Key ${process.env.PI_API_KEY}` },
    });

    const data = await piRes.json().catch(() => ({}));
    res.status(piRes.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Pi Platform API', detail: String(err) });
  }
};
