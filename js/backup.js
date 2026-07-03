/* ============================================================
   Life Balance — backup.js  v9
   Automatic cloud backup/restore tied to Pi Network username.
   No UUID, no cookies — identity comes from Pi Auth.

   On every Pi sign-in (auto on page load):
     1. Check Cloudinary for a backup matching this username.
     2. If local data is empty → auto-restore silently.
     3. If local data exists → just start auto-save.

   Auto-save triggers (all silent):
     • Immediately after Pi sign-in completes
     • Every 5 minutes
     • When user exits / backgrounds the app (visibilitychange)
   ============================================================ */

'use strict';

const META_KEY  = 'lifebalance_cloud_backup_meta';
const AUTO_MS   = 5 * 60 * 1000;
let   autoTimer = null;
let   isSaving  = false;

// ── 1. localStorage helpers ──────────────────────────────────

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
    if (k?.startsWith('lifebalance_') && k !== META_KEY) return true;
  }
  return false;
}

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)); } catch { return null; }
}
function saveMeta(m) { localStorage.setItem(META_KEY, JSON.stringify(m)); }

// ── 2. Cloudinary sign ───────────────────────────────────────

async function getSign() {
  const res = await fetch('/api/cloudinary-sign-backup', { method: 'POST' });
  if (res.status === 401) return null; // not signed in
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json(); // { cloudName, apiKey, timestamp, signature, publicId, username }
}

// ── 3. Save ──────────────────────────────────────────────────

async function doSave(feedback = false) {
  if (isSaving) return;
  isSaving = true;
  setBtnState('saving');
  try {
    const sign = await getSign();
    if (!sign) { setBtnState('idle'); return; } // not signed in

    const blob = new Blob([JSON.stringify({
      appName: 'life-balance', version: 1,
      savedAt: new Date().toISOString(),
      username: sign.username,
      localStorage: gatherLocalStorage(),
    })], { type: 'application/json' });

    const form = new FormData();
    form.append('file', blob);
    form.append('public_id', sign.publicId);
    form.append('api_key',   sign.apiKey);
    form.append('timestamp', sign.timestamp);
    form.append('signature', sign.signature);
    form.append('overwrite', 'true');

    const up = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/raw/upload`, { method: 'POST', body: form });
    if (!up.ok) throw new Error('Upload failed');
    const result = await up.json();

    const meta = { savedAt: result.created_at || new Date().toISOString(), publicId: sign.publicId, cloudName: sign.cloudName };
    saveMeta(meta);
    setLastSavedText(meta.savedAt);
    setBtnState('saved');
    setTimeout(() => setBtnState('idle'), 3000);
    if (feedback) showToast('✅ Đã lưu dữ liệu lên cloud');
  } catch (e) {
    setBtnState('error');
    setTimeout(() => setBtnState('idle'), 4000);
    if (feedback) showToast('Lưu thất bại — kiểm tra kết nối');
    console.warn('[backup] save:', e.message);
  } finally { isSaving = false; }
}

// ── 4. Auto-restore after sign-in ────────────────────────────

async function tryAutoRestore(sign) {
  if (hasLocalData()) return; // already have data — don't overwrite
  const meta = loadMeta() || { publicId: sign.publicId, cloudName: sign.cloudName };
  const ts   = meta.savedAt ? new Date(meta.savedAt).getTime() : Date.now();
  try {
    const res = await fetch(`https://res.cloudinary.com/${meta.cloudName}/raw/upload/${meta.publicId}?v=${ts}`);
    if (!res.ok) return; // no backup yet or error
    const payload = await res.json();
    if (payload.appName !== 'life-balance') return;
    restoreLocalStorage(payload.localStorage);
    saveMeta({ savedAt: payload.savedAt, publicId: sign.publicId, cloudName: sign.cloudName });
    showToast(`✅ Đã khôi phục dữ liệu của @${payload.username || sign.username}`);
    setTimeout(() => window.location.reload(), 1000);
  } catch { /* no backup or network error — ignore */ }
}

// ── 5. Auto-save timer ───────────────────────────────────────

function startAutoSave() {
  if (autoTimer) return;
  autoTimer = setInterval(() => doSave(false), AUTO_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) doSave(false);
  }, { passive: true });
}

// Called after Pi Auth succeeds (either on this load or from piAuth.js event)
async function onSignedIn() {
  const sign = await getSign().catch(() => null);
  if (!sign) return;
  await tryAutoRestore(sign);  // restore if local data is empty
  doSave(false);               // save current state immediately
  startAutoSave();             // start ongoing auto-save
}

// ── 6. UI helpers ────────────────────────────────────────────

function setBtnState(state) {
  const btn = document.getElementById('backup-open-btn');
  if (!btn) return;
  btn.classList.remove('backup-trigger--saving', 'backup-trigger--saved', 'backup-trigger--error');
  if (state !== 'idle') btn.classList.add(`backup-trigger--${state}`);
}
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

// ── 7. Overlay ───────────────────────────────────────────────

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
      <div class="backup-panel__body" id="backup-panel-body">
        <p class="backup-status-hint">Đang kiểm tra đăng nhập…</p>
      </div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeOverlay(); });
  document.getElementById('backup-close-btn').addEventListener('click', closeOverlay);
}

async function renderPanel() {
  const body = document.getElementById('backup-panel-body');
  if (!body) return;
  const sign = await getSign().catch(() => null);
  const meta = loadMeta();

  if (!sign) {
    body.innerHTML = `
      <div class="backup-signin-prompt">
        <div class="backup-signin-prompt__icon">π</div>
        <p class="backup-signin-prompt__text">Đăng nhập bằng Pi Network để tự động lưu và khôi phục dữ liệu.</p>
        <a href="index.html" class="btn btn-primary backup-cloud-btn">Đăng nhập với Pi →</a>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="backup-user">
      <span class="backup-user__avatar">π</span>
      <div>
        <span class="backup-user__name">@${esc(sign.username)}</span>
        <span id="backup-last-saved" class="backup-last-saved">${meta ? `Đã lưu: ${fmtDate(meta.savedAt)}` : 'Chưa lưu lần nào'}</span>
      </div>
    </div>
    <div class="backup-cloud-actions">
      <button type="button" id="backup-save-btn" class="btn btn-primary backup-cloud-btn">☁️ Lưu lên cloud ngay</button>
      <button type="button" id="backup-restore-btn" class="backup-cloud-btn backup-cloud-btn--outline">⬇️ Khôi phục từ cloud</button>
    </div>
    <p class="backup-auto-note">✅ Tự động lưu mỗi 5 phút &amp; khi thoát app</p>`;

  document.getElementById('backup-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-save-btn');
    btn.disabled = true; btn.textContent = 'Đang lưu…';
    await doSave(true);
    btn.disabled = false; btn.textContent = '☁️ Lưu lên cloud ngay';
  });
  document.getElementById('backup-restore-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-restore-btn');
    btn.disabled = true;
    // Force restore even if local data exists
    const sign2 = await getSign().catch(() => null);
    if (!sign2) { showToast('Không thể xác thực — thử lại'); btn.disabled = false; return; }
    const m = meta || { publicId: sign2.publicId, cloudName: sign2.cloudName };
    const ts = m.savedAt ? new Date(m.savedAt).getTime() : Date.now();
    try {
      const res = await fetch(`https://res.cloudinary.com/${m.cloudName}/raw/upload/${m.publicId}?v=${ts}`);
      if (res.status === 404) { showToast('Chưa có bản lưu trên cloud'); btn.disabled = false; return; }
      const payload = await res.json();
      if (!window.confirm(`Khôi phục từ bản lưu ${fmtDate(payload.savedAt)}?\nDữ liệu hiện tại sẽ bị ghi đè.`)) { btn.disabled = false; return; }
      restoreLocalStorage(payload.localStorage);
      showToast('✅ Đã khôi phục — đang tải lại…');
      setTimeout(() => window.location.reload(), 1200);
    } catch { showToast('Khôi phục thất bại'); btn.disabled = false; }
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

// ── 8. Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  navigator.storage?.persist?.().catch(() => {});
  document.getElementById('backup-open-btn')?.addEventListener('click', openOverlay);

  // Listen for Pi sign-in completing on this page (index.html has piAuth.js)
  window.addEventListener('piauth:success', () => onSignedIn(), { once: false });

  // Also check immediately in case the lb_session cookie already exists
  // (user returning to a secondary page after having signed in on index.html)
  const sign = await getSign().catch(() => null);
  if (sign) onSignedIn();
});
