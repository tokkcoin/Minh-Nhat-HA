/* ============================================================
   Life Balance — expenseSheet.js
   Metal element — full-screen monthly expense spreadsheet.
   Click "📊" next to "Chi tiêu tháng này" to open.

   Each row: [Category label] [Amount].
   Footer shows an auto-sum; optionally override with a manual
   total. Closing writes the effective total to #finance-expense
   so the finance rebalance engine picks it up automatically.
   ============================================================ */

'use strict';

const EXPENSE_SHEET_KEY = 'lifebalance_expense_sheet';

// ── 1. Storage ──────────────────────────────────────────────

function loadRows() {
  try {
    const d = JSON.parse(localStorage.getItem(EXPENSE_SHEET_KEY));
    return Array.isArray(d?.rows) ? d.rows : [];
  } catch { return []; }
}

function loadOverride() {
  try {
    const d = JSON.parse(localStorage.getItem(EXPENSE_SHEET_KEY));
    return d?.override ?? null; // null = use auto-sum
  } catch { return null; }
}

function saveSheet(rows, override) {
  return safeSetItem(EXPENSE_SHEET_KEY, JSON.stringify({ rows, override }));
}

// ── 2. Compute ──────────────────────────────────────────────

function autoSum(rows) {
  return rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

function effectiveTotal(rows, override) {
  return override !== null && override !== '' ? Number(override) || 0 : autoSum(rows);
}

function formatVnd(n) {
  return Number(n).toLocaleString('vi-VN');
}

// ── 3. Render ────────────────────────────────────────────────

function renderRows() {
  const tbody = document.getElementById('expense-table-body');
  if (!tbody) return;
  const rows = loadRows();

  tbody.innerHTML = rows.length
    ? rows.map(r => `
      <tr class="expense-row" data-row-id="${r.id}">
        <td class="expense-table__col-label">
          <input type="text" class="expense-cell-label" value="${escapeHtml(r.label)}"
                 placeholder="Danh mục…" data-field="label" data-id="${r.id}" />
        </td>
        <td class="expense-table__col-amount">
          <input type="number" class="expense-cell-amount" value="${r.amount || ''}"
                 placeholder="0" min="0" step="1000"
                 data-field="amount" data-id="${r.id}" />
        </td>
        <td class="expense-table__col-del">
          <button type="button" class="expense-delete-row" data-id="${r.id}" aria-label="Xoá dòng">🗑</button>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="3" class="expense-empty">Chưa có danh mục — nhấn "+ Thêm" để bắt đầu.</td></tr>`;

  // Wire cell edits
  tbody.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', () => handleCellInput(input));
  });
  tbody.querySelectorAll('.expense-delete-row').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteRow(btn.dataset.id));
  });

  updateTotals();
}

function updateTotals() {
  const rows = loadRows();
  const override = loadOverride();
  const sum = autoSum(rows);
  const total = effectiveTotal(rows, override);

  const autoSumEl = document.getElementById('expense-auto-sum');
  const chipEl = document.getElementById('expense-sheet-total-chip');
  const overrideInput = document.getElementById('expense-total-override');

  if (autoSumEl) autoSumEl.textContent = formatVnd(sum);
  if (chipEl) chipEl.textContent = `${formatVnd(total)}đ`;
  if (overrideInput && overrideInput !== document.activeElement) {
    overrideInput.value = override !== null ? override : '';
  }

  // Live-update the finance page input (if visible in DOM)
  const expenseInput = document.getElementById('finance-expense');
  if (expenseInput) expenseInput.value = total || '';
}

// ── 4. Actions ───────────────────────────────────────────────

function handleCellInput(input) {
  const rows = loadRows();
  const override = loadOverride();
  const row = rows.find(r => r.id === input.dataset.id);
  if (!row) return;
  row[input.dataset.field] = input.value;
  saveSheet(rows, override);
  updateTotals();
}

function handleDeleteRow(id) {
  const rows = loadRows().filter(r => r.id !== id);
  saveSheet(rows, loadOverride());
  renderRows();
}

function handleAddRow() {
  const rows = loadRows();
  rows.push({ id: `${Date.now()}`, label: '', amount: '' });
  saveSheet(rows, loadOverride());
  renderRows();
  // Focus the new label cell
  const inputs = document.querySelectorAll('.expense-cell-label');
  inputs[inputs.length - 1]?.focus();
}

function handleOverrideInput() {
  const input = document.getElementById('expense-total-override');
  const val = input?.value.trim();
  const override = val === '' ? null : Number(val) || null;
  saveSheet(loadRows(), override);
  updateTotals();
}

// ── 5. Open / Close ──────────────────────────────────────────

function openExpenseSheet() {
  const sheet = document.getElementById('expense-sheet');
  if (sheet) sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  renderRows();
}

function closeExpenseSheet() {
  // Flush any pending cell value
  updateTotals();
  const sheet = document.getElementById('expense-sheet');
  if (sheet) sheet.hidden = false; // keep dom; let body overflow reset
  document.body.style.overflow = '';

  // Write effective total to the finance expense input and dispatch change
  const rows = loadRows();
  const override = loadOverride();
  const total = effectiveTotal(rows, override);
  const expenseInput = document.getElementById('finance-expense');
  if (expenseInput) {
    expenseInput.value = total || '';
    expenseInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (sheet) sheet.hidden = true;
}

// ── 6. Boot ──────────────────────────────────────────────────

function initExpenseSheet() {
  document.getElementById('expense-sheet-open')?.addEventListener('click', openExpenseSheet);
  document.getElementById('expense-sheet-close')?.addEventListener('click', closeExpenseSheet);
  document.getElementById('expense-add-row')?.addEventListener('click', handleAddRow);
  document.getElementById('expense-total-override')?.addEventListener('input', handleOverrideInput);

  // Also open when clicking the label text itself
  document.querySelector('label[for="finance-expense"]')?.addEventListener('click', e => {
    if (e.target.closest('#expense-sheet-open')) return; // don't double-fire from button
    openExpenseSheet();
  });

  // Sync live total to finance-expense on first load
  updateTotals();
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initExpenseSheet);
});
