/* ============================================================
   Life Balance — backup.js  v7
   Auto-saves all app data to Cloudinary as a raw JSON file.
   Works for every user — no Pi authentication required.

   Each device generates a UUID on first use (lifebalance_device_id).
   Cloudinary public_id = lb_backup_{uuid-without-dashes}
   The UUID is the user's "backup key" — shown in the panel so they
   can note it down in case localStorage is ever wiped.

   Save:    /api/cloudinary-sign-backup  →  Cloudinary /raw/upload
   Restore: fetch public Cloudinary URL  →  write to localStorage

   Auto-save triggers (all silent, no user action needed):
     • 30 seconds after page load
     • Every 5 minutes
     • When the app is hidden / user switches away (visibilitychange)
   ============================================================ */

'use strict';

const DEVICE_ID_KEY = 'lifebalance_device_id';
const META_KEY      = 'lifebalance_cloud_backup_meta';
const AUTO_MS       = 5 * 60 * 1000;
let   autoTimer     = null;
let   isSaving      = false; // debounce concurrent saves

// ── 1. Device ID ──────────────────────────────────────────────

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // crypto.randomUUID available in Chromium 92+ (Pi Browser is Chromium-based)
    id = crypto.randomUUID?.() ?? fallbackUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function fallbackUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── 2. localStorage helpers ──────────────────────────────────

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

function saveMeta(meta) { localStorage.setItem(META_KEY, JSON.stringify(meta)); }

// ── 3. Cloudinary helpers ────────────────────────────────────

async function getSignature(deviceId) {
  const res = await fetch('/api/cloudinary-sign-backup', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ deviceId }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `Server error ${res.status}`);
  }
  return res.json(); // { cloudName, apiKey, timestamp, signature, publicId }
}

async function uploadToCloudinary(sign, blob) {
  const form = new FormData();
  form.append('file',      blob);
  form.append('public_id', sign.publicId);
  form.append('api_key',   sign.apiKey);
  form.append('timestamp', sign.timestamp);
  form.append('signature', sign.signature);
  form.append('overwrite', 'true');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/raw/upload`, {
    method: 'POST', body: form,
  });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  return res.json();
}

function backupUrl(meta) {
  const ts = meta.savedAt ? new Date(meta.savedAt).getTime() : Date.now();
  return `https://res.cloudinary.com/${meta.cloudName}/raw/upload/${meta.publicId}?v=${ts}`;
}

// ── 4. Save ──────────────────────────────────────────────────

async function doSave(showFeedback = false) {
  if (isSaving) return;
  isSaving = true;
  setBtnState('saving');
  try {
    const deviceId = getDeviceId();
    const sign     = await getSignature(deviceId);
    const blob     = new Blob([JSON.stringify({
      appName:      'life-balance',
      savedAt:      new Date().toISOString(),
      version:      1,
      deviceId,
      localStorage: gatherLocalStorage(),
    })], { type: 'application/json' });

    const result = await uploadToCloudinary(sign, blob);
    const meta   = {
      savedAt:   result.created_at || new Date().toISOString(),
      publicId:  sign.publicId,
      cloudName: sign.cloudName,
    };
    saveMeta(meta);
    setLastSavedText(meta.savedAt);
    setBtnState('saved');
    setTimeout(() => setBtnState('idle'), 3000);
    if (showFeedback) showToast('✅ Dữ liệu đã được lưu lên cloud');
    return meta;
  } catch (e) {
    setBtnState('error');
    setTimeout(() => setBtnState('idle'), 4000);
    if (showFeedback) showToast('Lưu thất bại — kiểm tra kết nối mạng');
    console.warn('[backup] save failed', e.message);
  } finally {
    isSaving = false;
  }
}

// ── 5. Restore ───────────────────────────────────────────────

async function doRestore() {
  let meta = loadMeta();
  if (!meta) {
    // localStorage wiped — try to reconstruct from deviceId
    try {
      const deviceId = getDeviceId();
      const sign     = await getSignature(deviceId);
      meta = { publicId: sign.publicId, cloudName: sign.cloudName, savedAt: null };
    } catch {
      showToast('Không thể kết nối server — kiểm tra mạng');
      return;
    }
  }

  showToast('Đang tải dữ liệu từ cloud…');
  let res;
  try { res = await fetch(backupUrl(meta)); }
  catch { showToast('Không thể kết nối Cloudinary'); return; }

  if (res.status === 404) { showToast('Chưa có bản lưu trên cloud cho thiết bị này'); return; }
  if (!res.ok) { showToast(`Lỗi ${res.status} khi tải dữ liệu`); return; }

  let payload;
  try { payload = await res.json(); }
  catch { showToast('File sao lưu bị hỏng'); return; }
  if (payload.appName !== 'life-balance') { showToast('File không đúng định dạng'); return; }

  const lsCount = Object.keys(payload.localStorage || {}).length;
  const ok = window.confirm(
    `Khôi phục từ bản lưu ngày ${fmtDate(payload.savedAt)}?\n\n` +
    `${lsCount} mục dữ liệu sẽ được phục hồi.\nDữ liệu hiện tại sẽ bị ghi đè.`
  );
  if (!ok) return;

  restoreLocalStorage(payload.localStorage);
  showToast('✅ Đã khôi phục — đang tải lại…');
  setTimeout(() => window.location.reload(), 1200);
}

// ── 6. Auto-save ─────────────────────────────────────────────

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

function initAutoBackup() {
  // First save: 30 s after page load (let all data fully hydrate first)
  setTimeout(() => doSave(false), 30_000);
  startAutoSave();
}

// ── 7. UI helpers ────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '?';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ` +
         `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function setLastSavedText(iso) {
  const el = document.getElementById('backup-last-saved');
  if (el && iso) el.textContent = `Đã lưu: ${fmtDate(iso)}`;
}

function esc(s) {
  return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
}

// ── 8. Overlay ───────────────────────────────────────────────

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
      <div class="backup-panel__body" id="backup-panel-body"></div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeOverlay(); });
  document.getElementById('backup-close-btn').addEventListener('click', closeOverlay);
}

function renderPanel() {
  const body = document.getElementById('backup-panel-body');
  if (!body) return;
  const meta     = loadMeta();
  const deviceId = getDeviceId();
  const shortId  = deviceId.slice(0, 8) + '…';

  body.innerHTML = `
    <div class="backup-user">
      <span class="backup-user__avatar">☁️</span>
      <div>
        <span class="backup-user__name">Thiết bị của bạn</span>
        <span id="backup-last-saved" class="backup-last-saved">${meta ? `Đã lưu: ${fmtDate(meta.savedAt)}` : 'Chưa lưu lần nào'}</span>
      </div>
    </div>
    <div class="backup-cloud-actions">
      <button type="button" id="backup-save-btn" class="btn btn-primary backup-cloud-btn">☁️ Lưu lên cloud ngay</button>
      <button type="button" id="backup-restore-btn" class="backup-cloud-btn backup-cloud-btn--outline">⬇️ Khôi phục từ cloud</button>
    </div>
    <p class="backup-auto-note">✅ Tự động lưu mỗi 5 phút &amp; khi thoát app</p>
    <div class="backup-device-id">
      <span class="backup-device-id__label">Mã thiết bị:</span>
      <code class="backup-device-id__code" title="${esc(deviceId)}">${esc(shortId)}</code>
      <button type="button" class="backup-device-id__copy" id="backup-copy-id">Sao chép</button>
    </div>`;

  document.getElementById('backup-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }
    await doSave(true);
    if (btn) { btn.disabled = false; btn.textContent = '☁️ Lưu lên cloud ngay'; }
  });
  document.getElementById('backup-restore-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-restore-btn');
    if (btn) btn.disabled = true;
    await doRestore();
    if (btn) btn.disabled = false;
  });
  document.getElementById('backup-copy-id').addEventListener('click', () => {
    navigator.clipboard?.writeText(deviceId).then(() => showToast('Đã sao chép mã thiết bị'))
      .catch(() => showToast(deviceId));
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

document.addEventListener('DOMContentLoaded', () => {
  navigator.storage?.persist?.().catch(() => {});
  document.getElementById('backup-open-btn')?.addEventListener('click', openOverlay);
  initAutoBackup();
});
