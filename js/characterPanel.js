/* ============================================================
   Life Balance — characterPanel.js
   Home-page "character sheet" (index.html only).

   2026-08-24: wired the compute*Stat readers below (already correct,
   just unused since 2026-07-05 — see git history) into the charsheet's
   "Phân bổ" values and the 5 Ngũ Hành tab chips, which now open a
   shared real-data panel instead of staying disabled ("Sắp mở"). The
   big stat-grid/Sinh-Khắc/formula block above the equip row is still
   the original interface-test mockup (per the user's original "chỉ up
   để test giao diện" request) — that part still needs the user's own
   design decisions on what those abstract stats mean, so it's left as
   clearly-labeled demo (see .charsheet__stats-note) rather than guessed
   at here.

   2026-08-25: compute*Stat below now reads through js/elementStats.js
   (shared with game-wulin.js/weaponPrototype.js) instead of its own
   copy of the localStorage keys/star-threshold table — see that file's
   header comment for why. requires elementStats.js loaded first.
   ============================================================ */

'use strict';

// Stat list order — matches the rest of the home page (main.js's
// HOW_PREVIEW_ELEMENTS / DAILY_SOURCES order).
const CHARACTER_STAT_ORDER = ['metal', 'wood', 'water', 'fire', 'earth'];

// Display metadata for the 5 Ngũ Hành tab chips / shared panel — icon +
// name match the hero-orbit nodes above, href matches the equip slots.
const CHARACTER_EL_META = {
  metal: { icon: '⛏️', name: 'Kim', dimension: 'Tài chính', href: 'finance.html' },
  wood: { icon: '🌳', name: 'Mộc', dimension: 'Sức khoẻ', href: 'health.html' },
  water: { icon: '💧', name: 'Thuỷ', dimension: 'Kỹ năng', href: 'skills.html' },
  fire: { icon: '🔥', name: 'Hoả', dimension: 'Cảm xúc', href: 'mood.html' },
  earth: { icon: '🪨', name: 'Thổ', dimension: 'Vị thế', href: 'situation.html' },
};

// ── 1. Per-element stat readers ─────────────────────────────
// Each reads the same localStorage key its own element page already
// owns (finance.html/health.js/skills.js/situation.js) and derives a
// few display lines — never writes anything, never duplicates state.

// Delegates to js/elementStats.js's generic JSON reader — kept as its
// own name here since it's also used for the dailyTasks.js widget keys
// below, which elementStats.js doesn't own (those are a separate
// per-page daily-checklist system, not part of the 5 elements' main
// stat derivation that game-wulin.js/weaponPrototype.js also read).
function characterReadJson(key, fallback) {
  return ElementStats.readJson(key, fallback);
}

// Shared by Metal/Water/Earth below — each of those pages also has its
// own daily-quest checklist (dailyTasks.js widget, a separate storage
// key from that element's main feature data), which Wood/Fire's own
// stat readers already fold in from their single combined quest key.
function characterDailyQuestSummary(key) {
  const quests = characterReadJson(key, []);
  if (!quests.length) return null;
  const totalXp = ElementStats.sumQuestXp(quests);
  const doneAtLeastOnce = quests.filter(q => q.completedPeriods.length > 0).length;
  return `Nhiệm vụ hàng ngày: ${totalXp} điểm tích luỹ (${doneAtLeastOnce}/${quests.length} đã từng hoàn thành)`;
}

function computeMetalStat() {
  const { pools, total } = ElementStats.readMetal();
  const lines = total > 0 ? [
    `Tổng vốn đã phân bổ: ${total.toLocaleString('vi-VN')}đ`,
    `Đầu tư: ${(pools.invest?.principal || 0).toLocaleString('vi-VN')}đ`,
    `Tiết kiệm: ${(pools.savings?.principal || 0).toLocaleString('vi-VN')}đ`,
    `Phát triển bản thân: ${(pools.selfDev?.principal || 0).toLocaleString('vi-VN')}đ`,
    `Khẩn cấp: ${(pools.emergency?.principal || 0).toLocaleString('vi-VN')}đ`,
  ] : ['Chưa phân bổ vốn nào — hãy mở trang Kim (Tài chính).'];
  const dailyLine = characterDailyQuestSummary('lifebalance_finance_quests');
  if (dailyLine) lines.push(dailyLine);
  return lines;
}

function computeWoodStat() {
  const { quests, totalXp, level, doneCount } = ElementStats.readWood();
  if (!quests.length) return ['Chưa có nhiệm vụ nào — hãy mở trang Mộc (Sức khoẻ).'];
  return [
    `Cấp độ: ${level}`,
    `Tổng EXP: ${totalXp}`,
    `Nhiệm vụ đã từng hoàn thành: ${doneCount}/${quests.length}`,
  ];
}

function computeWaterStat() {
  const { skills, starList, avgStars } = ElementStats.readWater();
  const lines = [];
  if (skills.length) {
    const topIndex = starList.indexOf(Math.max(...starList));
    const top = skills[topIndex];
    lines.push(
      `Số kỹ năng: ${skills.length}`,
      `Điểm trung bình: ${avgStars.toFixed(1)}★`,
      `Kỹ năng nổi bật: ${top.icon} ${top.name} (${starList[topIndex]}★)`,
    );
  } else {
    lines.push('Chưa có kỹ năng nào — hãy mở trang Thuỷ (Kỹ năng).');
  }
  const dailyLine = characterDailyQuestSummary('lifebalance_skills_quests');
  if (dailyLine) lines.push(dailyLine);
  return lines;
}

function computeFireStat() {
  const { quests, totalXp, doneCount } = ElementStats.readFire();
  if (!quests.length) return ['Chưa có việc thực hành nào — hãy mở trang Hoả (Cảm xúc).'];
  return [
    `Hoả Khí tích luỹ: ${totalXp}`,
    `Việc thực hành đã từng hoàn thành: ${doneCount}/${quests.length}`,
  ];
}

function computeEarthStat() {
  const { units, counts } = ElementStats.readEarth();
  const lines = [];
  if (units.length) {
    lines.push(
      `Tổng mục tiêu: ${units.length}`,
      `🌤️ Thiên thời: ${counts.frontline}`,
      `🏞️ Địa lợi: ${counts.middle}`,
      `🤝 Nhân hoà: ${counts.rear}`,
    );
  } else {
    lines.push('Chưa có mục tiêu nào — hãy mở trang Thổ (Vị thế).');
  }
  const dailyLine = characterDailyQuestSummary('lifebalance_situation_quests');
  if (dailyLine) lines.push(dailyLine);
  return lines;
}

const CHARACTER_STAT_FN = {
  metal: computeMetalStat,
  wood: computeWoodStat,
  water: computeWaterStat,
  fire: computeFireStat,
  earth: computeEarthStat,
};

// ── 2. Compact "Phân bổ" alloc-row values — one short real headline
// number per element, distinct from compute*Stat's fuller panel text
// above (same underlying reads, just reformatted to fit the tiny row).

function computeMetalAllocLabel() {
  const { total } = ElementStats.readMetal();
  if (total <= 0) return '–';
  return total >= 1_000_000 ? `${(total / 1_000_000).toFixed(1)}tr đ` : `${total.toLocaleString('vi-VN')}đ`;
}

function computeWoodAllocLabel() {
  const { quests, level } = ElementStats.readWood();
  return quests.length ? `Cấp ${level}` : '–';
}

function computeWaterAllocLabel() {
  const { skills } = ElementStats.readWater();
  return skills.length ? `${skills.length} kỹ năng` : '–';
}

function computeFireAllocLabel() {
  const { quests, totalXp } = ElementStats.readFire();
  return quests.length ? `${totalXp}⚡` : '–';
}

function computeEarthAllocLabel() {
  const { units } = ElementStats.readEarth();
  return units.length ? `${units.length} mục tiêu` : '–';
}

const CHARACTER_ALLOC_FN = {
  metal: computeMetalAllocLabel,
  wood: computeWoodAllocLabel,
  water: computeWaterAllocLabel,
  fire: computeFireAllocLabel,
  earth: computeEarthAllocLabel,
};

function renderCharsheetAlloc() {
  CHARACTER_STAT_ORDER.forEach(el => {
    const target = document.getElementById(`charsheet-alloc-${el}`);
    if (target) target.textContent = CHARACTER_ALLOC_FN[el]();
  });
}

// ── 3. Ngũ Hành tab chips — one shared real-data panel, re-rendered
// per clicked element via the compute*Stat readers above. Text nodes
// only (never innerHTML with the line text) since a couple of lines
// — e.g. Water's "top skill" name — embed real user-entered strings.

function renderCharsheetElPanel(el) {
  const panel = document.getElementById('charsheet-el-panel');
  const title = document.getElementById('charsheet-el-title');
  const lines = document.getElementById('charsheet-el-lines');
  const link = document.getElementById('charsheet-el-link');
  if (!panel || !title || !lines || !link) return;

  const meta = CHARACTER_EL_META[el];
  panel.style.setProperty('--el', `var(--${el})`);
  title.textContent = `☯ ${meta.icon} ${meta.name} — ${meta.dimension}`;

  lines.innerHTML = '';
  CHARACTER_STAT_FN[el]().forEach(text => {
    const row = document.createElement('div');
    row.className = 'charsheet__el-line';
    row.textContent = text;
    lines.appendChild(row);
  });

  link.href = meta.href;
  link.textContent = `Mở trang ${meta.name} →`;
}

function initCharsheetTabs() {
  const chips = document.querySelectorAll('.charsheet__tab-chip[data-el]');
  const panel = document.getElementById('charsheet-el-panel');
  if (!chips.length || !panel) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const wasOpen = chip.getAttribute('aria-expanded') === 'true' && !panel.hidden;
      chips.forEach(c => c.setAttribute('aria-expanded', 'false'));
      if (wasOpen) {
        panel.hidden = true;
        return;
      }
      renderCharsheetElPanel(chip.dataset.el);
      panel.hidden = false;
      chip.setAttribute('aria-expanded', 'true');
    });
  });
}

// ── 4. Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(renderCharsheetAlloc);
  runBootStep(initCharsheetTabs);
});
