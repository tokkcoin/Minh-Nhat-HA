/* ============================================================
   Life Balance — weaponPrototype.js
   Standalone feasibility demo (weapon-prototype.html, not linked
   from nav) — visualizes each real skill from skills.html as a
   "weapon" that evolves through 5 rarity tiers as practice hours
   grow. Reads the same `lifebalance_skills` data skills.js owns;
   never writes to it. Falls back to a labeled demo set when no
   real skills exist yet, matching chart-concepts.html's convention.

   2026-08-25: tier thresholds now come from js/elementStats.js
   (shared with skills.js/characterPanel.js/game-wulin.js) instead of
   its own copy — requires elementStats.js loaded first.
   ============================================================ */

'use strict';

const WEAPON_SKILLS_KEY = 'lifebalance_skills';

const WEAPON_DEMO_SKILLS = [
  { id: 'demo-1', icon: '🎸', name: 'Guitar (demo)',    totalSeconds: 520 * 3600 },
  { id: 'demo-2', icon: '📚', name: 'Đọc sách (demo)',  totalSeconds: 180 * 3600 },
  { id: 'demo-3', icon: '🏃', name: 'Bóng đá (demo)',   totalSeconds: 40  * 3600 },
  { id: 'demo-4', icon: '🎨', name: 'Vẽ (demo)',         totalSeconds: 8   * 3600 },
  { id: 'demo-5', icon: '💻', name: 'Lập trình (demo)',  totalSeconds: 2   * 3600 },
];

function weaponTierFor(totalSeconds) {
  return ElementStats.tierFor(totalSeconds);
}

// Next (higher) tier to progress toward, or null once already maxed.
function weaponNextTier(tier) {
  const tiers = ElementStats.STAR_TIERS;
  if (tier.key === 'none') return tiers[tiers.length - 1];
  const idx = tiers.findIndex(t => t.key === tier.key);
  return idx > 0 ? tiers[idx - 1] : null;
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
    ? Math.max(0, Math.min(100, Math.round(((hours - tier.hours) / (next.hours - tier.hours)) * 100)))
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
        <div class="weapon-card__next">→ ${next.label} tại ${next.hours}h</div>
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
