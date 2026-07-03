/* ============================================================
   Life Balance — backup.js  v10

   Backup key = Pi username (stored in localStorage once confirmed).
   No Pi Auth session dependency — works for every user.

   Setup (once only):
     Pi Auth succeeds → username auto-captured.
     OR user types username in the 💾 panel → saved.

   After setup, fully automatic:
     • 10 s after page load → first save
     • Every 5 minutes → save
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
function loadMeta()   { try { return JSON.parse(localStorage.getItem(META_KEY)); } catch { return null; } }
function saveMeta(m)  { localStorage.setItem(META_KEY, JSON.stringify(m)); }

// ── 3. Cloudinary helpers ────────────────────────────────────

async function getSign(username) {
  const res = await fetch('/api/cloudinary-sign-backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
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
  setBtnState('saving');
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

    const up = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/raw/upload`, { method: 'POST', body: form });
    if (!up.ok) throw new Error('Cloudinary upload failed');
    const result = await up.json();

    saveMeta({ savedAt: result.created_at || new Date().toISOString(), publicId: sign.publicId, cloudName: sign.cloudName });
    setLastSavedText(loadMeta()?.savedAt);
    setBtnState('saved');
    setTimeout(() => setBtnState('idle'), 3000);
    if (feedback) showToast('✅ Đã lưu dữ liệu lên cloud');
  } catch (e) {
    setBtnState('error');
    setTimeout(() => setBtnState('idle'), 4000);
    showToast(`⚠️ Lưu thất bại: ${e.message}`);
    console.warn('[backup] save:', e.message);
  } finally { isSaving = false; }
}

// ── 5. Restore ───────────────────────────────────────────────

async function doRestore(confirm = true) {
  const username = getUsername();
  if (!username) return;
  try {
    const sign = await getSign(username);
    const res  = await fetch(cloudUrl(sign.cloudName, sign.publicId));
    if (!res.ok) { showToast('Chưa có bản lưu trên cloud'); return; }
    const payload = await res.json();
    if (payload.appName !== 'life-balance') { showToast('File không đúng định dạng'); return; }
    if (confirm) {
      const n = Object.keys(payload.localStorage || {}).length;
      if (!window.confirm(`Khôi phục từ bản lưu ${fmtDate(payload.savedAt)}?\n${n} mục · Dữ liệu hiện tại sẽ bị ghi đè.`)) return;
    }
    restoreLocalStorage(payload.localStorage);
    saveMeta({ savedAt: payload.savedAt, publicId: sign.publicId, cloudName: sign.cloudName });
    showToast(`✅ Đã khôi phục dữ liệu của @${username}`);
    setTimeout(() => window.location.reload(), 1000);
  } catch (e) {
    showToast(`Khôi phục thất bại: ${e.message}`);
  }
}

// ── 6. Auto-restore on startup ───────────────────────────────

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
  if (sessionStorage.getItem('lb_just_restored')) return; // avoid loop after reload
  const username = getUsername();
  if (!username) return;

  // Cover the empty page immediately — no flash
  showRestoreScreen('Đang khôi phục dữ liệu…');
  try {
    const sign = await getSign(username);
    const res  = await fetch(cloudUrl(sign.cloudName, sign.publicId));
    if (!res.ok) { hideRestoreScreen(); return; }
    const payload = await res.json();
    if (payload.appName !== 'life-balance') { hideRestoreScreen(); return; }
    restoreLocalStorage(payload.localStorage);
    saveMeta({ savedAt: payload.savedAt, publicId: sign.publicId, cloudName: sign.cloudName });
    // Mark so the page after reload skips the restore check
    sessionStorage.setItem('lb_just_restored', '1');
    window.location.reload(); // reload immediately — screen covers the transition
  } catch {
    hideRestoreScreen(); // no backup or network error — show page normally
  }
}

// ── 7. Auto-save timer ───────────────────────────────────────

function setBtnState(state) {
  const btn = document.getElementById('backup-open-btn');
  if (!btn) return;
  btn.classList.remove('backup-trigger--saving', 'backup-trigger--saved', 'backup-trigger--error');
  if (state !== 'idle') btn.classList.add(`backup-trigger--${state}`);
}

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

  if (isFirstLogin) {
    setUsername(name);
    renderPanel();
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

// ── 8. UI ────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '?';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
function setLastSavedText(iso) {
  const el = document.getElementById('backup-last-saved');
  if (el && iso) el.textContent = `Đã lưu: ${fmtDate(iso)}`;
}
function esc(s) { return String(s).replace(/[<>&"]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }

function injectOverlay() {
  if (document.getElementById('backup-overlay')) return;
  const el = document.createElement('div');
  el.id = 'backup-overlay'; el.className = 'backup-overlay'; el.setAttribute('hidden', '');
  el.innerHTML = `
    <div class="backup-panel">
      <div class="backup-panel__header">
        <h2 class="backup-panel__title">☁️ Lưu dữ liệu</h2>
        <button type="button" id="backup-close-btn" class="backup-panel__close">✕</button>
      </div>
      <div class="backup-panel__body" id="backup-panel-body"></div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeOverlay(); });
  document.getElementById('backup-close-btn').addEventListener('click', closeOverlay);
}

function renderPanel() {
  const body = document.getElementById('backup-panel-body');
  if (!body) return;
  const username = getUsername();
  const meta     = loadMeta();

  if (!username) {
    // First time — ask for Pi username
    body.innerHTML = `
      <div class="backup-signin-prompt">
        <div class="backup-signin-prompt__icon">💾</div>
        <p class="backup-signin-prompt__text">Nhập tên đăng nhập Pi Network của bạn để bật tính năng tự động lưu dữ liệu.</p>
        <input type="text" id="backup-username-input" class="backup-username-input"
               placeholder="Tên Pi của bạn (vd: john_doe)" autocapitalize="none" />
        <button type="button" id="backup-username-save" class="btn btn-primary backup-cloud-btn" style="margin-top:10px">
          Bắt đầu lưu tự động
        </button>
      </div>`;
    document.getElementById('backup-username-save').addEventListener('click', () => {
      const input = document.getElementById('backup-username-input');
      const name  = input?.value.trim();
      if (!name || !/^[a-zA-Z0-9_]{1,50}$/.test(name)) {
        showToast('Tên không hợp lệ — chỉ dùng chữ, số và gạch dưới');
        return;
      }
      setUsername(name);
      doSave(true);
      startAutoSave();
      renderPanel(); // re-render with username shown
    });
    return;
  }

  // Username set — show status panel
  body.innerHTML = `
    <div class="backup-user">
      <span class="backup-user__avatar">π</span>
      <div>
        <span class="backup-user__name">@${esc(username)}</span>
        <span id="backup-last-saved" class="backup-last-saved">${meta ? `Đã lưu: ${fmtDate(meta.savedAt)}` : 'Chưa lưu lần nào'}</span>
      </div>
    </div>
    <div class="backup-cloud-actions">
      <button type="button" id="backup-save-btn" class="btn btn-primary backup-cloud-btn">☁️ Lưu lên cloud ngay</button>
      <button type="button" id="backup-restore-btn" class="backup-cloud-btn backup-cloud-btn--outline">⬇️ Khôi phục từ cloud</button>
    </div>
    <p class="backup-auto-note">✅ Tự động lưu mỗi 5 phút &amp; khi thoát app</p>
    <button type="button" id="backup-change-user" class="backup-change-user">Đổi tên người dùng</button>`;

  document.getElementById('backup-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-save-btn');
    btn.disabled = true; btn.textContent = 'Đang lưu…';
    await doSave(true);
    btn.disabled = false; btn.textContent = '☁️ Lưu lên cloud ngay';
  });
  document.getElementById('backup-restore-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-restore-btn');
    btn.disabled = true;
    await doRestore(true);
    btn.disabled = false;
  });
  document.getElementById('backup-change-user').addEventListener('click', () => {
    if (window.confirm('Đổi tên người dùng sẽ xoá liên kết với bản lưu hiện tại. Tiếp tục?')) {
      localStorage.removeItem(USERNAME_KEY);
      localStorage.removeItem(META_KEY);
      renderPanel();
    }
  });
}

function openOverlay() {
  injectOverlay();
  document.getElementById('backup-overlay')?.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  renderPanel();
}
function closeOverlay() {
  document.getElementById('backup-overlay')?.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

// ── 9. Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  navigator.storage?.persist?.().catch(() => {});
  document.getElementById('backup-open-btn')?.addEventListener('click', openOverlay);

  // Clear the "just restored" guard so future empty-storage scenarios
  // are detected and restored normally (only skip the check once per reload).
  sessionStorage.removeItem('lb_just_restored');

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

  const username = getUsername();
  if (username) {
    await tryAutoRestore(); // covers screen if needed; returns fast if data exists
    setTimeout(() => doSave(false), 10_000);
    startAutoSave();
  }
  // If no username yet: piauth:success event will set it when Pi Auth completes
});
