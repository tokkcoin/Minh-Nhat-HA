/* ============================================================
   Life Balance — backup.js  v4
   Cloud sync: saves/loads all app data to Vercel KV via the Pi
   user account (sign in with Pi required). Auto-saves every 5 min.

   Photos (IndexedDB) are device-local only — not synced.
   ============================================================ */

'use strict';

const AUTO_SAVE_MS = 5 * 60 * 1000; // 5 minutes
let autoSaveTimer  = null;
let cloudUsername  = null; // set once cloud-load confirms auth

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

// ── 2. Cloud API calls ───────────────────────────────────────

async function cloudSave() {
  const res = await fetch('/api/cloud-save', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ localStorage: gatherLocalStorage() }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `HTTP ${res.status}`);
  }
  return await res.json(); // { ok, savedAt }
}

async function cloudLoad() {
  const res = await fetch('/api/cloud-load');
  if (res.status === 401) return { notSignedIn: true };
  if (res.status === 503) return { notConfigured: true };
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `HTTP ${res.status}`);
  }
  return await res.json(); // { username, backup: { savedAt, localStorage } | null }
}

// ── 3. Auto-save ─────────────────────────────────────────────

function startAutoSave() {
  if (autoSaveTimer) return;
  autoSaveTimer = setInterval(async () => {
    try {
      const { savedAt } = await cloudSave();
      setLastSaved(savedAt);
    } catch (e) {
      console.warn('[backup] auto-save failed', e.message);
    }
  }, AUTO_SAVE_MS);
}

function setLastSaved(isoStr) {
  const el = document.getElementById('backup-last-saved');
  if (!el || !isoStr) return;
  const d = new Date(isoStr);
  const hm = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  el.textContent = `Đã lưu lúc ${hm}`;
}

// ── 4. Overlay UI ────────────────────────────────────────────

function injectBackupOverlay() {
  if (document.getElementById('backup-overlay')) return;
  const el = document.createElement('div');
  el.id        = 'backup-overlay';
  el.className = 'backup-overlay';
  el.setAttribute('hidden', '');
  el.innerHTML = `
    <div class="backup-panel">
      <div class="backup-panel__header">
        <h2 class="backup-panel__title">☁️ Lưu trữ đám mây</h2>
        <button type="button" id="backup-close-btn" class="backup-panel__close" aria-label="Đóng">✕</button>
      </div>
      <div class="backup-panel__body" id="backup-panel-body">
        <p class="backup-status-hint">Đang kiểm tra đăng nhập…</p>
      </div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeBackupOverlay(); });
  document.getElementById('backup-close-btn').addEventListener('click', closeBackupOverlay);
}

function renderSignedIn(username, savedAt) {
  const body = document.getElementById('backup-panel-body');
  if (!body) return;
  body.innerHTML = `
    <div class="backup-user">
      <span class="backup-user__avatar">π</span>
      <span class="backup-user__name">@${escapeCloudStr(username)}</span>
      <span id="backup-last-saved" class="backup-last-saved">${savedAt ? `Đã lưu lúc ${fmtTime(savedAt)}` : 'Chưa có bản lưu'}</span>
    </div>
    <div class="backup-cloud-actions">
      <button type="button" id="backup-save-btn" class="btn btn-primary backup-cloud-btn">☁️ Lưu lên cloud ngay</button>
      <button type="button" id="backup-restore-btn" class="backup-cloud-btn backup-cloud-btn--outline">⬇️ Khôi phục từ cloud</button>
    </div>
    <p class="backup-auto-note">✅ Tự động lưu mỗi 5 phút khi mở app</p>`;

  document.getElementById('backup-save-btn').addEventListener('click', handleSaveNow);
  document.getElementById('backup-restore-btn').addEventListener('click', handleRestoreNow);
}

function renderNotSignedIn() {
  const body = document.getElementById('backup-panel-body');
  if (!body) return;
  body.innerHTML = `
    <div class="backup-signin-prompt">
      <div class="backup-signin-prompt__icon">π</div>
      <p class="backup-signin-prompt__text">Đăng nhập bằng Pi Network để bật tính năng lưu và đồng bộ dữ liệu tự động lên đám mây.</p>
      <a href="index.html" class="btn btn-primary backup-cloud-btn">Đăng nhập với Pi →</a>
    </div>`;
}

function renderNotConfigured() {
  const body = document.getElementById('backup-panel-body');
  if (!body) return;
  body.innerHTML = `
    <p class="backup-status-hint">⚠️ Cloud chưa được cấu hình — vui lòng liên hệ quản trị viên.</p>`;
}

function fmtTime(isoStr) {
  const d = new Date(isoStr);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} ngày ${d.getDate()}/${d.getMonth()+1}`;
}

function escapeCloudStr(s) {
  return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
}

// ── 5. Button handlers ───────────────────────────────────────

async function handleSaveNow() {
  const btn = document.getElementById('backup-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }
  try {
    const { savedAt } = await cloudSave();
    setLastSaved(savedAt);
    showToast('✅ Dữ liệu đã được lưu lên cloud');
  } catch (e) {
    showToast(`Lưu thất bại: ${e.message}`);
  }
  if (btn) { btn.disabled = false; btn.textContent = '☁️ Lưu lên cloud ngay'; }
}

async function handleRestoreNow() {
  const btn = document.getElementById('backup-restore-btn');
  if (btn) { btn.disabled = true; }
  try {
    const { backup } = await cloudLoad();
    if (!backup) { showToast('Không có dữ liệu trên cloud để khôi phục'); if (btn) btn.disabled = false; return; }
    const ok = window.confirm(
      `Khôi phục từ bản lưu ngày ${fmtTime(backup.savedAt)}?\n\nDữ liệu hiện tại sẽ bị ghi đè.`
    );
    if (!ok) { if (btn) btn.disabled = false; return; }
    restoreLocalStorage(backup.localStorage);
    showToast('✅ Đã khôi phục — đang tải lại…');
    setTimeout(() => window.location.reload(), 1200);
  } catch (e) {
    showToast(`Khôi phục thất bại: ${e.message}`);
    if (btn) { btn.disabled = false; }
  }
}

// ── 6. Open / Close ──────────────────────────────────────────

async function openBackupOverlay() {
  injectBackupOverlay();
  document.getElementById('backup-overlay')?.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  // Check auth + load latest backup info
  try {
    const data = await cloudLoad();
    if (data.notSignedIn) { renderNotSignedIn(); return; }
    if (data.notConfigured) { renderNotConfigured(); return; }
    cloudUsername = data.username;
    renderSignedIn(data.username, data.backup?.savedAt || null);
    startAutoSave();
  } catch (e) {
    const body = document.getElementById('backup-panel-body');
    if (body) body.innerHTML = `<p class="backup-status-hint">Lỗi kết nối — kiểm tra mạng rồi thử lại.</p>`;
  }
}

function closeBackupOverlay() {
  document.getElementById('backup-overlay')?.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

// ── 7. Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Request persistent storage (best-effort, silent)
  navigator.storage?.persist?.().catch(() => {});
  document.getElementById('backup-open-btn')?.addEventListener('click', openBackupOverlay);
});
