/* ============================================================
   Life Balance — dailyTasks.js
   Reusable daily-checklist widget for elements that don't have a
   full quest system of their own (health.js already has one for
   Wood — main/side/daily/weekly/monthly + levels). This is the
   trimmed-down version: daily-only, no levels, no image upload.

   Task shape stays compatible with main.js's DAILY_SOURCES
   aggregator: { id, title, xp, category: 'daily', completedPeriods }.

   Usage: call initDailyChecklist({ storageKey, seedTasks, defaultXp })
   once per page, after this script and common.js have loaded. The
   host page must provide the DOM ids used below (see mood.html /
   skills.html / finance.html / situation.html).
   ============================================================ */

'use strict';

function dailyTasksTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function initDailyChecklist(config) {
  const { storageKey, seedTasks = [], defaultXp = 10 } = config;

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  function save(tasks) {
    return safeSetItem(storageKey, JSON.stringify(tasks));
  }

  function render() {
    const list = document.getElementById('daily-quest-list');
    if (!list) return;
    const tasks = load();
    const today = dailyTasksTodayKey();

    list.innerHTML = tasks.length
      ? tasks.map(t => {
          const done = t.completedPeriods.includes(today);
          return `
            <div class="daily-quest ${done ? 'daily-quest--done' : ''}">
              <label class="daily-quest__check">
                <input type="checkbox" data-dq-toggle="${t.id}" ${done ? 'checked' : ''} />
                <span class="daily-quest__text">${escapeHtml(t.title)}</span>
              </label>
              <span class="daily-quest__xp">+${t.xp} XP</span>
              <button type="button" class="daily-quest__delete" data-dq-delete="${t.id}" aria-label="Xoá nhiệm vụ">🗑</button>
            </div>`;
        }).join('')
      : '<p class="daily-quest__empty">Chưa có nhiệm vụ hàng ngày nào.</p>';

    list.querySelectorAll('[data-dq-toggle]').forEach(cb => {
      cb.addEventListener('change', () => toggle(cb.dataset.dqToggle));
    });
    list.querySelectorAll('[data-dq-delete]').forEach(btn => {
      btn.addEventListener('click', () => remove(btn.dataset.dqDelete));
    });
  }

  function toggle(id) {
    const tasks = load();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const today = dailyTasksTodayKey();
    const has = task.completedPeriods.includes(today);
    task.completedPeriods = has
      ? task.completedPeriods.filter(k => k !== today)
      : [...task.completedPeriods, today];
    if (!save(tasks)) return;
    render();
  }

  function remove(id) {
    const tasks = load().filter(t => t.id !== id);
    if (!save(tasks)) return;
    render();
  }

  function add(title, xp) {
    const trimmed = title.trim();
    if (!trimmed) {
      showToast('Nhập tên nhiệm vụ');
      return;
    }
    const tasks = load();
    tasks.push({
      id: `${Date.now()}`,
      title: trimmed,
      xp: Number.isFinite(xp) ? xp : defaultXp,
      category: 'daily',
      completedPeriods: [],
    });
    if (!save(tasks)) return;
    render();
  }

  function seed() {
    if (!seedTasks.length) return;
    const tasks = load();
    const toAdd = seedTasks.map((s, i) => ({
      id: `${Date.now()}-${i}`,
      title: s.title,
      xp: Number.isFinite(s.xp) ? s.xp : defaultXp,
      category: 'daily',
      completedPeriods: [],
    }));
    if (!save([...tasks, ...toAdd])) return;
    showToast(`Đã thêm ${toAdd.length} nhiệm vụ mẫu — tự chỉnh sửa cho phù hợp nhé`, 4000);
    render();
  }

  render();

  const titleInput = document.getElementById('daily-quest-new-title');
  const xpInput = document.getElementById('daily-quest-new-xp');
  const addBtn = document.getElementById('daily-quest-add-btn');

  addBtn?.addEventListener('click', () => {
    add(titleInput?.value || '', Number(xpInput?.value));
    if (titleInput) { titleInput.value = ''; titleInput.focus(); }
  });
  titleInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addBtn?.click(); }
  });
  document.getElementById('daily-quest-seed-btn')?.addEventListener('click', seed);
}
