/* ============================================================
   Life Balance — skills.js  (v6)
   Water (Talent) — time-tracked star badges + full-screen folder.

   Stars: 5h=1★ | 35h=2★ | 150h=3★ | 365h=4★ | 500h+=5★🏆Master

   Timer fixes:
   - visibilitychange (primary)
   - window focus + pageshow (fallback for Pi Browser WebView back-nav)
   - sessionStorage resume: saves activeSkillId before opening a link
     so if the page reloads on return the folder auto-reopens

   New: MediaRecorder audio recording → auto-download to device
   ============================================================ */

'use strict';

// ── 1. Constants ────────────────────────────────────────────

const SKILLS_KEY = 'lifebalance_skills';

const SKILL_ICONS = [
  '🎨', '💻', '🎸', '📚', '🏃', '♟️', '🎤', '🍳',
  '🧘', '🎮', '📷', '✍️', '🌐', '🔧', '🎬', '🧮',
  '🗣️', '🧗', '🚴', '🏊', '🎯', '🧩', '🥋', '🎲',
];

const DEFAULT_ICON = SKILL_ICONS[0];

const STAR_THRESHOLDS = [
  { hours: 500, stars: 5 },
  { hours: 365, stars: 4 },
  { hours: 150, stars: 3 },
  { hours:  35, stars: 2 },
  { hours:   5, stars: 1 },
];

// ── 2. Module-level state ─────────────────────────────────

let skillEditingId      = null;
let selectedSkillIcon   = DEFAULT_ICON;
let skillDetailEditingId = null;

// Timer
let timerBaseSeconds  = 0;
let timerSessionStart = null;
let timerIntervalId   = null;

// Audio recorder
let micStream         = null;
let mediaRecorder     = null;
let recordingChunks   = [];
let recTimerInterval  = null;
let recStartTime      = 0;

// ── 3. Storage ──────────────────────────────────────────────

function loadSkills() {
  try {
    const s = JSON.parse(localStorage.getItem(SKILLS_KEY));
    return Array.isArray(s) ? s : [];
  } catch { return []; }
}
function saveSkills(skills) {
  return safeSetItem(SKILLS_KEY, JSON.stringify(skills));
}

function migrateSkillsSchema() {
  const skills = loadSkills();
  let changed = false;
  skills.forEach(s => {
    if (s.totalSeconds === undefined) { s.totalSeconds = 0; changed = true; }
    if (!Array.isArray(s.links))      { s.links = [];       changed = true; }
    if (!Array.isArray(s.images))     { s.images = [];      changed = true; }
    if (s.notes === undefined)        { s.notes = '';       changed = true; }
  });
  if (changed) saveSkills(skills);
}

// ── 4. Helpers ──────────────────────────────────────────────

function computeStars(totalSeconds) {
  const h = totalSeconds / 3600;
  for (const t of STAR_THRESHOLDS) if (h >= t.hours) return t.stars;
  return 0;
}

function formatTime(seconds) {
  if (seconds < 60) return '0 phút';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m} phút`;
}

function formatRecDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderStarRow(count) {
  return [1,2,3,4,5].map(n =>
    `<span class="skill-card__star ${n <= count ? 'skill-card__star--filled' : ''}">⭐</span>`
  ).join('');
}

function safeHostname(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

// ── 5. Timer ────────────────────────────────────────────────

function startTimerSession() {
  if (timerSessionStart !== null) return;
  if (!skillDetailEditingId) return;
  timerSessionStart = Date.now();
  timerIntervalId = setInterval(updateTimerDisplay, 1000);
}

function pauseTimerSession() {
  if (timerSessionStart === null) return;
  const elapsed = Math.floor((Date.now() - timerSessionStart) / 1000);
  timerSessionStart = null;
  clearInterval(timerIntervalId);
  timerIntervalId = null;
  if (elapsed <= 0) return;
  timerBaseSeconds += elapsed;

  const skills = loadSkills();
  const skill  = skills.find(s => s.id === skillDetailEditingId);
  if (skill) {
    skill.totalSeconds = timerBaseSeconds;
    saveSkills(skills);
    renderSkills();
  }
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('skill-detail-timer');
  const starsEl = document.getElementById('skill-detail-stars');
  if (!timerEl) return;
  const sessionSec = timerSessionStart ? Math.floor((Date.now() - timerSessionStart) / 1000) : 0;
  const total = timerBaseSeconds + sessionSec;
  timerEl.textContent = `⏱ ${formatTime(total)}`;
  if (starsEl) starsEl.innerHTML = renderStarRow(computeStars(total));
}

// Resume timer when tab becomes visible again (Pi Browser may fire
// focus or pageshow instead of / in addition to visibilitychange)
function handleTabVisible() {
  if (skillDetailEditingId && timerSessionStart === null) startTimerSession();
}

// ── 6. Icon picker ─────────────────────────────────────────

function renderIconPicker() {
  const c = document.getElementById('skill-icon-picker');
  if (!c) return;
  c.innerHTML = SKILL_ICONS.map(icon =>
    `<button type="button" class="skill-icon-picker__btn ${icon === selectedSkillIcon ? 'skill-icon-picker__btn--selected' : ''}" data-icon="${icon}">${icon}</button>`
  ).join('');
  c.querySelectorAll('[data-icon]').forEach(btn => {
    btn.addEventListener('click', () => { selectedSkillIcon = btn.dataset.icon; renderIconPicker(); });
  });
}

// ── 7. Skill grid ──────────────────────────────────────────

function renderSkillCard(skill) {
  const stars    = computeStars(skill.totalSeconds || 0);
  const isMaster = stars >= 5;
  const badge    = (skill.images?.length || 0) + (skill.links?.length || 0);
  return `
    <div class="skill-card ${isMaster ? 'skill-card--master' : ''}">
      <div class="skill-card__icon" data-skill-detail="${skill.id}" role="button" tabindex="0" aria-label="Mở ${escapeHtml(skill.name)}">
        ${skill.icon}
        ${badge ? `<span class="skill-card__file-badge">${badge}</span>` : ''}
      </div>
      <div class="skill-card__name">${escapeHtml(skill.name)}</div>
      <div class="skill-card__stars">${renderStarRow(stars)}</div>
      <div class="skill-card__time">${formatTime(skill.totalSeconds || 0)}</div>
      ${isMaster ? '<div class="skill-card__master">🏆 Master</div>' : ''}
      <div class="skill-card__actions">
        <button type="button" data-skill-edit="${skill.id}" aria-label="Sửa">✏️</button>
        <button type="button" data-skill-delete="${skill.id}" aria-label="Xoá">🗑</button>
      </div>
    </div>`;
}

function renderSkills() {
  const grid = document.getElementById('skill-grid');
  if (!grid) return;
  const skills = loadSkills();
  grid.innerHTML = skills.length
    ? skills.map(renderSkillCard).join('')
    : '<p class="skill-empty">Chưa có kỹ năng nào — thêm kỹ năng đầu tiên ở trên.</p>';

  grid.querySelectorAll('[data-skill-detail]').forEach(el => {
    el.addEventListener('click', () => openSkillDetail(el.dataset.skillDetail));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSkillDetail(el.dataset.skillDetail); }
    });
  });
  grid.querySelectorAll('[data-skill-edit]').forEach(b =>
    b.addEventListener('click', () => startEditSkill(b.dataset.skillEdit))
  );
  grid.querySelectorAll('[data-skill-delete]').forEach(b =>
    b.addEventListener('click', () => handleDeleteSkill(b.dataset.skillDelete))
  );
}

// ── 8. Add / edit skill ────────────────────────────────────

function resetSkillForm() {
  skillEditingId = null;
  selectedSkillIcon = DEFAULT_ICON;
  const n = document.getElementById('skill-new-name');
  const b = document.getElementById('skill-add-btn');
  if (n) n.value = '';
  if (b) b.textContent = 'Thêm kỹ năng';
  renderIconPicker();
}

function startEditSkill(skillId) {
  const skill = loadSkills().find(s => s.id === skillId);
  if (!skill) return;
  skillEditingId = skillId;
  selectedSkillIcon = skill.icon;
  const n = document.getElementById('skill-new-name');
  const b = document.getElementById('skill-add-btn');
  if (n) n.value = skill.name;
  if (b) b.textContent = 'Lưu';
  renderIconPicker();
  n?.focus();
  n?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handleSaveSkill(e) {
  e.preventDefault();
  const n = document.getElementById('skill-new-name');
  const name = n?.value.trim();
  if (!name) { showToast('Nhập tên kỹ năng'); return; }
  const skills = loadSkills();
  let updated;
  if (skillEditingId) {
    updated = skills.map(s => s.id === skillEditingId ? { ...s, name, icon: selectedSkillIcon } : s);
  } else {
    updated = [...skills, { id: `${Date.now()}`, name, icon: selectedSkillIcon, totalSeconds: 0, links: [], notes: '', images: [], createdAt: new Date().toISOString() }];
  }
  if (!saveSkills(updated)) return;
  resetSkillForm();
  renderSkills();
}

function handleDeleteSkill(skillId) {
  const skills = loadSkills().filter(s => s.id !== skillId);
  if (!saveSkills(skills)) return;
  if (skillEditingId === skillId) resetSkillForm();
  if (skillDetailEditingId === skillId) closeSkillDetail();
  renderSkills();
}

// ── 9. Skill folder ─────────────────────────────────────────

function openLink(url) {
  // Save active skill session so the page can auto-reopen the folder
  // if Pi Browser navigates the current WebView instead of a new tab.
  if (skillDetailEditingId) sessionStorage.setItem('resumeSkillId', skillDetailEditingId);
  pauseTimerSession(); // save time before potentially navigating away
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) window.location.href = url;
  // Re-start timer immediately in case we did NOT navigate away
  // (window.open succeeded and opened a new tab, keeping this page alive).
  setTimeout(() => { if (skillDetailEditingId) startTimerSession(); }, 500);
}

function renderSkillDetailLinks(skill) {
  const c = document.getElementById('skill-detail-links');
  if (!c) return;
  const links = skill.links || [];
  if (!links.length) {
    c.innerHTML = '<p class="skill-folder__empty-hint">Chưa có liên kết.</p>';
    return;
  }
  c.innerHTML = links.map(lk => `
    <div class="skill-detail__link-item">
      <button type="button" class="skill-detail__link-open" data-open-url="${escapeHtml(lk.url)}" aria-label="Mở ${escapeHtml(lk.label || lk.url)}">
        🔗 ${escapeHtml(lk.label || lk.url)}
      </button>
      ${safeHostname(lk.url) ? `<span class="skill-detail__link-domain">${escapeHtml(safeHostname(lk.url))}</span>` : ''}
      <button type="button" class="skill-detail__link-delete" data-link-delete="${lk.id}" aria-label="Xoá link">✕</button>
    </div>`).join('');

  c.querySelectorAll('[data-open-url]').forEach(btn =>
    btn.addEventListener('click', () => openLink(btn.dataset.openUrl))
  );
  c.querySelectorAll('[data-link-delete]').forEach(btn =>
    btn.addEventListener('click', () => handleDeleteSkillLink(btn.dataset.linkDelete))
  );
}

function openSkillDetail(skillId) {
  const skill = loadSkills().find(s => s.id === skillId);
  if (!skill) return;
  skillDetailEditingId = skillId;
  timerBaseSeconds = skill.totalSeconds || 0;

  const modal = document.getElementById('skill-detail-modal');
  document.getElementById('skill-detail-title').textContent = `${skill.icon} ${skill.name}`;
  document.getElementById('skill-detail-notes').value = skill.notes || '';
  renderSkillDetailLinks(skill);
  renderSkillDetailImages(skill);
  resetRecorderUI();
  updateTimerDisplay();
  if (modal) modal.hidden = false;
  document.body.style.overflow = 'hidden'; // prevent background scroll
  startTimerSession();
}

function closeSkillDetail() {
  stopRecordingIfActive();
  pauseTimerSession();
  saveSkillNotes();
  skillDetailEditingId = null;
  sessionStorage.removeItem('resumeSkillId');
  const modal = document.getElementById('skill-detail-modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
}

function saveSkillNotes() {
  if (!skillDetailEditingId) return;
  const notesEl = document.getElementById('skill-detail-notes');
  if (!notesEl) return;
  const skills = loadSkills();
  const skill = skills.find(s => s.id === skillDetailEditingId);
  if (!skill || skill.notes === notesEl.value) return;
  skill.notes = notesEl.value;
  saveSkills(skills);
}

function handleAddSkillLink() {
  if (!skillDetailEditingId) return;
  const urlEl   = document.getElementById('skill-link-url');
  const labelEl = document.getElementById('skill-link-label');
  const raw = urlEl?.value.trim();
  if (!raw) { showToast('Nhập URL liên kết'); return; }
  const url   = raw.startsWith('http') ? raw : `https://${raw}`;
  const label = labelEl?.value.trim() || '';
  const skills = loadSkills();
  const skill  = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  skill.links = [...(skill.links || []), { id: `${Date.now()}`, url, label }];
  if (!saveSkills(skills)) return;
  if (urlEl)   { urlEl.value = ''; urlEl.focus(); }
  if (labelEl)   labelEl.value = '';
  showToast('Đã lưu link ✓');
  renderSkillDetailLinks(skill);
  renderSkills();
}

function handleDeleteSkillLink(linkId) {
  if (!skillDetailEditingId) return;
  const skills = loadSkills();
  const skill  = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  skill.links = (skill.links || []).filter(lk => lk.id !== linkId);
  if (!saveSkills(skills)) return;
  renderSkillDetailLinks(skill);
  renderSkills();
}

// ── 10. Images ─────────────────────────────────────────────

function renderSkillDetailImages(skill) {
  const c = document.getElementById('skill-detail-images');
  if (!c) return;
  const images = skill.images || [];
  c.innerHTML = images.length
    ? images.map(img => `
        <div class="skill-detail__image">
          <img src="${img.url}" alt="" />
          <button type="button" class="skill-detail__image-delete" data-skill-image-delete="${img.id}" aria-label="Xoá ảnh">✕</button>
        </div>`).join('')
    : '<p class="skill-folder__empty-hint">Chưa có ảnh.</p>';
  c.querySelectorAll('[data-skill-image-delete]').forEach(btn =>
    btn.addEventListener('click', () => handleDeleteSkillImage(btn.dataset.skillImageDelete))
  );
}

async function handleUploadSkillImage(file) {
  if (!skillDetailEditingId) return;
  if (file.size > maxBytesForFile(file)) { showToast('Ảnh quá lớn (tối đa 10MB)'); return; }
  const btn = document.getElementById('skill-detail-upload-btn');
  if (btn) btn.disabled = true;
  showToast('Đang tải ảnh lên...');
  let url;
  try { url = await uploadMediaToCloudinary(file); }
  catch {
    showToast('Tải ảnh thất bại — kiểm tra kết nối');
    if (btn) btn.disabled = false;
    return;
  }
  if (btn) btn.disabled = false;
  const skills = loadSkills();
  const skill  = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  skill.images = [...(skill.images || []), { id: `${Date.now()}`, url }];
  if (!saveSkills(skills)) return;
  renderSkillDetailImages(skill);
  renderSkills();
}

function handleDeleteSkillImage(imageId) {
  if (!skillDetailEditingId) return;
  const skills = loadSkills();
  const skill  = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  skill.images = (skill.images || []).filter(img => img.id !== imageId);
  if (!saveSkills(skills)) return;
  renderSkillDetailImages(skill);
  renderSkills();
}

// ── 11. Audio recording ────────────────────────────────────

function resetRecorderUI() {
  document.getElementById('skill-rec-active').hidden   = true;
  document.getElementById('skill-rec-start').hidden    = false;
  document.getElementById('skill-rec-playback').hidden = true;
  document.getElementById('skill-rec-playback').innerHTML = '';
}

function stopRecordingIfActive() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  clearInterval(recTimerInterval);
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Trình duyệt không hỗ trợ ghi âm');
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    showToast('Không thể truy cập microphone — hãy cấp quyền');
    return;
  }

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  recordingChunks = [];
  mediaRecorder = new MediaRecorder(micStream, { mimeType });
  mediaRecorder.addEventListener('dataavailable', e => { if (e.data.size > 0) recordingChunks.push(e.data); });
  mediaRecorder.addEventListener('stop', handleRecordingStop);
  mediaRecorder.start();

  recStartTime = Date.now();
  document.getElementById('skill-rec-start').hidden  = true;
  document.getElementById('skill-rec-active').hidden = false;
  document.getElementById('skill-rec-duration').textContent = '0:00';

  recTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recStartTime) / 1000);
    document.getElementById('skill-rec-duration').textContent = formatRecDuration(elapsed);
  }, 1000);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  clearInterval(recTimerInterval);
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
}

function handleRecordingStop() {
  const blob = new Blob(recordingChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
  recordingChunks = [];
  mediaRecorder = null;

  const url  = URL.createObjectURL(blob);
  const skill = loadSkills().find(s => s.id === skillDetailEditingId);
  const name  = skill ? skill.name.replace(/[^a-zA-Z0-9À-ɏ]/g, '_') : 'recording';
  const ts    = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  const filename = `${name}_${ts}.webm`;

  // Auto-download to device
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Show playback controls in the folder for the current session
  const playback = document.getElementById('skill-rec-playback');
  playback.innerHTML = `
    <p class="skill-folder__empty-hint" style="margin-bottom:6px">🎵 Bản ghi âm vừa lưu xuống máy:</p>
    <audio controls src="${url}" style="width:100%"></audio>`;
  playback.hidden = false;

  document.getElementById('skill-rec-active').hidden = true;
  document.getElementById('skill-rec-start').hidden  = false;

  showToast(`Đã lưu ${filename} xuống máy ✓`, 4000);
}

// ── 12. Boot ────────────────────────────────────────────────

function initSkillsTracker() {
  migrateSkillsSchema();
  renderIconPicker();
  renderSkills();

  document.getElementById('skill-add-form')?.addEventListener('submit', handleSaveSkill);

  // Folder open/close
  document.getElementById('skill-detail-close')?.addEventListener('click', closeSkillDetail);
  document.getElementById('skill-detail-notes')?.addEventListener('blur', saveSkillNotes);

  // Links
  document.getElementById('skill-link-add-btn')?.addEventListener('click', handleAddSkillLink);
  document.getElementById('skill-link-url')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddSkillLink(); }
  });

  // Images
  const imgInput = document.getElementById('skill-detail-image-file');
  document.getElementById('skill-detail-upload-btn')?.addEventListener('click', () => imgInput?.click());
  imgInput?.addEventListener('change', () => {
    const file = imgInput.files?.[0];
    imgInput.value = '';
    if (file) handleUploadSkillImage(file);
  });

  // Audio recording
  document.getElementById('skill-rec-start')?.addEventListener('click', startRecording);
  document.getElementById('skill-rec-stop')?.addEventListener('click', stopRecording);

  // Star info modal
  document.getElementById('skill-info-open')?.addEventListener('click', () => {
    document.getElementById('skill-info-modal').hidden = false;
  });
  document.getElementById('skill-info-close')?.addEventListener('click', () => {
    document.getElementById('skill-info-modal').hidden = true;
  });
  document.getElementById('skill-info-modal')?.addEventListener('click', e => {
    if (e.target.id === 'skill-info-modal') document.getElementById('skill-info-modal').hidden = true;
  });

  // Timer: visibilitychange (primary) + focus/pageshow (fallback for Pi Browser WebView)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pauseTimerSession();
    else handleTabVisible();
  });
  window.addEventListener('focus', handleTabVisible);
  window.addEventListener('pageshow', e => {
    // pageshow with persisted=true = BFCache restore (user pressed Back)
    if (e.persisted || document.visibilityState === 'visible') handleTabVisible();
  });
  window.addEventListener('beforeunload', () => pauseTimerSession());

  // Auto-reopen folder if we left via a link click and came back
  const resumeId = sessionStorage.getItem('resumeSkillId');
  if (resumeId) {
    sessionStorage.removeItem('resumeSkillId');
    // Small delay so the grid is rendered first
    setTimeout(() => openSkillDetail(resumeId), 100);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initSkillsTracker);
});
