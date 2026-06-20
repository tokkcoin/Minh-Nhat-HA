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

function initPiSdk() {
  const statusEl = document.getElementById('pi-status');
  if (!statusEl) return;

  if (!window.Pi) {
    statusEl.textContent = '⚠️ Not running in Pi Browser';
    return;
  }

  Pi.init({ version: '2.0', sandbox: true });
  statusEl.textContent = '✅ Pi Browser detected (sandbox)';
}
