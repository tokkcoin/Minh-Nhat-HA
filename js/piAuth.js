/* ============================================================
   Life Balance — piAuth.js
   Pi Network "Sign in with Pi" (username scope). Auto-triggers on
   load, via a manual button (#pi-signin-button, index.html only),
   or via backup.js's fallback "sign in again" recovery banner
   (every page — see js/backup.js's showSigninBanner()).
   ============================================================ */

'use strict';

// ── 1. Status helper ─────────────────────────────────────────

function setAuthStatus(message) {
  const el = document.getElementById('auth-status');
  if (el) el.textContent = message;
}

// ── 2. Incomplete-payment handler (required by Pi.authenticate) ──

function onIncompletePaymentFound(payment) {
  console.warn('Incomplete payment found during auth:', payment);
}

// ── 3. Sign-in flow ───────────────────────────────────────────

async function signInWithPi() {
  if (!window.Pi) {
    showToast('Open this app inside Pi Browser to sign in');
    return;
  }

  const signInBtn = document.getElementById('pi-signin-button');

  try {
    setAuthStatus('Connecting to Pi Browser…');
    const ready = await initPiSdk(); // awaits Pi.init() fully before authenticating
    if (!ready) return;

    setAuthStatus('Authenticating…');
    const authResult = await Pi.authenticate(['username'], onIncompletePaymentFound);

    setAuthStatus('Verifying with server…');
    const res = await fetch('/api/verify-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: authResult.accessToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server rejected token (${res.status})`);
    }

    const { user } = await res.json();
    setAuthStatus(`Signed in as @${user.username}`);
    showToast(`Signed in as @${user.username}`);

    if (signInBtn) {
      signInBtn.textContent = `@${user.username}`;
      signInBtn.disabled = true;
    }

    // Notify backup.js so it can start auto-save + auto-restore
    window.dispatchEvent(new CustomEvent('piauth:success', { detail: { username: user.username } }));
  } catch (err) {
    setAuthStatus(`Sign-in failed: ${err.message || err}`);
  }
}

// ── 4. Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pi-signin-button')?.addEventListener('click', signInWithPi);

  const cached = localStorage.getItem('lifebalance_pi_username');
  if (cached) {
    // Returning user: surface name instantly from localStorage — no round-trip to Pi SDK.
    // The 30-day session cookie issued by verify-auth covers subsequent API calls.
    setAuthStatus(`Đã đăng nhập @${cached}`);
    const btn = document.getElementById('pi-signin-button');
    if (btn) { btn.textContent = `@${cached}`; btn.disabled = true; }
    window.dispatchEvent(new CustomEvent('piauth:success', { detail: { username: cached } }));
  } else {
    // First time on this device: full Pi authentication flow.
    signInWithPi();
  }
});
