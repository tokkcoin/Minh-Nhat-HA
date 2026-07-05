/* ============================================================
   Life Balance — characterPanel.js
   Home-page "character" panel (index.html only): real numbers read
   straight from each element's own localStorage data (no separate
   "character" data model of its own), shown as an always-visible
   stat list. The 5 equipment icons next to it are plain <a href>
   shortcuts to each element's page (see index.html) — no JS wiring
   needed there, so this file only renders the stat list.
   ============================================================ */

'use strict';

// Stat list order — matches the rest of the home page (main.js's
// HOW_PREVIEW_ELEMENTS / DAILY_SOURCES order).
const CHARACTER_STAT_ORDER = ['metal', 'wood', 'water', 'fire', 'earth'];

// ── 1. Per-element stat readers ─────────────────────────────
// Each reads the same localStorage key its own element page already
// owns (finance.html/health.js/skills.js/situation.js) and derives a
// few display lines — never writes anything, never duplicates state.

function characterReadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function computeMetalStat() {
  const state = characterReadJson('lifebalance_finance_state', null);
  const pools = state?.pools;
  if (!pools) return ['Chưa có dữ liệu — hãy mở trang Kim (Tài chính) và nhập vốn.'];
  const total = Object.values(pools).reduce((sum, p) => sum + (p.principal || 0), 0);
  if (total <= 0) return ['Chưa phân bổ vốn nào — hãy mở trang Kim (Tài chính).'];
  return [
    `Tổng vốn đã phân bổ: ${total.toLocaleString('vi-VN')}đ`,
    `Đầu tư: ${(pools.invest?.principal || 0).toLocaleString('vi-VN')}đ`,
    `Tiết kiệm: ${(pools.savings?.principal || 0).toLocaleString('vi-VN')}đ`,
    `Phát triển bản thân: ${(pools.selfDev?.principal || 0).toLocaleString('vi-VN')}đ`,
    `Khẩn cấp: ${(pools.emergency?.principal || 0).toLocaleString('vi-VN')}đ`,
  ];
}

function computeWoodStat() {
  const quests = characterReadJson('lifebalance_health_quests', []);
  if (!quests.length) return ['Chưa có nhiệm vụ nào — hãy mở trang Mộc (Sức khoẻ).'];
  const totalXp = quests.reduce((sum, q) => sum + q.completedPeriods.length * q.xp, 0);
  const level = Math.floor(totalXp / 100) + 1;
  const doneAtLeastOnce = quests.filter(q => q.completedPeriods.length > 0).length;
  return [
    `Cấp độ: ${level}`,
    `Tổng EXP: ${totalXp}`,
    `Nhiệm vụ đã từng hoàn thành: ${doneAtLeastOnce}/${quests.length}`,
  ];
}

// Mirrors skills.js's STAR_THRESHOLDS — skill objects only ever store
// totalSeconds (see skills.js handleSaveSkill), stars are always derived,
// never persisted as a "level" field.
const CHARACTER_STAR_THRESHOLDS = [
  { hours: 500, stars: 5 },
  { hours: 365, stars: 4 },
  { hours: 150, stars: 3 },
  { hours: 35, stars: 2 },
  { hours: 5, stars: 1 },
];

function characterComputeStars(totalSeconds) {
  const hours = (totalSeconds || 0) / 3600;
  for (const t of CHARACTER_STAR_THRESHOLDS) if (hours >= t.hours) return t.stars;
  return 0;
}

function computeWaterStat() {
  const skills = characterReadJson('lifebalance_skills', []);
  if (!skills.length) return ['Chưa có kỹ năng nào — hãy mở trang Thuỷ (Kỹ năng).'];
  const stars = skills.map(s => characterComputeStars(s.totalSeconds));
  const avg = stars.reduce((sum, s) => sum + s, 0) / skills.length;
  const topIndex = stars.indexOf(Math.max(...stars));
  const top = skills[topIndex];
  return [
    `Số kỹ năng: ${skills.length}`,
    `Điểm trung bình: ${avg.toFixed(1)}★`,
    `Kỹ năng nổi bật: ${top.icon} ${top.name} (${stars[topIndex]}★)`,
  ];
}

function computeFireStat() {
  const quests = characterReadJson('lifebalance_mood_quests', []);
  if (!quests.length) return ['Chưa có việc thực hành nào — hãy mở trang Hoả (Cảm xúc).'];
  const totalXp = quests.reduce((sum, q) => sum + q.completedPeriods.length * q.xp, 0);
  const doneAtLeastOnce = quests.filter(q => q.completedPeriods.length > 0).length;
  return [
    `Hoả Khí tích luỹ: ${totalXp}`,
    `Việc thực hành đã từng hoàn thành: ${doneAtLeastOnce}/${quests.length}`,
  ];
}

function computeEarthStat() {
  const units = characterReadJson('lifebalance_situation_units', []);
  if (!units.length) return ['Chưa có mục tiêu nào — hãy mở trang Thổ (Vị thế).'];
  const counts = { frontline: 0, middle: 0, rear: 0 };
  units.forEach(u => { if (counts[u.zone] != null) counts[u.zone] += 1; });
  return [
    `Tổng mục tiêu: ${units.length}`,
    `🌤️ Thiên thời: ${counts.frontline}`,
    `🏞️ Địa lợi: ${counts.middle}`,
    `🤝 Nhân hoà: ${counts.rear}`,
  ];
}

const CHARACTER_STAT_FN = {
  metal: computeMetalStat,
  wood: computeWoodStat,
  water: computeWaterStat,
  fire: computeFireStat,
  earth: computeEarthStat,
};

// ── 2. Render ────────────────────────────────────────────────

function renderCharacterStats() {
  const container = document.getElementById('character-stats');
  if (!container) return;

  container.innerHTML = CHARACTER_STAT_ORDER.map(key => {
    const element = ELEMENTS[key];
    const lines = CHARACTER_STAT_FN[key]();
    return `
      <div class="character-stat-group" style="--el:var(--${key})">
        <div class="character-stat-group__head">
          <span class="character-stat-group__dot"></span>${element.icon} ${element.name} — ${element.dimension}
        </div>
        ${lines.map(line => `<p class="character-stat-group__line">${escapeHtml(line)}</p>`).join('')}
      </div>`;
  }).join('');
}

function initCharacterPanel() {
  renderCharacterStats();
}

// ── 3. Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initCharacterPanel);
});
