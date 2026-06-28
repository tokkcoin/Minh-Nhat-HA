/* ============================================================
   Life Balance — skills.js
   Water (Talent / Skills) element page — icon-based skill badges.
   Each skill is a name + a picked emoji icon + a 1-5 star
   proficiency level; add/edit/delete, no XP/quest mechanics here.
   ============================================================ */

'use strict';

// ── 1. Storage Key & Constants ──────────────────────────────

const SKILLS_KEY = 'lifebalance_skills';

const SKILL_ICONS = [
  '🎨', '💻', '🎸', '📚', '🏃', '♟️', '🎤', '🍳',
  '🧘', '🎮', '📷', '✍️', '🌐', '🔧', '🎬', '🧮',
  '🗣️', '🧗', '🚴', '🏊', '🎯', '🧩', '🥋', '🎲',
];

const DEFAULT_ICON = SKILL_ICONS[0];

// Which existing skill (if any) the add-form is currently editing.
let skillEditingId = null;
let selectedSkillIcon = DEFAULT_ICON;
let selectedSkillLevel = 3;

// Which skill's "folder" (notes + images) the detail modal currently
// shows — clicking a skill's icon opens this, separate from edit/delete.
let skillDetailEditingId = null;
let pendingSkillDetailImageFile = null;

// ── 2. Load / Save ───────────────────────────────────────────

function loadSkills() {
  try {
    const stored = JSON.parse(localStorage.getItem(SKILLS_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveSkills(skills) {
  return safeSetItem(SKILLS_KEY, JSON.stringify(skills));
}

// ── 3. Icon & Level Pickers (shared by add + edit) ────────────

function renderIconPicker() {
  const container = document.getElementById('skill-icon-picker');
  if (!container) return;
  container.innerHTML = SKILL_ICONS.map(icon => `
    <button type="button" class="skill-icon-picker__btn ${icon === selectedSkillIcon ? 'skill-icon-picker__btn--selected' : ''}" data-icon="${icon}" aria-label="Chọn icon ${icon}">${icon}</button>
  `).join('');
  container.querySelectorAll('[data-icon]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSkillIcon = btn.dataset.icon;
      renderIconPicker();
    });
  });
}

function renderLevelPicker() {
  const container = document.getElementById('skill-level-picker');
  if (!container) return;
  container.innerHTML = [1, 2, 3, 4, 5].map(n => `
    <span class="skill-level-picker__star ${n <= selectedSkillLevel ? 'skill-level-picker__star--filled' : ''}" data-level="${n}">⭐</span>
  `).join('');
  container.querySelectorAll('[data-level]').forEach(star => {
    star.addEventListener('click', () => {
      selectedSkillLevel = Number(star.dataset.level);
      renderLevelPicker();
    });
  });
}

// ── 4. Render Skill Grid ───────────────────────────────────────

function renderSkillStars(skill) {
  return [1, 2, 3, 4, 5].map(n => `
    <span class="skill-card__star ${n <= skill.level ? 'skill-card__star--filled' : ''}" data-skill-star="${skill.id}" data-level="${n}">⭐</span>
  `).join('');
}

function renderSkillCard(skill) {
  const fileCount = (skill.images || []).length;
  return `
    <div class="skill-card">
      <div class="skill-card__icon" data-skill-detail="${skill.id}" role="button" tabindex="0" aria-label="Mở ghi chú/ảnh của ${escapeHtml(skill.name)}">
        ${skill.icon}
        ${fileCount ? `<span class="skill-card__file-badge">${fileCount}</span>` : ''}
      </div>
      <div class="skill-card__name">${escapeHtml(skill.name)}</div>
      <div class="skill-card__stars">${renderSkillStars(skill)}</div>
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

  grid.querySelectorAll('[data-skill-edit]').forEach(btn => {
    btn.addEventListener('click', () => startEditSkill(btn.dataset.skillEdit));
  });
  grid.querySelectorAll('[data-skill-delete]').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteSkill(btn.dataset.skillDelete));
  });
  grid.querySelectorAll('[data-skill-star]').forEach(star => {
    star.addEventListener('click', () => setSkillLevel(star.dataset.skillStar, Number(star.dataset.level)));
  });
  grid.querySelectorAll('[data-skill-detail]').forEach(icon => {
    icon.addEventListener('click', () => openSkillDetail(icon.dataset.skillDetail));
    icon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSkillDetail(icon.dataset.skillDetail); }
    });
  });
}

// ── 5. Actions ───────────────────────────────────────────────

function setSkillLevel(skillId, level) {
  const skills = loadSkills();
  const skill = skills.find(s => s.id === skillId);
  if (!skill) return;
  skill.level = level;
  if (!saveSkills(skills)) return;
  renderSkills();
}

function resetSkillForm() {
  skillEditingId = null;
  selectedSkillIcon = DEFAULT_ICON;
  selectedSkillLevel = 3;
  const nameInput = document.getElementById('skill-new-name');
  const addBtn = document.getElementById('skill-add-btn');
  if (nameInput) nameInput.value = '';
  if (addBtn) addBtn.textContent = 'Thêm kỹ năng';
  renderIconPicker();
  renderLevelPicker();
}

function startEditSkill(skillId) {
  const skill = loadSkills().find(s => s.id === skillId);
  if (!skill) return;
  skillEditingId = skillId;
  selectedSkillIcon = skill.icon;
  selectedSkillLevel = skill.level;
  const nameInput = document.getElementById('skill-new-name');
  const addBtn = document.getElementById('skill-add-btn');
  if (nameInput) nameInput.value = skill.name;
  if (addBtn) addBtn.textContent = 'Lưu';
  renderIconPicker();
  renderLevelPicker();
  nameInput?.focus();
  nameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handleSaveSkill(e) {
  e.preventDefault();
  const nameInput = document.getElementById('skill-new-name');
  const name = nameInput?.value.trim();
  if (!name) {
    showToast('Nhập tên kỹ năng');
    return;
  }

  const skills = loadSkills();
  let updated;
  if (skillEditingId) {
    updated = skills.map(s => s.id === skillEditingId ? { ...s, name, icon: selectedSkillIcon, level: selectedSkillLevel } : s);
  } else {
    updated = [...skills, {
      id: `${Date.now()}`,
      name,
      icon: selectedSkillIcon,
      level: selectedSkillLevel,
      createdAt: new Date().toISOString(),
      notes: '',
      images: [],
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
  renderSkills();
}

// ── 6. Skill "Folder" — notes + uploaded images ───────────────

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
    : '<p class="skill-empty">Chưa có ảnh nào.</p>';

  container.querySelectorAll('[data-skill-image-delete]').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteSkillImage(btn.dataset.skillImageDelete));
  });
}

function openSkillDetail(skillId) {
  const skill = loadSkills().find(s => s.id === skillId);
  if (!skill) return;
  skillDetailEditingId = skillId;
  pendingSkillDetailImageFile = null;

  const modal = document.getElementById('skill-detail-modal');
  const title = document.getElementById('skill-detail-title');
  const notesInput = document.getElementById('skill-detail-notes');
  if (title) title.textContent = `${skill.icon} ${skill.name}`;
  if (notesInput) notesInput.value = skill.notes || '';
  renderSkillDetailImages(skill);
  if (modal) modal.hidden = false;
}

function closeSkillDetail() {
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

async function handleUploadSkillImage(file) {
  if (!skillDetailEditingId) return;
  if (file.size > maxBytesForFile(file)) {
    showToast('Ảnh quá lớn (tối đa 10MB)');
    return;
  }

  const uploadBtn = document.getElementById('skill-detail-upload-btn');
  if (uploadBtn) uploadBtn.disabled = true;
  showToast('Đang tải ảnh lên...');
  let url;
  try {
    url = await uploadMediaToCloudinary(file);
  } catch {
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

// ── 7. Boot ──────────────────────────────────────────────────

function initSkillsTracker() {
  renderIconPicker();
  renderLevelPicker();
  renderSkills();

  document.getElementById('skill-add-form')?.addEventListener('submit', handleSaveSkill);

  document.getElementById('skill-detail-close')?.addEventListener('click', closeSkillDetail);
  document.getElementById('skill-detail-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'skill-detail-modal') closeSkillDetail();
  });
  document.getElementById('skill-detail-notes')?.addEventListener('blur', saveSkillNotes);

  const detailFileInput = document.getElementById('skill-detail-image-file');
  document.getElementById('skill-detail-upload-btn')?.addEventListener('click', () => detailFileInput?.click());
  detailFileInput?.addEventListener('change', () => {
    const file = detailFileInput.files?.[0];
    detailFileInput.value = '';
    if (file) handleUploadSkillImage(file);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initSkillsTracker);
});
