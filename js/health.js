/* ============================================================
   Life Balance — health.js
   Quest system for the Wood (Health) element — Main/Side/Daily/
   Weekly/Monthly quests, wuxia-MMO style, with XP + levels.
   Replaces an earlier "kỷ luật thép" target/streak tracker the
   user found too heavy/metal-like; kept simple by design.
   ============================================================ */

'use strict';

// ── 1. Storage Keys & Constants ─────────────────────────────

const HEALTH_QUESTS_KEY = 'lifebalance_health_quests';
const HEALTH_XP_PER_LEVEL = 100;

const QUEST_CATEGORIES = [
  { key: 'main',    label: 'Nhiệm vụ chính', icon: '🏆', defaultXp: 100 },
  { key: 'side',    label: 'Nhiệm vụ phụ',   icon: '⚔️', defaultXp: 30 },
  { key: 'daily',   label: 'Hàng ngày',       icon: '📅', defaultXp: 10 },
  { key: 'weekly',  label: 'Hàng tuần',       icon: '🗓️', defaultXp: 50 },
  { key: 'monthly', label: 'Hàng tháng',      icon: '📆', defaultXp: 200 },
];

// Starter content for the "🌱 Tạo nhiệm vụ mẫu" button — 10 quests per
// category, covering health/eating/sports/rest/sleep, for the user to
// edit/trim/replace as they like. Appended on click, never auto-seeded,
// so it can never silently duplicate or overwrite anything.
const SEED_QUESTS = [
  // Nhiệm vụ chính — cột mốc lớn, một lần, được giữ lại
  { title: 'Hoàn thành 30 ngày ăn uống lành mạnh liên tục', category: 'main', xp: 200 },
  { title: 'Chạy bộ 5km không nghỉ lần đầu tiên', category: 'main', xp: 150 },
  { title: 'Đạt mục tiêu cân nặng đã đề ra', category: 'main', xp: 300 },
  { title: 'Ngủ đủ 7-8 tiếng liên tục trong 30 ngày', category: 'main', xp: 200 },
  { title: 'Hoàn thành thử thách 10.000 bước/ngày trong 1 tháng', category: 'main', xp: 200 },
  { title: 'Bỏ hoàn toàn nước ngọt/đồ uống có gas trong 1 tháng', category: 'main', xp: 150 },
  { title: 'Hoàn thành một khoá tập gym/yoga cơ bản', category: 'main', xp: 150 },
  { title: 'Tham gia và hoàn thành một giải chạy/đi bộ phong trào', category: 'main', xp: 250 },
  { title: 'Duy trì nhật ký ăn uống đủ 30 ngày', category: 'main', xp: 150 },
  { title: 'Cải thiện rõ rệt một chỉ số sức khoẻ sau 3 tháng', category: 'main', xp: 300 },
  // Nhiệm vụ phụ — việc nhỏ, một lần, được giữ lại
  { title: 'Thử một món ăn lành mạnh chưa từng nấu', category: 'side', xp: 20 },
  { title: 'Đi bộ cầu thang thay vì thang máy cả ngày', category: 'side', xp: 20 },
  { title: 'Học một bài tập thở thư giãn mới', category: 'side', xp: 20 },
  { title: 'Tự nấu một bữa ăn lành mạnh tại nhà', category: 'side', xp: 30 },
  { title: 'Thử một bộ môn thể thao mới (bơi, đạp xe…)', category: 'side', xp: 40 },
  { title: 'Đi ngủ trước 22h để thử cảm giác ngủ sớm', category: 'side', xp: 20 },
  { title: 'Detox mạng xã hội một ngày để đầu óc nghỉ ngơi', category: 'side', xp: 30 },
  { title: 'Mua một dụng cụ hỗ trợ tập luyện (dây nhảy, tạ tay…)', category: 'side', xp: 20 },
  { title: 'Đo và ghi lại các chỉ số cơ thể lần đầu', category: 'side', xp: 20 },
  { title: 'Tham gia một buổi tập nhóm/cộng đồng thể thao', category: 'side', xp: 40 },
  // Hàng ngày — lặp lại mỗi ngày
  { title: 'Uống đủ 2 lít nước', category: 'daily', xp: 10 },
  { title: 'Ăn sáng đầy đủ dinh dưỡng', category: 'daily', xp: 10 },
  { title: 'Ăn rau xanh trong mỗi bữa ăn', category: 'daily', xp: 10 },
  { title: 'Tập thể dục/vận động ít nhất 15 phút', category: 'daily', xp: 15 },
  { title: 'Đi bộ 30 phút', category: 'daily', xp: 10 },
  { title: 'Đi ngủ trước 23h', category: 'daily', xp: 15 },
  { title: 'Ngủ đủ 7-8 tiếng', category: 'daily', xp: 15 },
  { title: 'Không ăn đồ ăn nhanh/chiên rán', category: 'daily', xp: 10 },
  { title: 'Thiền hoặc thư giãn 10 phút', category: 'daily', xp: 10 },
  { title: 'Giãn cơ (stretch) buổi sáng 5 phút', category: 'daily', xp: 10 },
  // Hàng tuần — lặp lại mỗi tuần
  { title: 'Tập gym/chạy bộ ít nhất 3 buổi', category: 'weekly', xp: 50 },
  { title: 'Nấu ăn tại nhà ít nhất 5 ngày', category: 'weekly', xp: 40 },
  { title: 'Một ngày hoàn toàn không màn hình để nghỉ ngơi', category: 'weekly', xp: 40 },
  { title: 'Đi bộ đường dài hoặc leo núi một lần', category: 'weekly', xp: 50 },
  { title: 'Tập yoga/giãn cơ sâu 2 buổi', category: 'weekly', xp: 40 },
  { title: 'Theo dõi và ghi lại cân nặng một lần', category: 'weekly', xp: 20 },
  { title: 'Dọn dẹp và thay ga giường để ngủ ngon hơn', category: 'weekly', xp: 20 },
  { title: 'Chuẩn bị thực đơn ăn uống cho tuần tới', category: 'weekly', xp: 30 },
  { title: 'Ngủ đủ giấc cả 7 ngày trong tuần', category: 'weekly', xp: 60 },
  { title: 'Nấu thử một món ăn lành mạnh mới', category: 'weekly', xp: 30 },
  // Hàng tháng — lặp lại mỗi tháng
  { title: 'Khám sức khoẻ hoặc kiểm tra cơ bản định kỳ', category: 'monthly', xp: 150 },
  { title: 'Đo lại chỉ số cơ thể (cân nặng, vòng eo…)', category: 'monthly', xp: 100 },
  { title: 'Đặt mục tiêu thể thao mới cho tháng tới', category: 'monthly', xp: 80 },
  { title: 'Đánh giá và điều chỉnh lại chế độ ăn uống', category: 'monthly', xp: 100 },
  { title: 'Mua sắm thực phẩm lành mạnh đầu tháng', category: 'monthly', xp: 60 },
  { title: 'Thử một môn thể thao/hoạt động mới', category: 'monthly', xp: 100 },
  { title: 'Dọn dẹp không gian ngủ, kiểm tra chăn/gối/nệm', category: 'monthly', xp: 60 },
  { title: 'Lên kế hoạch thực đơn cho cả tháng', category: 'monthly', xp: 100 },
  { title: 'Đánh giá lại tiến độ luyện tập tháng qua', category: 'monthly', xp: 80 },
  { title: 'Dành một ngày nghỉ dưỡng/spa để thư giãn hoàn toàn', category: 'monthly', xp: 120 },
];

// Which existing quest (if any) the add-row is currently editing.
let questEditingId = null;

// Last-seen period keys, so a setInterval tick can detect "the day/week/
// month just rolled over while this tab was open" and re-render without
// requiring a reload — daily/weekly/monthly quests should un-check
// themselves live, not just the next time the page happens to load.
let lastSeenPeriodKeys = { daily: null, weekly: null, monthly: null };

// Image attach state for the add-row: a freshly-picked File pending
// upload, and whether an existing quest's image should be dropped on
// save (distinct from "no change" — a quest being edited keeps its
// current imageUrl unless one of these says otherwise).
let pendingQuestImageFile = null;
let removeExistingQuestImage = false;

// Quest ids checked via the bulk-select checkbox (separate from the
// completion checkbox) — survives across renderQuests() calls so the
// bulk bar stays accurate after a toggle/edit/period-rollover re-render.
let selectedQuestIds = new Set();

// ── 2. Load / Save ───────────────────────────────────────────

function loadQuests() {
  try {
    const stored = JSON.parse(localStorage.getItem(HEALTH_QUESTS_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveQuests(quests) {
  return safeSetItem(HEALTH_QUESTS_KEY, JSON.stringify(quests));
}

// One-time migration: the page used to have a separate free-form daily
// task checklist (lifebalance_health_tasks/_task_log) before quests
// existed, plus an even older target/streak tracker (lifebalance_
// health_config/_logs) that the user explicitly asked to drop entirely.
// Folds any real task data forward as 'daily' quests; never re-runs
// once HEALTH_QUESTS_KEY exists.
function migrateLegacyHealthData() {
  if (localStorage.getItem(HEALTH_QUESTS_KEY) != null) return;

  let legacyTasks = [];
  let legacyTaskLog = {};
  try { legacyTasks = JSON.parse(localStorage.getItem('lifebalance_health_tasks')) || []; } catch { /* none */ }
  try { legacyTaskLog = JSON.parse(localStorage.getItem('lifebalance_health_task_log')) || {}; } catch { /* none */ }

  const migrated = legacyTasks.map(t => ({
    id: t.id,
    title: t.text,
    category: 'daily',
    xp: 10,
    createdAt: t.createdAt || new Date().toISOString(),
    completedPeriods: legacyTaskLog[t.id] || [],
  }));
  saveQuests(migrated);

  localStorage.removeItem('lifebalance_health_config');
  localStorage.removeItem('lifebalance_health_logs');
  localStorage.removeItem('lifebalance_health_tasks');
  localStorage.removeItem('lifebalance_health_task_log');
}

// ── 3. Period keys (recurring quests reset on a rolling window) ─

// Local calendar date, not toISOString() (which is UTC) — a UTC slice
// rolls the "day" over at midnight UTC, e.g. 7am local for a UTC+7 user,
// not at their actual local midnight.
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayKey() {
  return formatLocalDate(new Date());
}

function weekKey(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); // back to this week's Monday
  return formatLocalDate(d);
}

function monthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentPeriodKey(category) {
  if (category === 'daily') return todayKey();
  if (category === 'weekly') return weekKey();
  if (category === 'monthly') return monthKey();
  return 'once'; // main/side quests complete once, no recurrence
}

// ── 4. XP & Level ─────────────────────────────────────────────

function computeTotalXp(quests) {
  return quests.reduce((sum, q) => sum + q.completedPeriods.length * q.xp, 0);
}

function computeLevel(totalXp) {
  return {
    level: Math.floor(totalXp / HEALTH_XP_PER_LEVEL) + 1,
    xpInLevel: totalXp % HEALTH_XP_PER_LEVEL,
  };
}

function renderXpBar(quests) {
  const { level, xpInLevel } = computeLevel(computeTotalXp(quests));
  const levelEl = document.getElementById('quest-level');
  const xpCurrentEl = document.getElementById('quest-xp-current');
  const xpFillEl = document.getElementById('quest-xp-fill');
  if (levelEl) levelEl.textContent = level;
  if (xpCurrentEl) xpCurrentEl.textContent = xpInLevel;
  if (xpFillEl) xpFillEl.style.width = `${(xpInLevel / HEALTH_XP_PER_LEVEL) * 100}%`;
}

// ── 5. Render ────────────────────────────────────────────────

function renderQuestRow(quest) {
  const key = currentPeriodKey(quest.category);
  const done = quest.completedPeriods.includes(key);
  return `
    <div class="health-task ${done ? 'health-task--done' : ''}">
      <input type="checkbox" class="quest-select-check" data-quest-select="${quest.id}" ${selectedQuestIds.has(quest.id) ? 'checked' : ''} aria-label="Chọn để xoá" />
      <label class="health-task__check">
        <input type="checkbox" data-quest-toggle="${quest.id}" ${done ? 'checked' : ''} />
        ${quest.imageUrl ? `<img src="${quest.imageUrl}" class="quest-thumb" alt="" />` : ''}
        <span class="health-task__text">${escapeHtml(quest.title)}</span>
      </label>
      <span class="quest-xp-badge">+${quest.xp} XP</span>
      <button type="button" class="finance-pool__edit-btn" data-quest-edit="${quest.id}" aria-label="Sửa nhiệm vụ">✏️</button>
      <button type="button" class="finance-modal__item-delete" data-quest-delete="${quest.id}" aria-label="Xoá nhiệm vụ">🗑</button>
    </div>`;
}

function renderQuestGroup(meta, quests) {
  const inGroup = quests.filter(q => q.category === meta.key);
  const rows = inGroup.length
    ? inGroup.map(renderQuestRow).join('')
    : '<p class="finance-modal__empty">Chưa có nhiệm vụ nào.</p>';
  return `
    <div class="quest-group">
      <h3 class="quest-group__title">${meta.icon} ${meta.label}</h3>
      <div class="quest-group__list">${rows}</div>
    </div>`;
}

function renderQuests() {
  const container = document.getElementById('quest-groups');
  if (!container) return;
  const quests = loadQuests();

  // Drop selections for quests that no longer exist (deleted individually,
  // or edited away) so the bulk bar's count never lies.
  const liveIds = new Set(quests.map(q => q.id));
  selectedQuestIds.forEach(id => { if (!liveIds.has(id)) selectedQuestIds.delete(id); });

  container.innerHTML = QUEST_CATEGORIES.map(meta => renderQuestGroup(meta, quests)).join('');
  renderXpBar(quests);
  updateBulkBar();

  container.querySelectorAll('[data-quest-toggle]').forEach(checkbox => {
    checkbox.addEventListener('change', () => toggleQuest(checkbox.dataset.questToggle));
  });
  container.querySelectorAll('[data-quest-delete]').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteQuest(btn.dataset.questDelete));
  });
  container.querySelectorAll('[data-quest-edit]').forEach(btn => {
    btn.addEventListener('click', () => startEditQuest(btn.dataset.questEdit));
  });
  container.querySelectorAll('[data-quest-select]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const id = checkbox.dataset.questSelect;
      if (checkbox.checked) selectedQuestIds.add(id);
      else selectedQuestIds.delete(id);
      updateBulkBar();
    });
  });
}

// ── 6. Actions ───────────────────────────────────────────────

function toggleQuest(questId) {
  const quests = loadQuests();
  const quest = quests.find(q => q.id === questId);
  if (!quest) return;

  const levelBefore = computeLevel(computeTotalXp(quests)).level;
  const key = currentPeriodKey(quest.category);
  const has = quest.completedPeriods.includes(key);
  quest.completedPeriods = has ? quest.completedPeriods.filter(k => k !== key) : [...quest.completedPeriods, key];
  if (!saveQuests(quests)) return;

  renderQuests();
  const levelAfter = computeLevel(computeTotalXp(quests)).level;
  if (levelAfter > levelBefore) showToast(`🎉 Lên cấp ${levelAfter}!`, 4000);
}

function setQuestImagePreview(url) {
  const preview = document.getElementById('quest-new-image-preview');
  const removeBtn = document.getElementById('quest-new-image-remove');
  if (preview) {
    preview.src = url || '';
    preview.hidden = !url;
  }
  if (removeBtn) removeBtn.hidden = !url;
}

function resetQuestForm() {
  questEditingId = null;
  pendingQuestImageFile = null;
  removeExistingQuestImage = false;
  const titleInput = document.getElementById('quest-new-title');
  const categorySelect = document.getElementById('quest-new-category');
  const xpInput = document.getElementById('quest-new-xp');
  const addBtn = document.getElementById('quest-add-btn');
  const fileInput = document.getElementById('quest-new-image-file');
  if (titleInput) titleInput.value = '';
  if (categorySelect) categorySelect.value = 'daily';
  if (xpInput) xpInput.value = QUEST_CATEGORIES.find(c => c.key === 'daily').defaultXp;
  if (addBtn) addBtn.textContent = 'Thêm';
  if (fileInput) fileInput.value = '';
  setQuestImagePreview(null);
}

function startEditQuest(questId) {
  const quest = loadQuests().find(q => q.id === questId);
  if (!quest) return;
  questEditingId = questId;
  pendingQuestImageFile = null;
  removeExistingQuestImage = false;
  const titleInput = document.getElementById('quest-new-title');
  const categorySelect = document.getElementById('quest-new-category');
  const xpInput = document.getElementById('quest-new-xp');
  const addBtn = document.getElementById('quest-add-btn');
  if (titleInput) titleInput.value = quest.title;
  if (categorySelect) categorySelect.value = quest.category;
  if (xpInput) xpInput.value = quest.xp;
  if (addBtn) addBtn.textContent = 'Lưu';
  setQuestImagePreview(quest.imageUrl || null);
  titleInput?.focus();
}

async function handleSaveQuest() {
  const titleInput = document.getElementById('quest-new-title');
  const categorySelect = document.getElementById('quest-new-category');
  const xpInput = document.getElementById('quest-new-xp');
  const addBtn = document.getElementById('quest-add-btn');
  const title = titleInput?.value.trim();
  const category = categorySelect?.value || 'daily';
  const xp = Number(xpInput?.value) || 0;

  if (!title) {
    showToast('Nhập tên nhiệm vụ');
    return;
  }

  const quests = loadQuests();
  const existing = questEditingId ? quests.find(q => q.id === questEditingId) : null;
  let imageUrl = existing?.imageUrl || null;

  if (pendingQuestImageFile) {
    addBtn.disabled = true;
    showToast('Đang tải ảnh lên...');
    try {
      imageUrl = await uploadMediaToCloudinary(pendingQuestImageFile);
    } catch {
      showToast('Tải ảnh thất bại — kiểm tra kết nối và thử lại');
      addBtn.disabled = false;
      return;
    }
    addBtn.disabled = false;
  } else if (removeExistingQuestImage) {
    imageUrl = null;
  }

  let updated;
  if (questEditingId) {
    updated = quests.map(q => q.id === questEditingId ? { ...q, title, category, xp, imageUrl } : q);
  } else {
    updated = [...quests, { id: `${Date.now()}`, title, category, xp, imageUrl, createdAt: new Date().toISOString(), completedPeriods: [] }];
  }
  if (!saveQuests(updated)) return;

  resetQuestForm();
  renderQuests();
}

function handleDeleteQuest(questId) {
  const quests = loadQuests().filter(q => q.id !== questId);
  if (!saveQuests(quests)) return;
  if (questEditingId === questId) resetQuestForm();
  selectedQuestIds.delete(questId);
  renderQuests();
}

// ── 6b. Bulk select & delete ───────────────────────────────────

function updateBulkBar() {
  const bar = document.getElementById('quest-bulk-bar');
  const countEl = document.getElementById('quest-bulk-count');
  if (!bar || !countEl) return;
  const count = selectedQuestIds.size;
  bar.hidden = count === 0;
  countEl.textContent = `${count} nhiệm vụ đã chọn`;
}

function handleBulkDelete() {
  if (selectedQuestIds.size === 0) return;
  const quests = loadQuests().filter(q => !selectedQuestIds.has(q.id));
  if (!saveQuests(quests)) return;
  if (questEditingId && selectedQuestIds.has(questEditingId)) resetQuestForm();
  showToast(`Đã xoá ${selectedQuestIds.size} nhiệm vụ`, 3000);
  selectedQuestIds.clear();
  renderQuests();
}

function handleBulkClear() {
  selectedQuestIds.clear();
  renderQuests();
}

function handleSeedQuests() {
  const quests = loadQuests();
  const seeded = SEED_QUESTS.map((q, i) => ({
    id: `${Date.now()}-${i}`,
    title: q.title,
    category: q.category,
    xp: q.xp,
    imageUrl: null,
    createdAt: new Date().toISOString(),
    completedPeriods: [],
  }));
  if (!saveQuests([...quests, ...seeded])) return;
  showToast(`Đã thêm ${seeded.length} nhiệm vụ mẫu — tự chỉnh sửa cho phù hợp nhé`, 4000);
  renderQuests();
}

// ── 7. Live period rollover (no reload needed) ────────────────

function checkPeriodRollover() {
  const keys = { daily: todayKey(), weekly: weekKey(), monthly: monthKey() };
  const changed = keys.daily !== lastSeenPeriodKeys.daily
    || keys.weekly !== lastSeenPeriodKeys.weekly
    || keys.monthly !== lastSeenPeriodKeys.monthly;
  lastSeenPeriodKeys = keys;
  if (changed) renderQuests();
}

// ── 8. Boot ──────────────────────────────────────────────────

function initHealthTracker() {
  migrateLegacyHealthData();
  renderQuests();
  lastSeenPeriodKeys = { daily: todayKey(), weekly: weekKey(), monthly: monthKey() };
  setInterval(checkPeriodRollover, 30_000);

  document.getElementById('quest-seed-btn')?.addEventListener('click', handleSeedQuests);
  document.getElementById('quest-bulk-delete-btn')?.addEventListener('click', handleBulkDelete);
  document.getElementById('quest-bulk-clear-btn')?.addEventListener('click', handleBulkClear);

  document.getElementById('quest-new-category')?.addEventListener('change', (e) => {
    const meta = QUEST_CATEGORIES.find(c => c.key === e.target.value);
    const xpInput = document.getElementById('quest-new-xp');
    if (xpInput && meta) xpInput.value = meta.defaultXp;
  });
  document.getElementById('quest-add-btn')?.addEventListener('click', handleSaveQuest);
  document.getElementById('quest-new-title')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSaveQuest(); }
  });

  const imageFileInput = document.getElementById('quest-new-image-file');
  document.getElementById('quest-new-image-btn')?.addEventListener('click', () => imageFileInput?.click());
  imageFileInput?.addEventListener('change', () => {
    const file = imageFileInput.files?.[0];
    if (!file) return;
    if (file.size > maxBytesForFile(file)) {
      showToast('Ảnh quá lớn (tối đa 10MB)');
      imageFileInput.value = '';
      return;
    }
    pendingQuestImageFile = file;
    removeExistingQuestImage = false;
    setQuestImagePreview(URL.createObjectURL(file));
  });
  document.getElementById('quest-new-image-remove')?.addEventListener('click', () => {
    pendingQuestImageFile = null;
    removeExistingQuestImage = true;
    if (imageFileInput) imageFileInput.value = '';
    setQuestImagePreview(null);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initHealthTracker);
});
