/* ============================================================
   Life Balance — backup.js  v8

   Problem:  Pi Browser (mini-app WebView) can clear localStorage
             when the app is force-closed from recents, wiping all data.

   Solution: Dual-key persistence + auto-restore on every startup.

     1. UUID stored in BOTH localStorage AND a 2-year cookie.
        Cookies survive many scenarios that clear localStorage.

     2. On every page load:
        - If localStorage has data → normal (save timer starts).
        - If localStorage is empty but cookie has the UUID
          → silently fetch the Cloudinary backup & auto-restore
          → reload page with full data restored.

     3. Auto-save to Cloudinary:
        - 30 s after page load (first hydration save)
        - Every 5 minutes
        - On visibilitychange (user backgrounds the app)
   ============================================================ */

'use strict';

const DEVICE_ID_KEY = 'lifebalance_device_id';
const META_KEY      = 'lifebalance_cloud_backup_meta';
const COOKIE_NAME   = 'lb_device_id';
const COOKIE_MAX    = 2 * 365 * 24 * 3600; // 2 years in seconds
const AUTO_MS       = 5 * 60 * 1000;
let   autoTimer     = null;
let   isSaving      = false;

// ── 1. UUID helpers (localStorage + cookie dual-storage) ─────

function setCookieId(id) {
  document.cookie = `${COOKIE_NAME}=${id}; max-age=${COOKIE_MAX}; path=/; SameSite=Lax`;
}

function getCookieId() {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? m[1] : null;
}

function genUUID() {
  return crypto.randomUUID?.() ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY) || getCookieId();
  if (!id) {
    id = genUUID();
  }
  // Always sync both storage locations
  localStorage.setItem(DEVICE_ID_KEY, id);
  setCookieId(id);
  return id;
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

function hasLocalData() {
  // True if the user has at least one app data key (not counting backup meta/device id)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('lifebalance_') && k !== META_KEY && k !== DEVICE_ID_KEY) return true;
  }
  return false;
}

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)); } catch { return null; }
}

function saveMeta(m) { localStorage.setItem(META_KEY, JSON.stringify(m)); }

// ── 3. Cloudinary helpers ────────────────────────────────────

async function getSignature(deviceId) {
  const res = await fetch('/api/cloudinary-sign-backup', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ deviceId }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `Server ${res.status}`);
  }
  return res.json(); // { cloudName, apiKey, timestamp, signature, publicId }
}

async function uploadBackup(sign, lsData, deviceId) {
  const blob = new Blob([JSON.stringify({
    appName: 'life-balance', version: 1,
    savedAt: new Date().toISOString(),
    deviceId, localStorage: lsData,
  })], { type: 'application/json' });

  const form = new FormData();
  form.append('file',      blob);
  form.append('public_id', sign.publicId);
  form.append('api_key',   sign.apiKey);
  form.append('timestamp', sign.timestamp);
  form.append('signature', sign.signature);
  form.append('overwrite', 'true');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/raw/upload`,
    { method: 'POST', body: form }
  );
  if (!res.ok) throw new Error('Cloudinary upload failed');
  return res.json(); // { created_at, … }
}

function buildUrl(cloudName, publicId, ts) {
  return `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}?v=${ts || Date.now()}`;
}

// ── 4. Save ──────────────────────────────────────────────────

async function doSave(showFeedback = false) {
  if (isSaving) return;
  isSaving = true;
  setBtnState('saving');
  try {
    const deviceId = getOrCreateDeviceId();
    const sign     = await getSignature(deviceId);
    const result   = await uploadBackup(sign, gatherLocalStorage(), deviceId);
    const meta     = {
      savedAt:   result.created_at || new Date().toISOString(),
      publicId:  sign.publicId,
      cloudName: sign.cloudName,
    };
    saveMeta(meta);
    setLastSavedText(meta.savedAt);
    setBtnState('saved');
    setTimeout(() => setBtnState('idle'), 3000);
    if (showFeedback) showToast('✅ Đã lưu dữ liệu lên cloud');
    return meta;
  } catch (e) {
    setBtnState('error');
    setTimeout(() => setBtnState('idle'), 4000);
    if (showFeedback) showToast('Lưu thất bại — kiểm tra kết nối');
    console.warn('[backup] save failed:', e.message);
  } finally {
    isSaving = false;
  }
}

// ── 5. Auto-restore on startup ───────────────────────────────
// Called when localStorage is empty but we have a cookie UUID.
// Fetches the Cloudinary backup silently and reloads the page.

async function autoRestore(deviceId) {
  try {
    const sign = await getSignature(deviceId);
    const url  = buildUrl(sign.cloudName, sign.publicId);
    const res  = await fetch(url);
    if (!res.ok) return false; // no backup exists yet
    const payload = await res.json();
    if (payload.appName !== 'life-balance') return false;

    // Restore all data
    restoreLocalStorage(payload.localStorage);
    // Re-sync device ID and meta
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    setCookieId(deviceId);
    saveMeta({
      savedAt:   payload.savedAt,
      publicId:  sign.publicId,
      cloudName: sign.cloudName,
    });
    return true;
  } catch { return false; }
}

// ── 6. Manual restore (user-triggered) ──────────────────────

async function doRestore() {
  const deviceId = getOrCreateDeviceId();
  showToast('Đang tải dữ liệu từ cloud…');
  try {
    const sign = await getSignature(deviceId);
    const meta = loadMeta() || { publicId: sign.publicId, cloudName: sign.cloudName };
    const url  = buildUrl(meta.cloudName, meta.publicId, meta.savedAt ? new Date(meta.savedAt).getTime() : undefined);
    const res  = await fetch(url);
    if (res.status === 404) { showToast('Chưa có bản lưu trên cloud'); return; }
    if (!res.ok) { showToast(`Lỗi ${res.status}`); return; }
    const payload = await res.json();
    if (payload.appName !== 'life-balance') { showToast('File không đúng định dạng'); return; }

    const n = Object.keys(payload.localStorage || {}).length;
    if (!window.confirm(`Khôi phục từ bản lưu ${fmtDate(payload.savedAt)}?\n${n} mục dữ liệu · Dữ liệu hiện tại sẽ bị ghi đè.`)) return;
    restoreLocalStorage(payload.localStorage);
    showToast('✅ Đã khôi phục — đang tải lại…');
    setTimeout(() => window.location.reload(), 1200);
  } catch (e) {
    showToast('Khôi phục thất bại — kiểm tra kết nối');
    console.warn('[backup] restore failed:', e.message);
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
function esc(s) {
  return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
}

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
  const meta = loadMeta();
  const id   = getOrCreateDeviceId();
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
      <code class="backup-device-id__code" title="${esc(id)}">${esc(id.slice(0,8))}…</code>
      <button type="button" id="backup-copy-id" class="backup-device-id__copy">Sao chép</button>
    </div>`;

  document.getElementById('backup-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-save-btn');
    btn.disabled = true; btn.textContent = 'Đang lưu…';
    await doSave(true);
    btn.disabled = false; btn.textContent = '☁️ Lưu lên cloud ngay';
  });
  document.getElementById('backup-restore-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-restore-btn');
    btn.disabled = true;
    await doRestore();
    btn.disabled = false;
  });
  document.getElementById('backup-copy-id').addEventListener('click', () => {
    navigator.clipboard?.writeText(id).then(() => showToast('Đã sao chép mã thiết bị'))
      .catch(() => showToast(id));
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

  const lsId     = localStorage.getItem(DEVICE_ID_KEY);
  const cookieId = getCookieId();

  if (!hasLocalData() && cookieId) {
    // localStorage was wiped (e.g. Pi Browser cleared it) but cookie survived.
    // Auto-restore silently — user gets their data back without doing anything.
    showToast('Đang khôi phục dữ liệu…');
    const ok = await autoRestore(cookieId);
    if (ok) {
      showToast('✅ Dữ liệu đã được khôi phục');
      setTimeout(() => window.location.reload(), 800);
      return; // stop here — page will reload with data
    }
  }

  // Normal startup — ensure UUID is set in both storages, start auto-save
  getOrCreateDeviceId();
  setTimeout(() => doSave(false), 30_000); // first save 30 s after load
  startAutoSave();
});
