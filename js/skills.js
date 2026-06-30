/* ============================================================
   Life Balance — skills.js
   Water (Talent) — time-tracked star badges + full-screen folder.

   Stars: 5h=1★ | 35h=2★ | 150h=3★ | 365h=4★ | 500h+=5★🏆Master

   Timer runs from openSkillDetail() to closeSkillDetail() only.
   It does NOT pause for tab visibility or focus changes — time
   accumulates the entire time the skill folder is open.
   - flushTimerToStorage(): saves to localStorage without stopping
     (called on beforeunload + before opening a link)
   - stopTimerSession(): saves + stops (called on folder close only)
   - sessionStorage resumeSkillId: if Pi Browser navigates the page
     away (no new-tab support), folder auto-reopens on return
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

// Save accumulated time to localStorage WITHOUT stopping the clock.
// Called on beforeunload and before opening external links so time is
// never lost if the page is killed or navigated away unexpectedly.
function flushTimerToStorage() {
  if (timerSessionStart === null || !skillDetailEditingId) return;
  const elapsed = Math.floor((Date.now() - timerSessionStart) / 1000);
  if (elapsed <= 0) return;
  const total = timerBaseSeconds + elapsed;
  const skills = loadSkills();
  const skill  = skills.find(s => s.id === skillDetailEditingId);
  if (!skill) return;
  // Update base so next flush doesn't double-count this elapsed period.
  timerBaseSeconds = total;
  timerSessionStart = Date.now(); // reset session start to now
  skill.totalSeconds = total;
  saveSkills(skills);
  renderSkills();
}

// Stop the clock permanently and save. Called ONLY from closeSkillDetail.
function stopTimerSession() {
  if (timerSessionStart !== null) {
    const elapsed = Math.floor((Date.now() - timerSessionStart) / 1000);
    timerBaseSeconds += elapsed;
    timerSessionStart = null;
  }
  clearInterval(timerIntervalId);
  timerIntervalId = null;
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
  if (skillDetailEditingId) sessionStorage.setItem('resumeSkillId', skillDetailEditingId);
  // Flush current elapsed time to localStorage before potentially
  // navigating away (safety save — timer continues counting after this).
  flushTimerToStorage();
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) window.location.href = url;
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
  renderNotePreview(skill);
  renderSkillDetailLinks(skill);
  renderSkillDetailImages(skill);
  updateTimerDisplay();
  if (modal) modal.hidden = false;
  document.body.style.overflow = 'hidden';
  startTimerSession();
}

function closeSkillDetail() {
  stopTimerSession();
  skillDetailEditingId = null;
  sessionStorage.removeItem('resumeSkillId');
  const modal = document.getElementById('skill-detail-modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
}

// ── 9b. Full-screen Note Editor ───────────────────────────

let noteAutoSaveTimer = null;

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

function renderNotePreview(skill) {
  const preview = document.getElementById('skill-note-preview');
  if (!preview) return;
  const content = skill.notes || '';
  if (!content || stripHtml(content).trim() === '') {
    preview.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Chưa có ghi chú — nhấn để thêm.</span>';
  } else {
    // Show up to 5 lines of formatted preview
    preview.innerHTML = content;
  }
}

function openNoteEditor() {
  if (!skillDetailEditingId) return;
  const skill = loadSkills().find(s => s.id === skillDetailEditingId);
  if (!skill) return;

  const body = document.getElementById('note-editor-body');
  if (body) {
    body.innerHTML = skill.notes || '';
    body.focus();
  }
  updateNoteCount();
  updateToolbarState();

  const editor = document.getElementById('skill-note-editor');
  if (editor) editor.hidden = false;
}

function closeNoteEditor() {
  saveNoteContent();
  const editor = document.getElementById('skill-note-editor');
  if (editor) editor.hidden = true;
  // Refresh preview with saved content
  const skill = loadSkills().find(s => s.id === skillDetailEditingId);
  if (skill) renderNotePreview(skill);
}

function saveNoteContent() {
  if (!skillDetailEditingId) return;
  const body = document.getElementById('note-editor-body');
  if (!body) return;
  const html = body.innerHTML;
  const skills = loadSkills();
  const skill = skills.find(s => s.id === skillDetailEditingId);
  if (!skill || skill.notes === html) return;
  skill.notes = html;
  saveSkills(skills);
}

function autoSaveNote() {
  clearTimeout(noteAutoSaveTimer);
  noteAutoSaveTimer = setTimeout(saveNoteContent, 600);
  updateNoteCount();
  updateToolbarState();
}

function updateNoteCount() {
  const body = document.getElementById('note-editor-body');
  const countEl = document.getElementById('note-editor-count');
  if (!body || !countEl) return;
  const chars = stripHtml(body.innerHTML).length;
  countEl.textContent = chars ? `${chars} ký tự` : '';
}

function updateToolbarState() {
  const cmds = ['bold', 'italic', 'underline', 'strikeThrough',
                 'insertUnorderedList', 'insertOrderedList'];
  cmds.forEach(cmd => {
    const btn = document.querySelector(`.note-editor__btn[data-cmd="${cmd}"]`);
    if (!btn) return;
    try {
      btn.classList.toggle('note-editor__btn--active', document.queryCommandState(cmd));
    } catch { /* ignore */ }
  });
  // Heading button active state
  try {
    const block = document.queryCommandValue('formatBlock').toLowerCase();
    document.querySelector('.note-editor__btn[data-val="h2"]')
      ?.classList.toggle('note-editor__btn--active', block === 'h2');
  } catch { /* ignore */ }
}

function insertChecklistItem() {
  const body = document.getElementById('note-editor-body');
  if (!body) return;
  body.focus();
  // Insert a checklist line at cursor position
  const item = document.createElement('div');
  item.className = 'note-cl';
  item.innerHTML = '<span class="note-cl-box" contenteditable="false">☐</span><span class="note-cl-text">&nbsp;</span>';
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    // Find block-level ancestor within the editor
    while (node && node.parentNode !== body) node = node.parentNode;
    if (node && node.parentNode === body) {
      body.insertBefore(item, node.nextSibling);
    } else {
      body.appendChild(item);
    }
  } else {
    body.appendChild(item);
  }
  // Move cursor into the text span
  const textSpan = item.querySelector('.note-cl-text');
  if (textSpan && sel) {
    const range = document.createRange();
    range.setStart(textSpan, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  saveNoteContent();
}

function initNoteEditor() {
  document.getElementById('note-editor-close')?.addEventListener('click', closeNoteEditor);
  document.getElementById('note-open-btn')?.addEventListener('click', openNoteEditor);
  document.getElementById('skill-note-preview')?.addEventListener('click', openNoteEditor);

  // Toolbar — execCommand buttons
  document.querySelectorAll('.note-editor__btn[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault(); // don't lose editor focus
      const val = btn.dataset.val || null;
      document.execCommand(btn.dataset.cmd, false, val);
      updateToolbarState();
    });
  });

  // Checklist button
  document.getElementById('note-checklist-btn')?.addEventListener('mousedown', e => {
    e.preventDefault();
    insertChecklistItem();
  });

  // Checklist toggle on click (event delegation)
  document.getElementById('note-editor-body')?.addEventListener('click', e => {
    if (e.target.classList.contains('note-cl-box')) {
      const item = e.target.closest('.note-cl');
      if (!item) return;
      const isDone = item.classList.toggle('note-cl--done');
      e.target.textContent = isDone ? '☑' : '☐';
      saveNoteContent();
    }
  });

  // Auto-save + toolbar state update
  document.getElementById('note-editor-body')?.addEventListener('input', autoSaveNote);
  document.addEventListener('selectionchange', () => {
    const editor = document.getElementById('skill-note-editor');
    if (!editor?.hidden) updateToolbarState();
  });

  // Keyboard: Enter in a checklist item creates another checklist item
  document.getElementById('note-editor-body')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const node = sel.getRangeAt(0).startContainer;
      const clItem = node.nodeType === 3
        ? node.parentElement?.closest('.note-cl')
        : node.closest?.('.note-cl');
      if (clItem) {
        e.preventDefault();
        insertChecklistItem();
      }
    }
  });
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


// ── 12. Boot ────────────────────────────────────────────────

function initSkillsTracker() {
  migrateSkillsSchema();
  renderIconPicker();
  renderSkills();

  document.getElementById('skill-add-form')?.addEventListener('submit', handleSaveSkill);

  // Folder open/close
  document.getElementById('skill-detail-close')?.addEventListener('click', closeSkillDetail);

  // Note editor
  initNoteEditor();

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

  // Flush timer on page unload (safety: preserves time if app is killed
  // or the browser navigates the page away without the user pressing ←).
  window.addEventListener('beforeunload', () => flushTimerToStorage());

  // BFCache restore (user pressed Back after Pi Browser navigated away):
  // resumeSkillId is already handled below; pageshow just ensures the
  // timer starts if the folder was re-opened via BFCache state.
  window.addEventListener('pageshow', e => {
    if ((e.persisted || document.visibilityState === 'visible') && skillDetailEditingId && timerSessionStart === null) {
      startTimerSession();
    }
  });

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
