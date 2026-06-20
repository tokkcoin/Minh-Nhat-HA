/* ============================================================
   Life Balance — common.js
   Shared helpers loaded on every page (toast, Pi SDK init)
   ============================================================ */

'use strict';

// ── 1. Toast ──────────────────────────────────────────────────

function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── 2. Pi SDK Init ────────────────────────────────────────────
// Returns a Promise<boolean> (true once Pi.init() has resolved).
// Memoized so concurrent callers (e.g. main.js and piAuth.js on the
// same page) await the same init instead of calling Pi.init() twice.

let piInitPromise = null;

async function initPiSdk() {
  const statusEl = document.getElementById('pi-status');

  if (!window.Pi) {
    if (statusEl) statusEl.textContent = '⚠️ Not running in Pi Browser';
    return false;
  }

  if (!piInitPromise) {
    piInitPromise = Promise.resolve(Pi.init({ version: '2.0', sandbox: true }));
  }
  await piInitPromise;

  if (statusEl) statusEl.textContent = '✅ Pi Browser detected (sandbox)';
  return true;
}
