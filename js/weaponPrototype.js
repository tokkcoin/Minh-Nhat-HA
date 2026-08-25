/* ============================================================
   Life Balance — weaponPrototype.js
   Standalone feasibility demo (weapon-prototype.html, not linked
   from nav) — visualizes each real skill from skills.html as a
   "weapon" that evolves through 5 rarity tiers as practice hours
   grow. Reads the same `lifebalance_skills` data skills.js owns;
   never writes to it. Falls back to a labeled demo set when no
   real skills exist yet, matching chart-concepts.html's convention.
   ============================================================ */

'use strict';

const WEAPON_SKILLS_KEY = 'lifebalance_skills';

// Mirrors skills.js's STAR_THRESHOLDS — duplicated here (not imported)
// since this page doesn't load skills.js itself (that file's own
// DOMContentLoaded expects skill-grid/skill-detail-modal elements this
// page doesn't have). Keep in sync manually if thresholds ever change.
// Ordered highest-first so weaponTierFor() can just take the first match.
const WEAPON_TIERS = [
  { minHours: 500, stars: 5, key: 'legendary', label: 'Huyền thoại' },
  { minHours: 365, stars: 4, key: 'epic',      label: 'Tinh anh' },
  { minHours: 150, stars: 3, key: 'gold',      label: 'Thành thạo' },
  { minHours: 35,  stars: 2, key: 'silver',    label: 'Rèn luyện' },
  { minHours: 5,   stars: 1, key: 'bronze',    label: 'Sơ cấp' },
];
const WEAPON_TIER_NONE = { minHours: 0, stars: 0, key: 'none', label: 'Chưa rèn luyện' };

const WEAPON_DEMO_SKILLS = [
  { id: 'demo-1', icon: '🎸', name: 'Guitar (demo)',    totalSeconds: 520 * 3600 },
  { id: 'demo-2', icon: '📚', name: 'Đọc sách (demo)',  totalSeconds: 180 * 3600 },
  { id: 'demo-3', icon: '🏃', name: 'Bóng đá (demo)',   totalSeconds: 40  * 3600 },
  { id: 'demo-4', icon: '🎨', name: 'Vẽ (demo)',         totalSeconds: 8   * 3600 },
  { id: 'demo-5', icon: '💻', name: 'Lập trình (demo)',  totalSeconds: 2   * 3600 },
];

function weaponTierFor(totalSeconds) {
  const hours = (totalSeconds || 0) / 3600;
  return WEAPON_TIERS.find(t => hours >= t.minHours) || WEAPON_TIER_NONE;
}

// Next (higher) tier to progress toward, or null once already maxed.
function weaponNextTier(tier) {
  if (tier.key === 'none') return WEAPON_TIERS[WEAPON_TIERS.length - 1];
  const idx = WEAPON_TIERS.findIndex(t => t.key === tier.key);
  return idx > 0 ? WEAPON_TIERS[idx - 1] : null;
}

function loadWeaponSkills() {
  try {
    const stored = JSON.parse(localStorage.getItem(WEAPON_SKILLS_KEY));
    return Array.isArray(stored) && stored.length ? stored : null;
  } catch {
    return null;
  }
}

function formatWeaponHours(totalSeconds) {
  const hours = (totalSeconds || 0) / 3600;
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
}

function buildWeaponCard(skill) {
  const tier = weaponTierFor(skill.totalSeconds);
  const next = weaponNextTier(tier);
  const hours = (skill.totalSeconds || 0) / 3600;
  const progressPct = next
    ? Math.max(0, Math.min(100, Math.round(((hours - tier.minHours) / (next.minHours - tier.minHours)) * 100)))
    : 100;

  return `
    <div class="weapon-card weapon-card--${tier.key}">
      <div class="weapon-card__slot">
        <span class="weapon-card__icon">${skill.icon || '❔'}</span>
      </div>
      <div class="weapon-card__name">${escapeHtml(skill.name)}</div>
      <div class="weapon-card__tier">${tier.label}</div>
      <div class="weapon-card__hours">${formatWeaponHours(skill.totalSeconds)} luyện tập</div>
      ${next ? `
        <div class="weapon-card__progress" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ tới ${next.label}">
          <div class="weapon-card__progress-fill" style="width:${progressPct}%"></div>
        </div>
        <div class="weapon-card__next">→ ${next.label} tại ${next.minHours}h</div>
      ` : `<div class="weapon-card__next weapon-card__next--maxed">🏆 Cấp tối đa</div>`}
    </div>`;
}

function renderWeaponPrototype() {
  const grid = document.getElementById('weapon-grid');
  const note = document.getElementById('weapon-data-note');
  if (!grid) return;

  const real = loadWeaponSkills();
  const skills = real || WEAPON_DEMO_SKILLS;

  if (note) {
    note.textContent = real
      ? `Dữ liệu thật từ ${real.length} kỹ năng đã lưu ở trang Thuỷ (Kỹ năng).`
      : 'Chưa có kỹ năng nào được lưu — đang hiển thị dữ liệu demo (đánh dấu rõ) để xem hệ thống hoạt động ra sao. Mở trang Kỹ năng và luyện thử để thấy vũ khí thật tiến hoá.';
  }

  grid.innerHTML = skills.map(buildWeaponCard).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(renderWeaponPrototype);
});
