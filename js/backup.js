/* ============================================================
   Life Balance — backup.js  v2
   App-wide data backup & restore with auto-save.

   Export strategy (tried in order of best UX):
     1. showSaveFilePicker  (Chromium desktop) → user picks location,
        handle stored for silent 5-min auto-save to the same file.
     2. navigator.share({ files })  (mobile / Pi Browser) → native
        share sheet; user sends to Drive, email, etc.
     3. <a download>  (fallback) → saved to Downloads folder.

   Auto-save (every 5 minutes):
     • If a FileSystemFileHandle was obtained → writes silently.
     • Otherwise → stores a JSON snapshot in IndexedDB; user can
       share/download the latest snapshot at any time.

   Import: uses a <label> wired to a file input — no JS .click()
   so it works even when Pi Browser blocks programmatic triggers.
   ============================================================ */

'use strict';

const BACKUP_STORE      = 'expense_photos';
const AUTO_SNAP_STORE   = 'backup_snapshots';
const AUTO_SNAP_KEY     = 'latest';
const AUTO_SAVE_MS      = 5 * 60 * 1000; // 5 minutes

let backupFileHandle    = null; // FileSystemFileHandle — desktop only
let autoSaveTimer       = null;
let lastAutoSaveTime    = null;

// ── 1. Persistent storage request ───────────────────────────

async function requestPersistentStorage() {
  if (navigator.storage?.persist) await navigator.storage.persist().catch(() => {});
}

// ── 2. Build backup payload ──────────────────────────────────

function gatherLocalStorage() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('lifebalance_')) data[key] = localStorage.getItem(key);
  }
  return data;
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

async function gatherIndexedDB() {
  const result = {};
  try {
    const db = await openLocalImageDb([BACKUP_STORE]);
    const allKeys = await new Promise((res, rej) => {
      const tx = db.transaction(BACKUP_STORE, 'readonly');
      const req = tx.objectStore(BACKUP_STORE).getAllKeys();
      req.onsuccess = () => res(req.result);
      req.onerror  = () => rej(req.error);
    });
    const store = {};
    for (const key of allKeys) {
      const blob = await loadLocalImage(BACKUP_STORE, key);
      if (blob) store[key] = await blobToBase64(blob);
    }
    result[BACKUP_STORE] = store;
  } catch { /* skip if unavailable */ }
  return result;
}

async function buildPayload() {
  const [lsData, idbData] = await Promise.all([gatherLocalStorage(), gatherIndexedDB()]);
  return {
    appName:      'life-balance',
    exportedAt:   new Date().toISOString(),
    version:      1,
    localStorage: lsData,
    indexedDB:    idbData,
  };
}

function payloadToBlob(payload) {
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

function backupFilename() {
  return `life-balance-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

// ── 3. Export strategies ─────────────────────────────────────

async function writeHandleBlob(handle, blob) {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function exportViaFilePicker(blob) {
  // Desktop Chromium — user picks save location, we keep the handle.
  const handle = await window.showSaveFilePicker({
    suggestedName: backupFilename(),
    types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }],
  });
  await writeHandleBlob(handle, blob);
  backupFileHandle = handle;
  startAutoSave();
  return true;
}

async function exportViaShare(blob) {
  // Mobile / Pi Browser — opens native share sheet.
  const file = new File([blob], backupFilename(), { type: 'application/json' });
  if (!navigator.canShare?.({ files: [file] })) return false;
  await navigator.share({ files: [file], title: 'Life Balance Backup' });
  return true;
}

function exportViaDownload(blob) {
  // Universal fallback — saves to Downloads folder.
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function exportBackup() {
  const btn = document.getElementById('backup-export-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang xuất…'; }
  try {
    const payload = await buildPayload();
    const blob    = payloadToBlob(payload);

    if (window.showSaveFilePicker) {
      try {
        await exportViaFilePicker(blob);
        showToast('✅ File đã được lưu — tự động sao lưu mỗi 5 phút');
      } catch (e) {
        if (e.name === 'AbortError') { /* user cancelled picker — do nothing */ }
        else throw e;
      }
    } else if (await exportViaShare(blob).catch(() => false)) {
      // Share sheet opened — also start IndexedDB auto-save as background safety
      await saveSnapshotToIdb(payload);
      startAutoSave();
      showToast('✅ Đã chia sẻ file — tự động sao lưu cục bộ mỗi 5 phút');
    } else {
      exportViaDownload(blob);
      await saveSnapshotToIdb(payload);
      startAutoSave();
      showToast('✅ File đã tải về thư mục Downloads — tự động sao lưu mỗi 5 phút');
    }
    lastAutoSaveTime = new Date();
    updateBackupInfo();
  } catch (e) {
    showToast('Xuất thất bại — thử lại');
    console.warn('[backup] export failed', e);
  }
  if (btn) { btn.disabled = false; btn.textContent = '📥 Xuất / Chia sẻ dữ liệu'; }
}

// ── 4. Auto-save ─────────────────────────────────────────────

async function saveSnapshotToIdb(payload) {
  try {
    const db = await openLocalImageDb([AUTO_SNAP_STORE]);
    const blob = payloadToBlob(payload);
    await new Promise((res, rej) => {
      const tx = db.transaction(AUTO_SNAP_STORE, 'readwrite');
      tx.objectStore(AUTO_SNAP_STORE).put(blob, AUTO_SNAP_KEY);
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
  } catch { /* non-fatal */ }
}

async function loadSnapshotFromIdb() {
  try {
    const db = await openLocalImageDb([AUTO_SNAP_STORE]);
    return await new Promise((res, rej) => {
      const tx = db.transaction(AUTO_SNAP_STORE, 'readonly');
      const req = tx.objectStore(AUTO_SNAP_STORE).get(AUTO_SNAP_KEY);
      req.onsuccess = () => res(req.result || null);
      req.onerror   = () => rej(req.error);
    });
  } catch { return null; }
}

async function doAutoSave() {
  try {
    const payload = await buildPayload();
    const blob    = payloadToBlob(payload);

    if (backupFileHandle) {
      // Write silently to the file the user chose
      await writeHandleBlob(backupFileHandle, blob);
    } else {
      // No file handle — save locally in IndexedDB
      await saveSnapshotToIdb(payload);
    }
    lastAutoSaveTime = new Date();
    updateAutoSaveChip();
  } catch (e) {
    console.warn('[backup] auto-save failed', e);
    // If the file handle has become stale, clear it
    if (backupFileHandle) {
      backupFileHandle = null;
      showToast('⚠️ File sao lưu không còn truy cập được — vui lòng xuất lại');
    }
  }
}

function startAutoSave() {
  if (autoSaveTimer) return; // already running
  autoSaveTimer = setInterval(doAutoSave, AUTO_SAVE_MS);
}

function updateAutoSaveChip() {
  const el = document.getElementById('backup-autosave-chip');
  if (!el) return;
  if (!lastAutoSaveTime) { el.textContent = ''; return; }
  const h = lastAutoSaveTime.getHours().toString().padStart(2, '0');
  const m = lastAutoSaveTime.getMinutes().toString().padStart(2, '0');
  el.textContent = `Tự động lưu lần cuối: ${h}:${m}`;
}

async function downloadLatestSnapshot() {
  const blob = await loadSnapshotFromIdb();
  if (!blob) { showToast('Chưa có bản sao lưu cục bộ — nhấn Xuất trước'); return; }
  const file = new File([blob], backupFilename(), { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Life Balance Backup' }).catch(() => {});
  } else {
    exportViaDownload(blob);
  }
}

// ── 5. Import ────────────────────────────────────────────────

function base64ToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(',');
  const mime   = header.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
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
        await saveLocalImage(storeName, key, base64ToBlob(dataUrl));
      }
    } catch (e) { console.warn('[backup] IDB restore failed', storeName, e); }
  }
}

async function importBackup(file) {
  const label = document.getElementById('backup-import-label');
  if (label) label.style.opacity = '.5';
  try {
    const text    = await file.text();
    const payload = JSON.parse(text);

    if (payload.appName !== 'life-balance' || payload.version !== 1) {
      showToast('File không hợp lệ — không phải file sao lưu của Life Balance');
      if (label) label.style.opacity = '';
      return;
    }
    const lsCount  = Object.keys(payload.localStorage || {}).length;
    const idbCount = Object.values(payload.indexedDB || {})
      .reduce((s, v) => s + Object.keys(v).length, 0);
    const confirmed = window.confirm(
      `Khôi phục từ bản lưu ngày ${payload.exportedAt?.slice(0, 10) || '?'}?\n\n` +
      `• ${lsCount} mục dữ liệu\n• ${idbCount} ảnh đính kèm\n\n` +
      `Dữ liệu hiện tại sẽ bị ghi đè. Tiếp tục?`
    );
    if (!confirmed) { if (label) label.style.opacity = ''; return; }

    for (const [key, value] of Object.entries(payload.localStorage || {})) {
      if (key.startsWith('lifebalance_')) localStorage.setItem(key, value);
    }
    await restoreIndexedDB(payload.indexedDB || {});
    showToast('✅ Đã khôi phục — đang tải lại…');
    setTimeout(() => window.location.reload(), 1200);
  } catch (e) {
    showToast('Khôi phục thất bại — file có thể bị hỏng hoặc sai định dạng');
    console.warn('[backup] import failed', e);
    if (label) label.style.opacity = '';
  }
}

// ── 6. Overlay UI ────────────────────────────────────────────

function injectBackupOverlay() {
  if (document.getElementById('backup-overlay')) return;
  const el = document.createElement('div');
  el.id        = 'backup-overlay';
  el.className = 'backup-overlay';
  el.setAttribute('hidden', '');
  el.innerHTML = `
    <div class="backup-panel">
      <div class="backup-panel__header">
        <h2 class="backup-panel__title">🛡️ Sao lưu &amp; Khôi phục</h2>
        <button type="button" id="backup-close-btn" class="backup-panel__close" aria-label="Đóng">✕</button>
      </div>

      <div class="backup-panel__section">
        <h3 class="backup-panel__section-title">Trạng thái</h3>
        <p id="backup-persist-status" class="backup-persist-status"></p>
        <p id="backup-storage-info" class="backup-storage-info"></p>
        <p id="backup-autosave-chip" class="backup-autosave-chip"></p>
      </div>

      <div class="backup-panel__section">
        <h3 class="backup-panel__section-title">📥 Xuất dữ liệu</h3>
        <p class="backup-panel__desc">
          Xuất toàn bộ dữ liệu ra file <code>.json</code> — kỹ năng, tài chính, sức khoẻ, ghi chú, ảnh biên lai.<br>
          Trên điện thoại: mở khay chia sẻ để lưu vào Drive / email.<br>
          Sau khi xuất, file sẽ được <strong>tự động cập nhật mỗi 5 phút</strong>.
        </p>
        <button type="button" id="backup-export-btn" class="btn btn-primary backup-btn">📥 Xuất / Chia sẻ dữ liệu</button>
        <button type="button" id="backup-snapshot-btn" class="backup-btn backup-btn--ghost">🔄 Tải bản sao lưu cục bộ gần nhất</button>
      </div>

      <div class="backup-panel__section">
        <h3 class="backup-panel__section-title">📤 Khôi phục dữ liệu</h3>
        <p class="backup-panel__desc">Chọn file <code>.json</code> đã lưu để phục hồi toàn bộ dữ liệu. Dữ liệu hiện tại sẽ bị ghi đè.</p>
        <label class="backup-btn backup-btn--outline" id="backup-import-label" for="backup-import-file">
          📤 Chọn file để khôi phục
        </label>
        <input type="file" id="backup-import-file" accept=".json,application/json" class="backup-import-input" />
      </div>

      <div class="backup-panel__footer">
        <p>Lưu file sao lưu ở nơi an toàn (Drive / iCloud / email). Khi đổi điện thoại hoặc cài lại Pi Browser, dùng file này để phục hồi mọi dữ liệu. Cập nhật app không làm mất dữ liệu.</p>
      </div>
    </div>`;
  document.body.appendChild(el);

  el.addEventListener('click', e => { if (e.target === el) closeBackupOverlay(); });
  document.getElementById('backup-close-btn').addEventListener('click', closeBackupOverlay);
  document.getElementById('backup-export-btn').addEventListener('click', exportBackup);
  document.getElementById('backup-snapshot-btn').addEventListener('click', downloadLatestSnapshot);
  document.getElementById('backup-import-file').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) importBackup(file);
    e.target.value = '';
  });
}

function updateBackupInfo() {
  const persistEl = document.getElementById('backup-persist-status');
  if (persistEl && navigator.storage?.persisted) {
    navigator.storage.persisted().then(ok => {
      persistEl.textContent  = ok
        ? '🔒 Bộ nhớ được bảo vệ — trình duyệt sẽ không tự xoá dữ liệu.'
        : '⚠️ Bộ nhớ chưa được bảo vệ — có thể bị trình duyệt tự dọn khi thiết bị đầy.';
      persistEl.className = `backup-persist-status ${ok ? 'backup-persist-status--ok' : 'backup-persist-status--warn'}`;
    }).catch(() => {});
  }

  const infoEl = document.getElementById('backup-storage-info');
  if (infoEl && navigator.storage?.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      const usedMB  = (usage / 1024 / 1024).toFixed(1);
      const quotaMB = (quota / 1024 / 1024).toFixed(0);
      const lsCount = Object.keys(localStorage).filter(k => k.startsWith('lifebalance_')).length;
      infoEl.textContent = `${lsCount} mục dữ liệu · ${usedMB} MB / ${quotaMB} MB đã dùng`;
    }).catch(() => {});
  }
  updateAutoSaveChip();
}

function openBackupOverlay() {
  injectBackupOverlay();
  document.getElementById('backup-overlay')?.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  updateBackupInfo();
}

function closeBackupOverlay() {
  document.getElementById('backup-overlay')?.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

// ── 7. Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  requestPersistentStorage();
  document.getElementById('backup-open-btn')?.addEventListener('click', openBackupOverlay);
});
