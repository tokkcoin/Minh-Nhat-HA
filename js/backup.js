/* ============================================================
   Life Balance — backup.js  v5
   Saves the full app backup to the app's Cloudinary account as a
   raw JSON file, keyed by the Pi user's UID.

   Save:    /api/cloudinary-sign-backup  →  Cloudinary /raw/upload
   Restore: fetch the public Cloudinary URL  →  write to localStorage
   Auto-save every 5 minutes after first manual save.

   Stored keys:
     lifebalance_cloud_backup_meta  →  { savedAt, publicId, cloudName }
   ============================================================ */

'use strict';

const META_KEY   = 'lifebalance_cloud_backup_meta';
const AUTO_MS    = 5 * 60 * 1000;
let   autoTimer  = null;
let   signCache  = null; // { cloudName, apiKey, timestamp, signature, publicId, username }

// ── 1. localStorage helpers ──────────────────────────────────

function gatherLocalStorage() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('lifebalance_')) data[key] = localStorage.getItem(key);
  }
  return data;
}

function restoreLocalStorage(lsData) {
  if (!lsData || typeof lsData !== 'object') return;
  for (const [key, value] of Object.entries(lsData)) {
    if (key.startsWith('lifebalance_')) localStorage.setItem(key, value);
  }
}

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)); } catch { return null; }
}

function saveMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

// ── 2. Cloudinary helpers ────────────────────────────────────

async function getSignature() {
  const res = await fetch('/api/cloudinary-sign-backup', { method: 'POST' });
  if (res.status === 401) return { notSignedIn: true };
  if (!res.ok) throw new Error(`Sign failed (${res.status})`);
  return await res.json();
}

async function uploadToCloudinary(sign, jsonBlob) {
  const form = new FormData();
  form.append('file',       jsonBlob);
  form.append('public_id',  sign.publicId);
  form.append('api_key',    sign.apiKey);
  form.append('timestamp',  sign.timestamp);
  form.append('signature',  sign.signature);
  form.append('overwrite',  'true');

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/raw/upload`,
    { method: 'POST', body: form }
  );
  if (!uploadRes.ok) throw new Error('Cloudinary upload failed');
  return await uploadRes.json(); // includes secure_url, created_at …
}

function buildBackupBlob(lsData) {
  const payload = JSON.stringify({
    appName:      'life-balance',
    savedAt:      new Date().toISOString(),
    version:      1,
    localStorage: lsData,
  });
  return new Blob([payload], { type: 'application/json' });
}

function backupUrl(meta) {
  // Cloudinary raw file — no auth required to fetch.
  // Cache-buster so CDN always serves the latest overwrite.
  const ts = new Date(meta.savedAt).getTime();
  return `https://res.cloudinary.com/${meta.cloudName}/raw/upload/${meta.publicId}?v=${ts}`;
}

// ── 3. Save ──────────────────────────────────────────────────

async function doSave(showFeedback = true) {
  const sign = await getSignature();
  if (sign.notSignedIn) { showToast('Đăng nhập Pi để lưu dữ liệu'); return; }

  const lsData = gatherLocalStorage();
  const blob   = buildBackupBlob(lsData);

  if (showFeedback) showToast('Đang lưu lên Cloudinary…');
  const result = await uploadToCloudinary(sign, blob);

  const meta = { savedAt: result.created_at || new Date().toISOString(), publicId: sign.publicId, cloudName: sign.cloudName };
  saveMeta(meta);
  setLastSavedText(meta.savedAt);
  if (showFeedback) showToast('✅ Đã lưu dữ liệu lên cloud');
  return meta;
}

// ── 4. Restore ───────────────────────────────────────────────

async function doRestore() {
  // Need publicId + cloudName — from local meta or from the sign endpoint.
  let meta = loadMeta();
  if (!meta) {
    // localStorage wiped — use sign endpoint to derive publicId/cloudName from session
    const sign = await getSignature();
    if (sign.notSignedIn) { showToast('Đăng nhập Pi để khôi phục'); return; }
    meta = { publicId: sign.publicId, cloudName: sign.cloudName, savedAt: null };
  }

  showToast('Đang tải dữ liệu từ cloud…');
  const url = backupUrl(meta);
  const res = await fetch(url);
  if (res.status === 404) { showToast('Chưa có bản lưu trên cloud'); return; }
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);

  const payload = await res.json();
  if (payload.appName !== 'life-balance') { showToast('File không hợp lệ'); return; }

  const lsCount = Object.keys(payload.localStorage || {}).length;
  const confirmed = window.confirm(
    `Khôi phục từ bản lưu ngày ${fmtDate(payload.savedAt)}?\n\n` +
    `${lsCount} mục dữ liệu sẽ được phục hồi.\nDữ liệu hiện tại sẽ bị ghi đè.`
  );
  if (!confirmed) return;

  restoreLocalStorage(payload.localStorage);
  showToast('✅ Đã khôi phục — đang tải lại…');
  setTimeout(() => window.location.reload(), 1200);
}

// ── 5. Auto-save (runs silently in background) ───────────────

function setBtnState(state) {
  // state: 'idle' | 'saving' | 'saved' | 'error'
  const btn = document.getElementById('backup-open-btn');
  if (!btn) return;
  btn.classList.remove('backup-trigger--saving', 'backup-trigger--saved', 'backup-trigger--error');
  if (state !== 'idle') btn.classList.add(`backup-trigger--${state}`);
}

async function autoSaveOnce() {
  setBtnState('saving');
  try {
    await doSave(false);
    setBtnState('saved');
    // Reset to idle after 3 s so the indicator doesn't persist forever
    setTimeout(() => setBtnState('idle'), 3000);
  } catch (e) {
    setBtnState('error');
    setTimeout(() => setBtnState('idle'), 4000);
    console.warn('[backup] auto-save failed', e.message);
  }
}

function startAutoSave() {
  if (autoTimer) return; // already running
  autoTimer = setInterval(autoSaveOnce, AUTO_MS);
  // Save immediately on next hide (user backgrounds app or switches tab)
  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
}

function onVisibilityChange() {
  if (document.hidden) autoSaveOnce();
}

// Called once at boot — checks auth silently, starts auto-save if signed in.
async function initAutoBackup() {
  try {
    const sign = await getSignature();
    if (sign.notSignedIn) return; // not signed in — nothing to do
    signCache = sign;
    startAutoSave();
    // First save: 30 s after page load so data has time to hydrate
    setTimeout(autoSaveOnce, 30_000);
  } catch { /* network error at boot — will retry on next interval */ }
}

// ── 6. UI helpers ────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '?';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function setLastSavedText(iso) {
  const el = document.getElementById('backup-last-saved');
  if (el && iso) el.textContent = `Đã lưu: ${fmtDate(iso)}`;
}

function esc(s) {
  return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
}

// ── 7. Overlay ───────────────────────────────────────────────

function injectOverlay() {
  if (document.getElementById('backup-overlay')) return;
  const el = document.createElement('div');
  el.id = 'backup-overlay';
  el.className = 'backup-overlay';
  el.setAttribute('hidden', '');
  el.innerHTML = `
    <div class="backup-panel">
      <div class="backup-panel__header">
        <h2 class="backup-panel__title">☁️ Lưu dữ liệu</h2>
        <button type="button" id="backup-close-btn" class="backup-panel__close">✕</button>
      </div>
      <div class="backup-panel__body" id="backup-panel-body">
        <p class="backup-status-hint">Đang kiểm tra…</p>
      </div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeOverlay(); });
  document.getElementById('backup-close-btn').addEventListener('click', closeOverlay);
}

function renderSignedIn(username, meta) {
  const body = document.getElementById('backup-panel-body');
  if (!body) return;
  body.innerHTML = `
    <div class="backup-user">
      <span class="backup-user__avatar">π</span>
      <div>
        <span class="backup-user__name">@${esc(username)}</span>
        <span id="backup-last-saved" class="backup-last-saved">${meta ? `Đã lưu: ${fmtDate(meta.savedAt)}` : 'Chưa có bản lưu'}</span>
      </div>
    </div>
    <div class="backup-cloud-actions">
      <button type="button" id="backup-save-btn" class="btn btn-primary backup-cloud-btn">☁️ Lưu lên cloud ngay</button>
      <button type="button" id="backup-restore-btn" class="backup-cloud-btn backup-cloud-btn--outline">⬇️ Khôi phục từ cloud</button>
    </div>
    <p class="backup-auto-note">✅ Tự động lưu mỗi 5 phút &amp; khi thoát app</p>`;

  document.getElementById('backup-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }
    try { await doSave(true); }
    catch (e) { showToast('Lưu thất bại — kiểm tra kết nối'); }
    if (btn) { btn.disabled = false; btn.textContent = '☁️ Lưu lên cloud ngay'; }
  });

  document.getElementById('backup-restore-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-restore-btn');
    if (btn) btn.disabled = true;
    try { await doRestore(); }
    catch (e) { showToast('Khôi phục thất bại — kiểm tra kết nối'); }
    if (btn) btn.disabled = false;
  });
}

function renderNotSignedIn() {
  const body = document.getElementById('backup-panel-body');
  if (!body) return;
  body.innerHTML = `
    <div class="backup-signin-prompt">
      <div class="backup-signin-prompt__icon">π</div>
      <p class="backup-signin-prompt__text">Đăng nhập bằng Pi Network để lưu và đồng bộ dữ liệu lên Cloudinary. Dữ liệu sẽ được giữ nguyên kể cả khi đổi điện thoại hoặc cài lại app.</p>
      <a href="index.html" class="btn btn-primary backup-cloud-btn">Đăng nhập với Pi →</a>
    </div>`;
}

function openOverlay() {
  injectOverlay();
  document.getElementById('backup-overlay')?.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  // Check auth + show appropriate panel
  getSignature().then(sign => {
    if (sign.notSignedIn) { renderNotSignedIn(); return; }
    signCache = sign;
    renderSignedIn(sign.username, loadMeta());
    startAutoSave();
  }).catch(() => {
    const body = document.getElementById('backup-panel-body');
    if (body) body.innerHTML = `<p class="backup-status-hint">Lỗi kết nối — kiểm tra mạng rồi thử lại.</p>`;
  });
}

function closeOverlay() {
  document.getElementById('backup-overlay')?.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

// ── 8. Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  navigator.storage?.persist?.().catch(() => {});
  document.getElementById('backup-open-btn')?.addEventListener('click', openOverlay);
  // Silently start auto-backup if user is already signed in
  initAutoBackup();
});
