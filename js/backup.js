/* ============================================================
   Life Balance — backup.js
   App-wide data backup & restore.

   Data is stored in two places:
     • localStorage  — all lifebalance_* keys (skills, finance,
       health, journal, expense sheet metadata, etc.)
     • IndexedDB     — lifebalance_images / expense_photos store
       (receipt photo blobs — never sent to cloud)

   This module:
     1. Requests the browser to mark this origin as "persistent"
        (navigator.storage.persist) so the browser won't silently
        evict the data under storage pressure.
     2. Provides Export — bundles everything into one .json file the
        user downloads and can keep anywhere (Drive, email, etc.).
     3. Provides Import — reads that file back and restores all data,
        then reloads the page so the restored state is reflected.
   ============================================================ */

'use strict';

const BACKUP_STORE = 'expense_photos'; // only IndexedDB store currently in use

// ── 1. Persistent Storage ─────────────────────────────────────
// Ask the browser not to auto-evict this site's storage under pressure.
// Best-effort: Chromium (Pi Browser) grants this if the user has engaged
// with the site; no action needed on denial.

async function requestPersistentStorage() {
  if (navigator.storage?.persist) {
    await navigator.storage.persist().catch(() => {});
  }
}

// ── 2. Export helpers ────────────────────────────────────────

function gatherLocalStorage() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('lifebalance_')) data[key] = localStorage.getItem(key);
  }
  return data;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // data URL string
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function gatherIndexedDB() {
  const result = {};
  try {
    const db = await openLocalImageDb([BACKUP_STORE]);
    const store = {};
    const allKeys = await new Promise((res, rej) => {
      const tx = db.transaction(BACKUP_STORE, 'readonly');
      const req = tx.objectStore(BACKUP_STORE).getAllKeys();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    for (const key of allKeys) {
      const blob = await loadLocalImage(BACKUP_STORE, key);
      if (blob) store[key] = await blobToBase64(blob);
    }
    result[BACKUP_STORE] = store;
  } catch { /* IndexedDB unavailable — skip silently */ }
  return result;
}

async function exportBackup() {
  const btn = document.getElementById('backup-export-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang xuất…'; }
  try {
    const [lsData, idbData] = await Promise.all([gatherLocalStorage(), gatherIndexedDB()]);
    const payload = {
      appName: 'life-balance',
      exportedAt: new Date().toISOString(),
      version: 1,
      localStorage: lsData,
      indexedDB: idbData,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `life-balance-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Đã xuất file sao lưu thành công!');
    updateBackupInfo();
  } catch (e) {
    showToast('Xuất thất bại — thử lại');
    console.warn('[backup] export failed', e);
  }
  if (btn) { btn.disabled = false; btn.textContent = '📥 Xuất dữ liệu (.json)'; }
}

// ── 3. Import helpers ────────────────────────────────────────

function base64ToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function restoreIndexedDB(idbData) {
  if (!idbData || typeof idbData !== 'object') return;
  for (const [storeName, entries] of Object.entries(idbData)) {
    if (!entries || typeof entries !== 'object') continue;
    try {
      const db = await openLocalImageDb([storeName]);
      for (const [key, dataUrl] of Object.entries(entries)) {
        const blob = base64ToBlob(dataUrl);
        await saveLocalImage(storeName, key, blob);
      }
    } catch (e) { console.warn('[backup] IDB restore failed for store', storeName, e); }
  }
}

async function importBackup(file) {
  const btn = document.getElementById('backup-import-btn');
  if (btn) { btn.disabled = true; }
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    if (payload.appName !== 'life-balance' || payload.version !== 1) {
      showToast('File không hợp lệ — không phải file sao lưu của Life Balance');
      if (btn) btn.disabled = false;
      return;
    }

    const lsCount = Object.keys(payload.localStorage || {}).length;
    const idbCount = Object.values(payload.indexedDB || {}).reduce((s, v) => s + Object.keys(v).length, 0);
    const confirmed = window.confirm(
      `Khôi phục dữ liệu từ ${payload.exportedAt?.slice(0, 10) || 'file này'}?\n\n` +
      `• ${lsCount} mục dữ liệu\n• ${idbCount} ảnh đính kèm\n\n` +
      `Dữ liệu hiện tại sẽ bị ghi đè. Tiếp tục?`
    );
    if (!confirmed) { if (btn) btn.disabled = false; return; }

    // Restore localStorage
    for (const [key, value] of Object.entries(payload.localStorage || {})) {
      if (key.startsWith('lifebalance_')) localStorage.setItem(key, value);
    }
    // Restore IndexedDB
    await restoreIndexedDB(payload.indexedDB || {});
    showToast('✅ Đã khôi phục thành công — đang tải lại…');
    setTimeout(() => window.location.reload(), 1200);
  } catch (e) {
    showToast('Khôi phục thất bại — file có thể bị hỏng');
    console.warn('[backup] import failed', e);
    if (btn) btn.disabled = false;
  }
}

// ── 4. Overlay UI ────────────────────────────────────────────
// Injected once into <body> — works on any page.

function injectBackupOverlay() {
  if (document.getElementById('backup-overlay')) return;
  const el = document.createElement('div');
  el.id = 'backup-overlay';
  el.className = 'backup-overlay';
  el.setAttribute('hidden', '');
  el.innerHTML = `
    <div class="backup-panel">
      <div class="backup-panel__header">
        <h2 class="backup-panel__title">🛡️ Sao lưu &amp; Khôi phục</h2>
        <button type="button" id="backup-close-btn" class="backup-panel__close" aria-label="Đóng">✕</button>
      </div>

      <div class="backup-panel__section">
        <h3 class="backup-panel__section-title">Trạng thái bộ nhớ</h3>
        <p id="backup-persist-status" class="backup-persist-status"></p>
        <p id="backup-storage-info" class="backup-storage-info"></p>
      </div>

      <div class="backup-panel__section">
        <h3 class="backup-panel__section-title">📥 Xuất dữ liệu</h3>
        <p class="backup-panel__desc">Tải về file <code>.json</code> chứa toàn bộ dữ liệu — kỹ năng, tài chính, sức khoẻ, ghi chú, ảnh biên lai. Lưu file này vào Google Drive, email cho bản thân, hoặc bất kỳ nơi nào an toàn.</p>
        <button type="button" id="backup-export-btn" class="btn btn-primary backup-btn">📥 Xuất dữ liệu (.json)</button>
      </div>

      <div class="backup-panel__section">
        <h3 class="backup-panel__section-title">📤 Khôi phục dữ liệu</h3>
        <p class="backup-panel__desc">Chọn file <code>.json</code> đã sao lưu trước đó để phục hồi toàn bộ dữ liệu. Dữ liệu hiện tại sẽ bị ghi đè.</p>
        <input type="file" id="backup-import-file" accept=".json,application/json" hidden />
        <button type="button" id="backup-import-btn" class="btn backup-btn backup-btn--outline">📤 Chọn file để khôi phục</button>
      </div>

      <div class="backup-panel__footer">
        <p>Lưu file sao lưu ở nơi an toàn (Drive / iCloud / email). Khi đổi điện thoại hoặc cài lại Pi Browser, dùng file này để phục hồi mọi dữ liệu.</p>
      </div>
    </div>`;
  document.body.appendChild(el);

  document.getElementById('backup-close-btn').addEventListener('click', closeBackupOverlay);
  el.addEventListener('click', e => { if (e.target === el) closeBackupOverlay(); });
  document.getElementById('backup-export-btn').addEventListener('click', exportBackup);
  document.getElementById('backup-import-btn').addEventListener('click', () =>
    document.getElementById('backup-import-file')?.click()
  );
  document.getElementById('backup-import-file').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) importBackup(file);
    e.target.value = '';
  });
}

function updateBackupInfo() {
  // Persist status
  const persistEl = document.getElementById('backup-persist-status');
  if (persistEl && navigator.storage?.persisted) {
    navigator.storage.persisted().then(granted => {
      persistEl.textContent = granted
        ? '🔒 Bộ nhớ được bảo vệ — trình duyệt sẽ không tự xoá dữ liệu.'
        : '⚠️ Bộ nhớ chưa được bảo vệ — có thể bị trình duyệt tự dọn khi thiết bị đầy.';
      persistEl.className = `backup-persist-status ${granted ? 'backup-persist-status--ok' : 'backup-persist-status--warn'}`;
    }).catch(() => {});
  }

  // Storage usage
  const infoEl = document.getElementById('backup-storage-info');
  if (infoEl && navigator.storage?.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      const usedMB = (usage / 1024 / 1024).toFixed(1);
      const quotaMB = (quota / 1024 / 1024).toFixed(0);
      const lsCount = Object.keys(localStorage).filter(k => k.startsWith('lifebalance_')).length;
      infoEl.textContent = `${lsCount} mục dữ liệu · ${usedMB} MB / ${quotaMB} MB đã dùng`;
    }).catch(() => {});
  }
}

function openBackupOverlay() {
  injectBackupOverlay();
  const overlay = document.getElementById('backup-overlay');
  if (overlay) overlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  updateBackupInfo();
}

function closeBackupOverlay() {
  const overlay = document.getElementById('backup-overlay');
  if (overlay) overlay.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

// ── 5. Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  requestPersistentStorage();
  document.getElementById('backup-open-btn')?.addEventListener('click', openBackupOverlay);
});
