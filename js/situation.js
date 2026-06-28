/* ============================================================
   Life Balance — situation.js
   Earth (Situation) element page — a strategic "battle formation"
   board for current goals/priorities. Each unit (a goal/priority)
   sits in one of three zones — Tiền tuyến (urgent) / Trung quân
   (in progress) / Hậu phương (reserve/long-term) — and is moved
   between zones with ▲/▼, not free-drag (more reliable on touch).
   ============================================================ */

'use strict';

// ── 1. Storage Key & Constants ──────────────────────────────

const SITUATION_UNITS_KEY = 'lifebalance_situation_units';

const FORMATION_ZONES = [
  { key: 'frontline', label: 'Thiên thời', icon: '🌤️', hint: 'Thời điểm, cơ hội' },
  { key: 'middle',    label: 'Địa lợi',    icon: '🏞️', hint: 'Vị trí, nguồn lực' },
  { key: 'rear',      label: 'Nhân hoà',   icon: '🤝', hint: 'Con người, quan hệ' },
];

// Which existing unit (if any) the add-form is currently editing.
let unitEditingId = null;

// ── 2. Load / Save ───────────────────────────────────────────

function loadUnits() {
  try {
    const stored = JSON.parse(localStorage.getItem(SITUATION_UNITS_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveUnits(units) {
  return safeSetItem(SITUATION_UNITS_KEY, JSON.stringify(units));
}

// ── 3. Render ────────────────────────────────────────────────

function renderUnitCard(unit) {
  const zoneIndex = FORMATION_ZONES.findIndex(z => z.key === unit.zone);
  return `
    <div class="formation-unit">
      <span class="formation-unit__name">${escapeHtml(unit.name)}</span>
      <div class="formation-unit__actions">
        <button type="button" data-unit-move="${unit.id}" data-dir="-1" ${zoneIndex === 0 ? 'disabled' : ''} aria-label="Chuyển lên tuyến trước">▲</button>
        <button type="button" data-unit-move="${unit.id}" data-dir="1" ${zoneIndex === FORMATION_ZONES.length - 1 ? 'disabled' : ''} aria-label="Chuyển xuống tuyến sau">▼</button>
        <button type="button" data-unit-edit="${unit.id}" aria-label="Sửa">✏️</button>
        <button type="button" data-unit-delete="${unit.id}" aria-label="Xoá">🗑</button>
      </div>
    </div>`;
}

function renderZoneSection(zone, units) {
  const inZone = units.filter(u => u.zone === zone.key);
  const rows = inZone.length
    ? inZone.map(renderUnitCard).join('')
    : '<p class="formation-empty">Chưa có mục tiêu nào ở tuyến này.</p>';
  return `
    <div class="formation-zone formation-zone--${zone.key}">
      <h3 class="formation-zone__title">${zone.icon} ${zone.label} <span class="formation-zone__hint">— ${zone.hint}</span></h3>
      <div class="formation-zone__list">${rows}</div>
    </div>`;
}

function renderFormation() {
  const container = document.getElementById('formation-zones');
  if (!container) return;
  const units = loadUnits();

  container.innerHTML = FORMATION_ZONES.map(zone => renderZoneSection(zone, units)).join('');

  container.querySelectorAll('[data-unit-move]').forEach(btn => {
    btn.addEventListener('click', () => handleMoveUnit(btn.dataset.unitMove, Number(btn.dataset.dir)));
  });
  container.querySelectorAll('[data-unit-edit]').forEach(btn => {
    btn.addEventListener('click', () => startEditUnit(btn.dataset.unitEdit));
  });
  container.querySelectorAll('[data-unit-delete]').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteUnit(btn.dataset.unitDelete));
  });
}

// ── 4. Actions ───────────────────────────────────────────────

function handleMoveUnit(unitId, dir) {
  const units = loadUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return;
  const currentIndex = FORMATION_ZONES.findIndex(z => z.key === unit.zone);
  const newIndex = currentIndex + dir;
  if (newIndex < 0 || newIndex >= FORMATION_ZONES.length) return;
  unit.zone = FORMATION_ZONES[newIndex].key;
  if (!saveUnits(units)) return;
  renderFormation();
}

function resetUnitForm() {
  unitEditingId = null;
  const nameInput = document.getElementById('formation-new-name');
  const zoneSelect = document.getElementById('formation-new-zone');
  const addBtn = document.getElementById('formation-add-btn');
  if (nameInput) nameInput.value = '';
  if (zoneSelect) zoneSelect.value = 'middle';
  if (addBtn) addBtn.textContent = 'Thêm';
}

function startEditUnit(unitId) {
  const unit = loadUnits().find(u => u.id === unitId);
  if (!unit) return;
  unitEditingId = unitId;
  const nameInput = document.getElementById('formation-new-name');
  const zoneSelect = document.getElementById('formation-new-zone');
  const addBtn = document.getElementById('formation-add-btn');
  if (nameInput) nameInput.value = unit.name;
  if (zoneSelect) zoneSelect.value = unit.zone;
  if (addBtn) addBtn.textContent = 'Lưu';
  nameInput?.focus();
  nameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handleSaveUnit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('formation-new-name');
  const zoneSelect = document.getElementById('formation-new-zone');
  const name = nameInput?.value.trim();
  const zone = zoneSelect?.value || 'middle';

  if (!name) {
    showToast('Nhập tên mục tiêu/ưu tiên');
    return;
  }

  const units = loadUnits();
  let updated;
  if (unitEditingId) {
    updated = units.map(u => u.id === unitEditingId ? { ...u, name, zone } : u);
  } else {
    updated = [...units, { id: `${Date.now()}`, name, zone, createdAt: new Date().toISOString() }];
  }
  if (!saveUnits(updated)) return;

  resetUnitForm();
  renderFormation();
}

function handleDeleteUnit(unitId) {
  const units = loadUnits().filter(u => u.id !== unitId);
  if (!saveUnits(units)) return;
  if (unitEditingId === unitId) resetUnitForm();
  renderFormation();
}

// ── 5. Boot ──────────────────────────────────────────────────

function initSituationTracker() {
  renderFormation();
  document.getElementById('formation-add-form')?.addEventListener('submit', handleSaveUnit);
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initSituationTracker);
});
