/* ============================================================
   Life Balance — piPayment.js
   Drives a single U2A (User-to-App) test payment, to satisfy the
   Pi Developer Portal's "Process a Transaction on the App" step.
   Real Pi, Mainnet — see pi-test-payment.html for the warning banner.
   ============================================================ */

'use strict';

const PAYMENT_AMOUNT = 0.01;

function setStatus(message) {
  const statusEl = document.getElementById('payment-status');
  if (statusEl) statusEl.textContent = message;
}

async function approvePaymentOnServer(paymentId) {
  setStatus(`Approving payment ${paymentId}…`);
  const res = await fetch('/api/approve-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId }),
  });
  if (!res.ok) throw new Error(`Approve failed (${res.status})`);
}

async function completePaymentOnServer(paymentId, txid) {
  setStatus(`Completing payment ${paymentId}…`);
  const res = await fetch('/api/complete-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, txid }),
  });
  if (!res.ok) throw new Error(`Complete failed (${res.status})`);
}

function onIncompletePaymentFound(payment) {
  setStatus(`Found an incomplete payment from a previous attempt (${payment.identifier}).`);
  if (payment?.transaction?.txid) {
    completePaymentOnServer(payment.identifier, payment.transaction.txid)
      .then(() => setStatus('Previous incomplete payment completed.'))
      .catch(err => setStatus(`Could not auto-complete previous payment: ${err.message}`));
  }
}

function startTestPayment() {
  if (!window.Pi) {
    showToast('Open this page inside Pi Browser to pay');
    return;
  }

  setStatus('Authenticating…');
  Pi.authenticate(['payments', 'username'], onIncompletePaymentFound)
    .then(() => {
      setStatus('Creating payment…');
      return Pi.createPayment(
        {
          amount: PAYMENT_AMOUNT,
          memo: 'Life Balance — setup verification payment',
          metadata: { type: 'setup-test' },
        },
        {
          onReadyForServerApproval: paymentId => {
            approvePaymentOnServer(paymentId).catch(err => setStatus(`Approve error: ${err.message}`));
          },
          onReadyForServerCompletion: (paymentId, txid) => {
            completePaymentOnServer(paymentId, txid)
              .then(() => {
                setStatus(`Done — payment completed (txid: ${txid}).`);
                showToast('Payment completed!');
              })
              .catch(err => setStatus(`Complete error: ${err.message}`));
          },
          onCancel: paymentId => {
            setStatus(`Payment ${paymentId} was cancelled.`);
          },
          onError: (error, payment) => {
            setStatus(`Payment error: ${error.message || error}`);
          },
        }
      );
    })
    .catch(err => setStatus(`Authentication failed: ${err.message || err}`));
}

document.addEventListener('DOMContentLoaded', () => {
  initPiSdk();

  const button = document.getElementById('pay-button');
  button?.addEventListener('click', startTestPayment);

  if (!window.Pi) {
    setStatus('Not running inside Pi Browser — open this page there to pay.');
    if (button) button.disabled = true;
  }
});
