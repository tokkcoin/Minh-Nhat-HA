/* ============================================================
   Life Balance — backupSync.js  v14
   (renamed from backup.js — same file, forced a fresh URL because some
   Pi Browser installs were stuck serving a stale cached backup.js no
   matter how the ?v= cache-bust query param was bumped)

   Backup key = Pi username (stored in localStorage once confirmed).
   No Pi Auth session dependency — works for every user.
   Fully automatic — no manual save/restore UI. Username is only
   ever captured from the Pi Auth login event (piauth:success).

     • 10 s after page load → first save
     • Every 5 minutes → save
     • Any lifebalance_ localStorage write → save 3 s later (debounced)
     • App hidden / exit → save immediately
     • App opened with empty data + saved username → auto-restore
   ============================================================ */

'use strict';

const USERNAME_KEY = 'lifebalance_pi_username';
const META_KEY     = 'lifebalance_cloud_backup_meta';
const AUTO_MS      = 5 * 60 * 1000;
let   autoTimer         = null;
let   isSaving          = false;
let   saveDebounceTimer = null;
let   firstSaveDone     = false; // show toast on first auto-save so user knows it's working

// ── 1. Username helpers ──────────────────────────────────────

function getUsername()      { return localStorage.getItem(USERNAME_KEY) || ''; }
function setUsername(name)  { localStorage.setItem(USERNAME_KEY, name.trim()); }

// ── 2. localStorage helpers ──────────────────────────────────

function gatherLocalStorage() {
  const d = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('lifebalance_')) d[k] = localStorage.getItem(k);
  }
  return d;
}
function restoreLocalStorage(data) {
  for (const [k, v] of Object.entries(data || {}))
    if (k.startsWith('lifebalance_')) localStorage.setItem(k, v);
}
function hasLocalData() {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('lifebalance_') && k !== META_KEY && k !== USERNAME_KEY) return true;
  }
  return false;
}
function saveMeta(m)  { localStorage.setItem(META_KEY, JSON.stringify(m)); }

// ── 3. Cloudinary helpers ────────────────────────────────────

async function getSign(username) {
  // keepalive: this request often fires from the visibilitychange "app is
  // being backgrounded/closed" handler — without it, the mobile OS can
  // suspend the page mid-request and silently drop the save.
  const res = await fetch('/api/cloudinary-sign-backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
    keepalive: true,
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `Server ${res.status}`);
  }
  return res.json();
}

function cloudUrl(cloudName, publicId) {
  return `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}?v=${Date.now()}`;
}

// ── 4. Save ──────────────────────────────────────────────────

async function doSave(feedback = false) {
  const username = getUsername();
  if (!username) return; // username not set yet
  if (isSaving) return;
  isSaving = true;
  try {
    const sign = await getSign(username);
    const blob = new Blob([JSON.stringify({
      appName: 'life-balance', version: 1,
      savedAt: new Date().toISOString(),
      username,
      localStorage: gatherLocalStorage(),
    })], { type: 'application/json' });

    const form = new FormData();
    form.append('file',      blob);
    form.append('public_id', sign.publicId);
    form.append('api_key',   sign.apiKey);
    form.append('timestamp', sign.timestamp);
    form.append('signature', sign.signature);
    form.append('overwrite', 'true');

    // Same reasoning as getSign() above — keep this alive past a page
    // suspension. The backup payload is plain JSON (no embedded media,
    // those live on Cloudinary already as URLs), so it comfortably fits
    // under the browser's keepalive request-size cap.
    const up = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/raw/upload`, { method: 'POST', body: form, keepalive: true });
    if (!up.ok) throw new Error('Cloudinary upload failed');
    const result = await up.json();

    saveMeta({ savedAt: result.created_at || new Date().toISOString(), publicId: sign.publicId, cloudName: sign.cloudName });
    if (!firstSaveDone) {
      firstSaveDone = true;
      showToast('☁️ Đã lưu dữ liệu tự động');
    }
    if (feedback) showToast('✅ Đã lưu dữ liệu lên cloud');
  } catch (e) {
    showToast(`⚠️ Lưu thất bại: ${e.message}`);
    console.warn('[backup] save:', e.message);
  } finally { isSaving = false; }
}

// ── 5. Auto-restore on startup ───────────────────────────────

// Full-screen cover that hides the empty page while we check/fetch the backup.
// Injected before any content is visible so there's no empty-state flash.
function showRestoreScreen(msg) {
  if (document.getElementById('backup-restore-screen')) return;
  const el = document.createElement('div');
  el.id = 'backup-restore-screen';
  el.className = 'backup-restore-screen';
  el.innerHTML = `
    <div class="backup-restore-screen__inner">
      <div class="backup-restore-screen__spinner"></div>
      <p class="backup-restore-screen__msg">${msg}</p>
    </div>`;
  document.body.appendChild(el);
}

function hideRestoreScreen() {
  const el = document.getElementById('backup-restore-screen');
  if (!el) return;
  el.classList.add('backup-restore-screen--done');
  setTimeout(() => el.remove(), 300);
}

async function tryAutoRestore() {
  if (hasLocalData()) return;
  // Consume the just-restored guard: survives exactly the one reload it was
  // set for, then clears itself so a later, unrelated empty-storage event
  // can still trigger a normal restore attempt.
  if (sessionStorage.getItem('lb_just_restored')) {
    sessionStorage.removeItem('lb_just_restored');
    return;
  }
  const username = getUsername();
  if (!username) return;

  // Hard cap regardless of the guards above — never loop more than twice in
  // one tab session, no matter what edge case might otherwise cause a repeat.
  const attempts = Number(sessionStorage.getItem('lb_restore_attempts') || '0');
  if (attempts >= 2) {
    console.warn('[backup] restore attempt cap reached, giving up for this session');
    return;
  }
  sessionStorage.setItem('lb_restore_attempts', String(attempts + 1));

  // Cover the empty page immediately — no flash
  showRestoreScreen('Đang khôi phục dữ liệu…');
  try {
    const sign = await getSign(username);
    const res  = await fetch(cloudUrl(sign.cloudName, sign.publicId));
    if (res.status === 404) { hideRestoreScreen(); return; } // no backup yet — normal for a brand-new account
    if (!res.ok) {
      hideRestoreScreen();
      showToast(`⚠️ Không tải được bản sao lưu (lỗi ${res.status})`);
      return;
    }
    const payload = await res.json();
    if (payload.appName !== 'life-balance') {
      hideRestoreScreen();
      showToast('⚠️ Bản sao lưu không đúng định dạng');
      return;
    }
    restoreLocalStorage(payload.localStorage);
    if (!hasLocalData()) {
      // The backup exists but carries no usable lifebalance_ data — reloading
      // would just repeat this exact same "empty backup" cycle forever.
      hideRestoreScreen();
      return;
    }
    saveMeta({ savedAt: payload.savedAt, publicId: sign.publicId, cloudName: sign.cloudName });
    // Mark so the page after reload skips the restore check
    sessionStorage.setItem('lb_just_restored', '1');
    window.location.reload(); // reload immediately — screen covers the transition
  } catch (e) {
    hideRestoreScreen();
    showToast(`⚠️ Khôi phục thất bại: ${e.message}`);
    console.warn('[backup] restore:', e.message);
  }
}

// ── 5b. Manual sign-in recovery banner ────────────────────────
// Shown whenever this page has no username to restore/save with —
// e.g. Pi Browser wiped localStorage and piAuth.js's silent
// auto-sign-in (no user gesture) didn't go through. Gives the user
// an explicit, always-available way to trigger a real sign-in tap.

function showSigninBanner() {
  if (document.getElementById('backup-signin-banner')) return;
  const el = document.createElement('button');
  el.id = 'backup-signin-banner';
  el.type = 'button';
  el.className = 'backup-signin-banner';
  el.textContent = '🔑 Đăng nhập lại để khôi phục dữ liệu đã lưu';
  el.addEventListener('click', () => {
    if (typeof signInWithPi !== 'function') {
      showToast('Mở app trong Pi Browser để đăng nhập lại');
      return;
    }
    el.disabled = true;
    el.textContent = 'Đang đăng nhập…';
    signInWithPi().finally(() => {
      el.disabled = false;
      el.textContent = '🔑 Đăng nhập lại để khôi phục dữ liệu đã lưu';
    });
  });
  document.body.appendChild(el);
}

function hideSigninBanner() {
  document.getElementById('backup-signin-banner')?.remove();
}

// ── 5c. TEMP debug badge ───────────────────────────────────────
// Tiny always-visible status line to diagnose the "data missing after
// reopening Pi Browser" report — shows whether this version of the
// script is even running, whether a username is present, and whether
// there's local data. Remove once the root cause is confirmed.

function showDebugBadge() {
  const el = document.createElement('div');
  el.id = 'backup-debug-badge';
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;'
    + 'background:#000;color:#0f0;font:11px monospace;padding:3px 6px;'
    + 'text-align:center;pointer-events:none;opacity:.85;';
  const u = getUsername();
  const attempts = sessionStorage.getItem('lb_restore_attempts') || '0';
  el.textContent = `dbg v14 · user:${u || 'NONE'} · local:${hasLocalData() ? 'yes' : 'no'} · meta:${localStorage.getItem(META_KEY) ? 'yes' : 'no'} · tries:${attempts}`;
  document.body.prepend(el);
}

// ── 6. Auto-save timer ───────────────────────────────────────

function startAutoSave() {
  if (autoTimer) return;
  autoTimer = setInterval(() => doSave(false), AUTO_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) doSave(false);
  }, { passive: true });
}

// Capture username from Pi Auth event (fired by piAuth.js after login)
window.addEventListener('piauth:success', async e => {
  const name = e.detail?.username;
  const isFirstLogin = name && !getUsername();
  hideSigninBanner();

  if (isFirstLogin) {
    setUsername(name);
    // New device: restore cloud data BEFORE saving anything.
    // doSave() with empty localStorage would overwrite the user's real data.
    // tryAutoRestore() reloads the page when it finds a backup; after reload
    // DOMContentLoaded will start auto-save normally.
    await tryAutoRestore();
    // Reaches here only if no cloud backup was found (brand-new user).
    setTimeout(() => doSave(false), 10_000);
    startAutoSave();
  } else {
    // Returning user on the same device: data already present, just save.
    doSave(false);
    startAutoSave();
  }
});

// ── 7. Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  navigator.storage?.persist?.().catch(() => {});

  // Reactive save: intercept every localStorage write that touches lifebalance_ data.
  // Schedule a cloud save 3 s after the last change so quick bursts merge into one upload.
  // This ensures data is never lost even if the user exits before the 5-min timer fires.
  const _origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function reactiveSetItem(key, value) {
    _origSetItem(key, value);
    if (key.startsWith('lifebalance_') && key !== META_KEY && key !== USERNAME_KEY && getUsername()) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(() => doSave(false), 3_000);
    }
  };

  showDebugBadge();

  const username = getUsername();
  if (username) {
    await tryAutoRestore(); // covers screen if needed; returns fast if data exists
    setTimeout(() => doSave(false), 10_000);
    startAutoSave();
  } else {
    // No username on this page yet. piAuth.js's silent auto-sign-in may still
    // succeed and fire piauth:success shortly (hides this banner) — but if it
    // needs a real user gesture to complete, this is the fallback so the user
    // isn't stuck looking at an empty page with no way to recover their data.
    showSigninBanner();
  }
});
