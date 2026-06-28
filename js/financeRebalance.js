/* ============================================================
   Life Balance — financeRebalance.js
   Allocation-formula tracker for the Metal (Money) element.
   All math is plain JS (auditable, no LLM in the loop) — the
   AI advisory layer planned on top of this reads the *output*
   of this engine, it never computes the numbers itself.
   ============================================================ */

'use strict';

// ── 1. Storage Keys & Constants ─────────────────────────────

const FINANCE_CONFIG_KEY = 'lifebalance_finance_config';
const FINANCE_STATE_KEY = 'lifebalance_finance_state';
const FINANCE_ACTUAL_KEY = 'lifebalance_finance_actual';
const FINANCE_REBALANCE_THRESHOLD_PCT = 5;
const FINANCE_PRICE_REFRESH_MS = 60_000;
const FINANCE_PI_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=vnd';

const FINANCE_POOLS = [
  { key: 'invest',    label: 'Đầu tư (Pi Network)', icon: '⛏️', hasLivePrice: true },
  { key: 'savings',   label: 'Tiết kiệm',           icon: '💰', hasLivePrice: false },
  { key: 'selfDev',   label: 'Phát triển bản thân', icon: '📚', hasLivePrice: false },
  { key: 'emergency', label: 'Khẩn cấp',            icon: '🚨', hasLivePrice: false },
];

// Shared between the pool cards' border/bar accents and the two pie charts,
// so a slice's color always means the same pool everywhere on the page.
const FINANCE_POOL_COLORS = {
  invest:    'var(--metal)',
  savings:   'var(--water)',
  selfDev:   'var(--wood)',
  emergency: 'var(--fire)',
};

// Module-level (not persisted) so warnings re-fire once per threshold
// crossing instead of spamming a toast on every price-refresh tick.
let financeWarnedKeys = new Set();
let financeLastPiPriceVnd = null;

// Which pool's sub-item modal is currently open (null when closed), and
// which existing sub-item (if any) the add-row is currently editing —
// the same row doubles as "add" and "edit" depending on this.
let financeModalEditingKey = null;
let financeModalEditingItemId = null;

// ── 2. Defaults ──────────────────────────────────────────────

function defaultFinanceConfig() {
  return { invest: 30, savings: 30, selfDev: 30, emergency: 10 };
}

// "Thực tế" (actual) panel — manually-entered figures kept separate from
// the formula-derived pools above, so the user can compare plan vs. reality.
// Each pool is a list of { id, label, amount, date } sub-items; the card
// only ever shows their sum, per the user's request to keep the UI uncluttered.
function defaultFinanceActual() {
  return { invest: [], savings: [], selfDev: [], emergency: [] };
}

function defaultFinanceState() {
  return {
    totalCapital: 0,
    monthlySalary: 0,
    income: 0,
    expense: 0,
    pools: {
      invest:    { principal: 0, priceAtBuy: null },
      savings:   { principal: 0 },
      selfDev:   { principal: 0 },
      emergency: { principal: 0 },
    },
  };
}

// ── 3. Load / Save (localStorage, same convention as common.js) ─

function loadFinanceConfig() {
  try {
    return { ...defaultFinanceConfig(), ...JSON.parse(localStorage.getItem(FINANCE_CONFIG_KEY)) };
  } catch {
    return defaultFinanceConfig();
  }
}

function saveFinanceConfig(config) {
  return safeSetItem(FINANCE_CONFIG_KEY, JSON.stringify(config));
}

function loadFinanceState() {
  try {
    const stored = JSON.parse(localStorage.getItem(FINANCE_STATE_KEY));
    if (!stored) return defaultFinanceState();
    const base = defaultFinanceState();
    return { ...base, ...stored, pools: { ...base.pools, ...stored.pools } };
  } catch {
    return defaultFinanceState();
  }
}

function saveFinanceState(state) {
  return safeSetItem(FINANCE_STATE_KEY, JSON.stringify(state));
}

function loadFinanceActual() {
  try {
    const stored = JSON.parse(localStorage.getItem(FINANCE_ACTUAL_KEY));
    if (!stored) return defaultFinanceActual();
    return { ...defaultFinanceActual(), ...stored };
  } catch {
    return defaultFinanceActual();
  }
}

function saveFinanceActual(actual) {
  return safeSetItem(FINANCE_ACTUAL_KEY, JSON.stringify(actual));
}

// ── 4. Real-time Pi Network price (public CoinGecko endpoint, no key) ─

async function fetchPiPriceVnd() {
  try {
    const res = await fetch(FINANCE_PI_PRICE_API);
    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
    const data = await res.json();
    const price = data?.['pi-network']?.vnd;
    if (typeof price === 'number') financeLastPiPriceVnd = price;
  } catch (err) {
    console.warn('Could not fetch Pi Network price:', err);
  }
  return financeLastPiPriceVnd;
}

// ── 5. Pool math ─────────────────────────────────────────────
// returnPct is the gain/loss of a pool since its principal was last
// set (by "Áp dụng vào 4 quỹ" or "Cân bằng lại") — this is the number
// the ±5% warning threshold applies to.

function computePoolViews(config, state) {
  const pools = state.pools;
  const investPrincipal = pools.invest.principal;
  const priceAtBuy = pools.invest.priceAtBuy;
  const investCurrentValue = (priceAtBuy && financeLastPiPriceVnd)
    ? investPrincipal * (financeLastPiPriceVnd / priceAtBuy)
    : investPrincipal;

  const currentValueByKey = {
    invest: investCurrentValue,
    savings: pools.savings.principal,
    selfDev: pools.selfDev.principal,
    emergency: pools.emergency.principal,
  };

  const totalCurrent = Object.values(currentValueByKey).reduce((sum, v) => sum + v, 0);

  return FINANCE_POOLS.map(meta => {
    const principal = pools[meta.key].principal;
    const currentValue = currentValueByKey[meta.key];
    const returnPct = principal > 0 ? ((currentValue - principal) / principal) * 100 : 0;
    const currentPct = totalCurrent > 0 ? (currentValue / totalCurrent) * 100 : 0;
    return {
      ...meta,
      targetPct: config[meta.key] ?? 0,
      principal,
      currentValue,
      currentPct,
      returnPct,
      needsRebalance: Math.abs(returnPct) >= FINANCE_REBALANCE_THRESHOLD_PCT,
    };
  });
}

// ── 6. Actions ───────────────────────────────────────────────

// Re-derives all 4 principals from the formula × totalCapital. Used both
// for the first-time/monthly setup and as the actual "rebalance" action
// (newTotal there is the post-gain/loss total, so this is what moves the
// realized profit/loss back across the 4 pools).
function allocatePoolsFromTotal(config, state, total) {
  FINANCE_POOLS.forEach(meta => {
    state.pools[meta.key].principal = (config[meta.key] / 100) * total;
  });
  state.pools.invest.priceAtBuy = financeLastPiPriceVnd;
  state.totalCapital = total;
  saveFinanceState(state);
  financeWarnedKeys.clear();
}

async function handleApplyTotal() {
  try {
    await fetchPiPriceVnd();
    const config = loadFinanceConfig();
    const state = loadFinanceState();
    state.monthlySalary = Number(document.getElementById('finance-salary')?.value) || 0;
    state.income = Number(document.getElementById('finance-income')?.value) || 0;
    state.expense = Number(document.getElementById('finance-expense')?.value) || 0;
    const total = Number(document.getElementById('finance-total-capital')?.value) || 0;
    allocatePoolsFromTotal(config, state, total);
    renderFinanceDashboard();
    showToast('Đã áp dụng công thức vào 4 quỹ');
  } catch (err) {
    console.warn('handleApplyTotal failed:', err);
    showToast('Không áp dụng được — thử lại sau');
  }
}

async function handleRebalanceNow() {
  try {
    await fetchPiPriceVnd();
    const config = loadFinanceConfig();
    const state = loadFinanceState();
    const views = computePoolViews(config, state);
    const newTotal = views.reduce((sum, v) => sum + v.currentValue, 0);
    allocatePoolsFromTotal(config, state, newTotal);
    renderFinanceDashboard();
    showToast('Đã cân bằng lại 4 quỹ theo công thức hiện tại');
  } catch (err) {
    console.warn('handleRebalanceNow failed:', err);
    showToast('Không cân bằng được — thử lại sau');
  }
}

function handleConfigSave() {
  const invest = Number(document.getElementById('finance-cfg-invest')?.value) || 0;
  const savings = Number(document.getElementById('finance-cfg-savings')?.value) || 0;
  const selfDev = Number(document.getElementById('finance-cfg-selfdev')?.value) || 0;
  const emergency = Number(document.getElementById('finance-cfg-emergency')?.value) || 0;
  const sum = invest + savings + selfDev + emergency;
  const hint = document.getElementById('finance-cfg-sum-hint');

  if (sum !== 100) {
    if (hint) hint.textContent = `Tổng đang là ${sum}% — cần đúng 100%`;
    showToast('Tổng tỷ lệ phải bằng 100%');
    return;
  }

  if (hint) hint.textContent = '';
  saveFinanceConfig({ invest, savings, selfDev, emergency });
  showToast('Đã lưu công thức phân bổ (áp dụng từ lần "Cân bằng lại" tiếp theo)');
}

// ── 7. Render ────────────────────────────────────────────────

function formatVnd(amount) {
  return `${Math.round(amount).toLocaleString('vi-VN')} đ`;
}

function renderFinancePoolCard(view) {
  const sign = view.returnPct > 0 ? '+' : '';
  const returnClass = view.returnPct > 0 ? 'finance-pool__return--up'
    : view.returnPct < 0 ? 'finance-pool__return--down' : '';
  const warnBadge = view.needsRebalance
    ? '<span class="finance-pool__badge finance-pool__badge--warning">⚠️ Cần cân bằng</span>'
    : '';
  const rebalanceBtn = view.needsRebalance
    ? '<button type="button" class="finance-pool__rebalance-btn" data-finance-rebalance>Cân bằng lại</button>'
    : '';

  return `
    <div class="finance-pool finance-pool--${view.key}">
      <div class="finance-pool__head">
        <span class="finance-pool__icon">${view.icon}</span>
        <span class="finance-pool__label">${escapeHtml(view.label)}</span>
        ${warnBadge}
      </div>
      <div class="finance-pool__value">${formatVnd(view.currentValue)}</div>
      <div class="finance-pool__bar-track">
        <div class="finance-pool__bar-fill finance-pool__bar-fill--${view.key}" style="width:${Math.min(view.currentPct, 100).toFixed(1)}%"></div>
      </div>
      <div class="finance-pool__meta">
        <span>Mục tiêu ${view.targetPct}%</span>
        <span>Hiện tại ${view.currentPct.toFixed(1)}%</span>
        ${view.hasLivePrice ? `<span class="finance-pool__return ${returnClass}">${sign}${view.returnPct.toFixed(1)}%</span>` : ''}
      </div>
      ${rebalanceBtn}
    </div>`;
}

function renderFinanceDashboard() {
  const container = document.getElementById('finance-pools');
  if (!container) return;

  const config = loadFinanceConfig();
  const state = loadFinanceState();
  const views = computePoolViews(config, state);

  views.forEach(view => {
    const wasWarned = financeWarnedKeys.has(view.key);
    if (view.needsRebalance && !wasWarned) {
      financeWarnedKeys.add(view.key);
      const direction = view.returnPct > 0 ? 'lãi' : 'lỗ';
      showToast(`⚠️ ${view.label} đang ${direction} ${Math.abs(view.returnPct).toFixed(1)}% — nên cân bằng lại`, 4000);
    } else if (!view.needsRebalance && wasWarned) {
      financeWarnedKeys.delete(view.key);
    }
  });

  container.innerHTML = views.map(renderFinancePoolCard).join('');
  container.querySelectorAll('[data-finance-rebalance]').forEach(btn => {
    btn.addEventListener('click', handleRebalanceNow);
  });
  renderFinanceCharts();
}

// ── 7b. "Thực tế" panel + sub-item modal ──────────────────────

function renderFinanceActualCard(meta, items) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return `
    <div class="finance-pool finance-pool--${meta.key}">
      <div class="finance-pool__head">
        <span class="finance-pool__icon">${meta.icon}</span>
        <span class="finance-pool__label">${escapeHtml(meta.label)}</span>
        <button type="button" class="finance-pool__edit-btn" data-finance-edit="${meta.key}" aria-label="Sửa ${escapeHtml(meta.label)}">✏️</button>
      </div>
      <div class="finance-pool__value">${formatVnd(total)}</div>
      <div class="finance-pool__meta"><span>${items.length} danh mục con</span></div>
    </div>`;
}

function renderFinanceActualPools() {
  const container = document.getElementById('finance-actual-pools');
  if (!container) return;
  const actual = loadFinanceActual();
  container.innerHTML = FINANCE_POOLS.map(meta => renderFinanceActualCard(meta, actual[meta.key] || [])).join('');
  container.querySelectorAll('[data-finance-edit]').forEach(btn => {
    btn.addEventListener('click', () => openFinanceSubitemModal(btn.dataset.financeEdit));
  });
  renderFinanceCharts();
}

// ── 7c. Pie charts (CSS conic-gradient — no chart library, see tech-defaults.md) ─
// Both charts read straight off whatever's already on screen: the "Mục tiêu"
// pie uses the same currentValue computePoolViews() already derived for the
// cards above, the "Thực tế" pie sums the same sub-items the cards above show.

function buildConicGradient(slices) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return 'var(--border)';
  let cumulative = 0;
  const stops = slices.map(s => {
    const startPct = (cumulative / total) * 100;
    cumulative += s.value;
    const endPct = (cumulative / total) * 100;
    return `${s.color} ${startPct.toFixed(2)}% ${endPct.toFixed(2)}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

function renderFinancePieChart(pieId, legendId, totalId, slices) {
  const pie = document.getElementById(pieId);
  const legend = document.getElementById(legendId);
  const totalEl = document.getElementById(totalId);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (pie) pie.style.background = buildConicGradient(slices);
  if (totalEl) totalEl.textContent = `Tổng: ${formatVnd(total)}`;
  if (!legend) return;

  if (total <= 0) {
    legend.innerHTML = '<li class="finance-chart__legend-empty">Chưa có dữ liệu</li>';
    return;
  }
  legend.innerHTML = slices.map(s => `
    <li class="finance-chart__legend-item">
      <span class="finance-chart__legend-dot" style="background:${s.color}"></span>
      <span class="finance-chart__legend-label">${escapeHtml(s.label)}</span>
      <span class="finance-chart__legend-value">${formatVnd(s.value)} · ${((s.value / total) * 100).toFixed(0)}%</span>
    </li>`).join('');
}

function renderFinanceCharts() {
  const config = loadFinanceConfig();
  const state = loadFinanceState();
  const views = computePoolViews(config, state);
  const targetSlices = views.map(v => ({ label: v.label, value: v.currentValue, color: FINANCE_POOL_COLORS[v.key] }));
  renderFinancePieChart('finance-chart-target-pie', 'finance-chart-target-legend', 'finance-chart-target-total', targetSlices);

  const actual = loadFinanceActual();
  const actualSlices = FINANCE_POOLS.map(meta => ({
    label: meta.label,
    value: (actual[meta.key] || []).reduce((sum, item) => sum + item.amount, 0),
    color: FINANCE_POOL_COLORS[meta.key],
  }));
  renderFinancePieChart('finance-chart-actual-pie', 'finance-chart-actual-legend', 'finance-chart-actual-total', actualSlices);
}

function formatFinanceDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
}

function renderFinanceModalItems() {
  const list = document.getElementById('finance-modal-items');
  if (!list || !financeModalEditingKey) return;
  const actual = loadFinanceActual();
  const items = actual[financeModalEditingKey] || [];

  if (!items.length) {
    list.innerHTML = '<p class="finance-modal__empty">Chưa có danh mục con nào.</p>';
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="finance-modal__item">
      <div class="finance-modal__item-main">
        <span class="finance-modal__item-label">${escapeHtml(item.label)}</span>
        <span class="finance-modal__item-date">${formatFinanceDate(item.date)}</span>
      </div>
      <span class="finance-modal__item-amount">${formatVnd(item.amount)}</span>
      <button type="button" class="finance-modal__item-edit" data-finance-edit-item="${item.id}" aria-label="Sửa ${escapeHtml(item.label)}">✏️</button>
      <button type="button" class="finance-modal__item-delete" data-finance-delete-item="${item.id}" aria-label="Xoá ${escapeHtml(item.label)}">🗑</button>
    </div>`).join('');
  list.querySelectorAll('[data-finance-delete-item]').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteSubitem(btn.dataset.financeDeleteItem));
  });
  list.querySelectorAll('[data-finance-edit-item]').forEach(btn => {
    btn.addEventListener('click', () => startEditSubitem(btn.dataset.financeEditItem));
  });
}

function resetFinanceModalForm() {
  financeModalEditingItemId = null;
  const labelInput = document.getElementById('finance-modal-new-label');
  const amountInput = document.getElementById('finance-modal-new-amount');
  const dateInput = document.getElementById('finance-modal-new-date');
  const addBtn = document.getElementById('finance-modal-add-btn');
  if (labelInput) labelInput.value = '';
  if (amountInput) amountInput.value = '';
  if (dateInput) dateInput.value = '';
  if (addBtn) addBtn.textContent = 'Thêm';
}

function openFinanceSubitemModal(key) {
  financeModalEditingKey = key;
  resetFinanceModalForm();
  const meta = FINANCE_POOLS.find(p => p.key === key);
  const title = document.getElementById('finance-modal-title');
  if (title && meta) title.textContent = `${meta.icon} ${meta.label}`;
  renderFinanceModalItems();
  document.getElementById('finance-subitem-modal')?.removeAttribute('hidden');
}

function closeFinanceSubitemModal() {
  financeModalEditingKey = null;
  resetFinanceModalForm();
  document.getElementById('finance-subitem-modal')?.setAttribute('hidden', '');
}

function startEditSubitem(itemId) {
  if (!financeModalEditingKey) return;
  const actual = loadFinanceActual();
  const item = (actual[financeModalEditingKey] || []).find(i => i.id === itemId);
  if (!item) return;

  financeModalEditingItemId = itemId;
  const labelInput = document.getElementById('finance-modal-new-label');
  const amountInput = document.getElementById('finance-modal-new-amount');
  const dateInput = document.getElementById('finance-modal-new-date');
  const addBtn = document.getElementById('finance-modal-add-btn');
  if (labelInput) labelInput.value = item.label;
  if (amountInput) amountInput.value = item.amount;
  if (dateInput) dateInput.value = item.date || '';
  if (addBtn) addBtn.textContent = 'Lưu';
  labelInput?.focus();
}

function handleSaveSubitem() {
  if (!financeModalEditingKey) return;
  const labelInput = document.getElementById('finance-modal-new-label');
  const amountInput = document.getElementById('finance-modal-new-amount');
  const dateInput = document.getElementById('finance-modal-new-date');
  const label = labelInput?.value.trim();
  const amount = Number(amountInput?.value) || 0;
  // Local calendar date, not toISOString() (UTC) — see health.js's
  // formatLocalDate() for why that matters for non-UTC users.
  const now = new Date();
  const date = dateInput?.value
    || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (!label) {
    showToast('Nhập tên danh mục con');
    return;
  }

  const actual = loadFinanceActual();
  const items = actual[financeModalEditingKey] || [];

  if (financeModalEditingItemId) {
    actual[financeModalEditingKey] = items.map(item =>
      item.id === financeModalEditingItemId ? { ...item, label, amount, date } : item);
  } else {
    actual[financeModalEditingKey] = [...items, { id: `${Date.now()}`, label, amount, date }];
  }
  if (!saveFinanceActual(actual)) return;

  resetFinanceModalForm();
  renderFinanceModalItems();
  renderFinanceActualPools();
}

function handleDeleteSubitem(itemId) {
  if (!financeModalEditingKey) return;
  const actual = loadFinanceActual();
  actual[financeModalEditingKey] = (actual[financeModalEditingKey] || []).filter(item => item.id !== itemId);
  if (!saveFinanceActual(actual)) return;
  if (financeModalEditingItemId === itemId) resetFinanceModalForm();
  renderFinanceModalItems();
  renderFinanceActualPools();
}

function populateFinanceInputs(config, state) {
  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = value || '';
  };
  setVal('finance-total-capital', state.totalCapital);
  setVal('finance-salary', state.monthlySalary);
  setVal('finance-income', state.income);
  setVal('finance-expense', state.expense);
  setVal('finance-cfg-invest', config.invest);
  setVal('finance-cfg-savings', config.savings);
  setVal('finance-cfg-selfdev', config.selfDev);
  setVal('finance-cfg-emergency', config.emergency);
}

// ── 8. Boot ──────────────────────────────────────────────────

async function initFinanceRebalance() {
  await fetchPiPriceVnd();
  populateFinanceInputs(loadFinanceConfig(), loadFinanceState());
  renderFinanceDashboard();
  renderFinanceActualPools();

  document.getElementById('finance-apply-total')?.addEventListener('click', handleApplyTotal);
  document.getElementById('finance-cfg-save')?.addEventListener('click', () => runBootStep(handleConfigSave));

  // Pressing Enter in any of the 4 capital/salary/income/expense fields
  // applies the formula immediately — no need to reach for the button.
  ['finance-total-capital', 'finance-salary', 'finance-income', 'finance-expense'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleApplyTotal(); }
    });
  });

  document.getElementById('finance-modal-close')?.addEventListener('click', closeFinanceSubitemModal);
  document.getElementById('finance-modal-add-btn')?.addEventListener('click', handleSaveSubitem);
  ['finance-modal-new-amount', 'finance-modal-new-date'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSaveSubitem(); }
    });
  });
  document.getElementById('finance-subitem-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'finance-subitem-modal') closeFinanceSubitemModal();
  });

  setInterval(async () => {
    await fetchPiPriceVnd();
    renderFinanceDashboard();
  }, FINANCE_PRICE_REFRESH_MS);
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initFinanceRebalance);
});
