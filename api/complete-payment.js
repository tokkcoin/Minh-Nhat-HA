/* ============================================================
   Vercel Serverless Function — POST /api/complete-payment
   Server-side step 2 of the Pi U2A payment flow. Calls Pi's
   Payments API with the app's secret key (PI_API_KEY env var —
   set in Vercel project settings, never committed to the repo).
   ============================================================ */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { paymentId, txid } = req.body || {};
  if (!paymentId || !txid) {
    res.status(400).json({ error: 'paymentId and txid are required' });
    return;
  }

  if (!process.env.PI_API_KEY) {
    res.status(500).json({ error: 'Server is missing PI_API_KEY' });
    return;
  }

  try {
    const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.PI_API_KEY}`,
      },
      body: JSON.stringify({ txid }),
    });

    const data = await piRes.json().catch(() => ({}));
    res.status(piRes.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Pi Platform API', detail: String(err) });
  }
};
