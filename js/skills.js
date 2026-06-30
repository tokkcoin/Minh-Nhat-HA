/* ============================================================
   Life Balance — skills.js
   Water (Talent / Skills) element page.
   Stars are AUTO-computed from accumulated practice time, not set manually:
   5h=1★ | 35h=2★ | 150h=3★ | 365h=4★ | 500h+=5★ 🏆 Master
   Timer runs while the skill folder is open and the tab is visible;
   pauses on visibilitychange/beforeunload; accumulates across days.
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

// Hours thresholds → star level (checked in descending order)
const STAR_THRESHOLDS = [
  { hours: 500, stars: 5 },
  { hours: 365, stars: 4 },
  { hours: 150, stars: 3 },
  { hours:  35, stars: 2 },
  { hours:   5, stars: 1 },
];

// ── 2. Module-level state ─────────────────────────────────

let skillEditingId = null;
let selectedSkillIcon = DEFAULT_ICON;

// Folder / detail modal state
let skillDetailEditingId = null;
let pendingSkillDetailImageFile = null;

// Timer state
let timerBaseSeconds  = 0;   // seconds already saved in localStorage when session opened
let timerSessionStart = null; // Date.now() when current session started, null if paused
let timerIntervalId   = null; // setInterval id for live clock display

// ── 3. Load / Save ──────────────────────────────────────────

function loadSkills() {
  try {
    const stored = JSON.parse(localStorage.getItem(SKILLS_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

function saveSkills(skills) {
  return safeSetItem(SKILLS_KEY, JSON.stringify(skills));
}

// One-time migration: add totalSeconds/links/images/notes to skills
// created before this version that lack those fields.
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

// ── 4. Star / time helpers ─────────────────────────────────

function computeStars(totalSeconds) {
  const hours = totalSeconds / 3600;
  for (const t of STAR_THRESHOLDS) {
    if (hours >= t.hours) return t.stars;
  }
  return 0;
}

function formatTime(seconds) {
  if (seconds < 60) return '0 phút';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return h ? `${h}h ${rm}m` : `${m} phút`;
}

function renderStarRow(starCount) {
  return [1,2,3,4,5].map(n =>
    `<span class="skill-card__star ${n <= starCount ? 'skill-card__star--filled' : ''}">⭐</span>`
  ).join('');
}

// ── 5. Timer logic ─────────────────────────────────────────

function startTimerSession() {
  if (timerSessionStart !== null) return; // already running
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
  const skill = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  skill.totalSeconds = timerBaseSeconds;
  saveSkills(skills);
  renderSkills();         // update card stars/time immediately
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('skill-detail-timer');
  const starsEl = document.getElementById('skill-detail-stars');
  if (!timerEl) return;
  const sessionSec = timerSessionStart ? Math.floor((Date.now() - timerSessionStart) / 1000) : 0;
  const total = timerBaseSeconds + sessionSec;
  const stars = computeStars(total);
  timerEl.textContent = `⏱ ${formatTime(total)}`;
  if (starsEl) starsEl.innerHTML = renderStarRow(stars);
}

// ── 6. Icon picker ─────────────────────────────────────────

function renderIconPicker() {
  const container = document.getElementById('skill-icon-picker');
  if (!container) return;
  container.innerHTML = SKILL_ICONS.map(icon =>
    `<button type="button" class="skill-icon-picker__btn ${icon === selectedSkillIcon ? 'skill-icon-picker__btn--selected' : ''}" data-icon="${icon}" aria-label="${icon}">${icon}</button>`
  ).join('');
  container.querySelectorAll('[data-icon]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSkillIcon = btn.dataset.icon;
      renderIconPicker();
    });
  });
}

// ── 7. Render skill grid ───────────────────────────────────

function renderSkillCard(skill) {
  const stars = computeStars(skill.totalSeconds || 0);
  const isMaster = stars >= 5;
  const fileCount = (skill.images || []).length + (skill.links || []).length;
  return `
    <div class="skill-card ${isMaster ? 'skill-card--master' : ''}">
      <div class="skill-card__icon" data-skill-detail="${skill.id}" role="button" tabindex="0" aria-label="Mở kỹ năng ${escapeHtml(skill.name)}">
        ${skill.icon}
        ${fileCount ? `<span class="skill-card__file-badge">${fileCount}</span>` : ''}
      </div>
      <div class="skill-card__name">${escapeHtml(skill.name)}</div>
      <div class="skill-card__stars">${renderStarRow(stars)}</div>
      <div class="skill-card__time">${formatTime(skill.totalSeconds || 0)}</div>
      ${isMaster ? '<div class="skill-card__master">🏆 Master</div>' : ''}
      <div class="skill-card__actions">
        <button type="button" data-skill-edit="${skill.id}" aria-label="Sửa kỹ năng">✏️</button>
        <button type="button" data-skill-delete="${skill.id}" aria-label="Xoá kỹ năng">🗑</button>
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
  grid.querySelectorAll('[data-skill-edit]').forEach(btn =>
    btn.addEventListener('click', () => startEditSkill(btn.dataset.skillEdit))
  );
  grid.querySelectorAll('[data-skill-delete]').forEach(btn =>
    btn.addEventListener('click', () => handleDeleteSkill(btn.dataset.skillDelete))
  );
}

// ── 8. Add / Edit skill ────────────────────────────────────

function resetSkillForm() {
  skillEditingId = null;
  selectedSkillIcon = DEFAULT_ICON;
  const nameInput = document.getElementById('skill-new-name');
  const addBtn = document.getElementById('skill-add-btn');
  if (nameInput) nameInput.value = '';
  if (addBtn) addBtn.textContent = 'Thêm kỹ năng';
  renderIconPicker();
}

function startEditSkill(skillId) {
  const skill = loadSkills().find(s => s.id === skillId);
  if (!skill) return;
  skillEditingId = skillId;
  selectedSkillIcon = skill.icon;
  const nameInput = document.getElementById('skill-new-name');
  const addBtn = document.getElementById('skill-add-btn');
  if (nameInput) nameInput.value = skill.name;
  if (addBtn) addBtn.textContent = 'Lưu';
  renderIconPicker();
  nameInput?.focus();
  nameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handleSaveSkill(e) {
  e.preventDefault();
  const nameInput = document.getElementById('skill-new-name');
  const name = nameInput?.value.trim();
  if (!name) { showToast('Nhập tên kỹ năng'); return; }

  const skills = loadSkills();
  let updated;
  if (skillEditingId) {
    updated = skills.map(s =>
      s.id === skillEditingId ? { ...s, name, icon: selectedSkillIcon } : s
    );
  } else {
    updated = [...skills, {
      id: `${Date.now()}`,
      name,
      icon: selectedSkillIcon,
      totalSeconds: 0,
      links: [],
      notes: '',
      images: [],
      createdAt: new Date().toISOString(),
    }];
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

// ── 9. Skill folder modal (timer + links + notes + images) ──

function renderSkillDetailLinks(skill) {
  const container = document.getElementById('skill-detail-links');
  if (!container) return;
  const links = skill.links || [];
  if (!links.length) {
    container.innerHTML = '<p class="skill-empty" style="font-size:12px;padding:4px 0">Chưa có liên kết.</p>';
    return;
  }
  container.innerHTML = links.map(lk => `
    <div class="skill-detail__link-item">
      <a class="skill-detail__link-url" href="${escapeHtml(lk.url)}" target="_blank" rel="noopener noreferrer">
        🔗 ${escapeHtml(lk.label || lk.url)}
      </a>
      <button type="button" class="skill-detail__link-delete" data-link-delete="${lk.id}" aria-label="Xoá link">✕</button>
    </div>`).join('');

  container.querySelectorAll('[data-link-delete]').forEach(btn =>
    btn.addEventListener('click', () => handleDeleteSkillLink(btn.dataset.linkDelete))
  );
}

function openSkillDetail(skillId) {
  const skill = loadSkills().find(s => s.id === skillId);
  if (!skill) return;
  skillDetailEditingId = skillId;
  timerBaseSeconds = skill.totalSeconds || 0;
  pendingSkillDetailImageFile = null;

  const modal = document.getElementById('skill-detail-modal');
  const title = document.getElementById('skill-detail-title');
  const notesInput = document.getElementById('skill-detail-notes');
  if (title) title.textContent = `${skill.icon} ${skill.name}`;
  if (notesInput) notesInput.value = skill.notes || '';
  renderSkillDetailLinks(skill);
  renderSkillDetailImages(skill);
  updateTimerDisplay();
  if (modal) modal.hidden = false;
  startTimerSession();
}

function closeSkillDetail() {
  pauseTimerSession();
  saveSkillNotes();
  skillDetailEditingId = null;
  const modal = document.getElementById('skill-detail-modal');
  if (modal) modal.hidden = true;
}

function saveSkillNotes() {
  if (!skillDetailEditingId) return;
  const notesInput = document.getElementById('skill-detail-notes');
  if (!notesInput) return;
  const skills = loadSkills();
  const skill = skills.find(s => s.id === skillDetailEditingId);
  if (!skill || skill.notes === notesInput.value) return;
  skill.notes = notesInput.value;
  saveSkills(skills);
}

function handleAddSkillLink() {
  if (!skillDetailEditingId) return;
  const urlInput = document.getElementById('skill-link-url');
  const labelInput = document.getElementById('skill-link-label');
  const url = urlInput?.value.trim();
  if (!url) { showToast('Nhập URL liên kết'); return; }

  const normalized = url.startsWith('http') ? url : `https://${url}`;
  const label = labelInput?.value.trim() || '';
  const skills = loadSkills();
  const skill = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  skill.links = [...(skill.links || []), { id: `${Date.now()}`, url: normalized, label }];
  if (!saveSkills(skills)) return;
  if (urlInput) urlInput.value = '';
  if (labelInput) labelInput.value = '';
  renderSkillDetailLinks(skill);
  renderSkills();
}

function handleDeleteSkillLink(linkId) {
  if (!skillDetailEditingId) return;
  const skills = loadSkills();
  const skill = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  skill.links = (skill.links || []).filter(lk => lk.id !== linkId);
  if (!saveSkills(skills)) return;
  renderSkillDetailLinks(skill);
  renderSkills();
}

// ── 10. Image handling (existing, kept as-is) ──────────────

function setQuestImagePreview(url) {
  const preview = document.getElementById('quest-new-image-preview');
  const removeBtn = document.getElementById('quest-new-image-remove');
  if (preview) { preview.src = url || ''; preview.hidden = !url; }
  if (removeBtn) removeBtn.hidden = !url;
}

function renderSkillDetailImages(skill) {
  const container = document.getElementById('skill-detail-images');
  if (!container) return;
  const images = skill.images || [];
  container.innerHTML = images.length
    ? images.map(img => `
        <div class="skill-detail__image">
          <img src="${img.url}" alt="" />
          <button type="button" class="skill-detail__image-delete" data-skill-image-delete="${img.id}" aria-label="Xoá ảnh">✕</button>
        </div>`).join('')
    : '<p class="skill-empty" style="font-size:12px;padding:4px 0">Chưa có ảnh.</p>';

  container.querySelectorAll('[data-skill-image-delete]').forEach(btn =>
    btn.addEventListener('click', () => handleDeleteSkillImage(btn.dataset.skillImageDelete))
  );
}

async function handleUploadSkillImage(file) {
  if (!skillDetailEditingId) return;
  if (file.size > maxBytesForFile(file)) { showToast('Ảnh quá lớn (tối đa 10MB)'); return; }
  const uploadBtn = document.getElementById('skill-detail-upload-btn');
  if (uploadBtn) uploadBtn.disabled = true;
  showToast('Đang tải ảnh lên...');
  let url;
  try { url = await uploadMediaToCloudinary(file); }
  catch {
    showToast('Tải ảnh thất bại — kiểm tra kết nối và thử lại');
    if (uploadBtn) uploadBtn.disabled = false;
    return;
  }
  if (uploadBtn) uploadBtn.disabled = false;
  const skills = loadSkills();
  const skill = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  skill.images = [...(skill.images || []), { id: `${Date.now()}`, url }];
  if (!saveSkills(skills)) return;
  renderSkillDetailImages(skill);
  renderSkills();
}

function handleDeleteSkillImage(imageId) {
  if (!skillDetailEditingId) return;
  const skills = loadSkills();
  const skill = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  skill.images = (skill.images || []).filter(img => img.id !== imageId);
  if (!saveSkills(skills)) return;
  renderSkillDetailImages(skill);
  renderSkills();
}

// ── 11. Boot ────────────────────────────────────────────────

function initSkillsTracker() {
  migrateSkillsSchema();
  renderIconPicker();
  renderSkills();

  document.getElementById('skill-add-form')?.addEventListener('submit', handleSaveSkill);

  // Folder modal controls
  document.getElementById('skill-detail-close')?.addEventListener('click', closeSkillDetail);
  document.getElementById('skill-detail-modal')?.addEventListener('click', e => {
    if (e.target.id === 'skill-detail-modal') closeSkillDetail();
  });
  document.getElementById('skill-detail-notes')?.addEventListener('blur', saveSkillNotes);
  document.getElementById('skill-link-add-btn')?.addEventListener('click', handleAddSkillLink);
  document.getElementById('skill-link-url')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddSkillLink(); }
  });

  // Image upload
  const detailFileInput = document.getElementById('skill-detail-image-file');
  document.getElementById('skill-detail-upload-btn')?.addEventListener('click', () => detailFileInput?.click());
  detailFileInput?.addEventListener('change', () => {
    const file = detailFileInput.files?.[0];
    detailFileInput.value = '';
    if (file) handleUploadSkillImage(file);
  });

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

  // Pause timer when tab goes hidden; resume when it returns
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      pauseTimerSession();
    } else if (skillDetailEditingId) {
      startTimerSession();
    }
  });

  // Flush on page unload
  window.addEventListener('beforeunload', () => pauseTimerSession());
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initSkillsTracker);
});
