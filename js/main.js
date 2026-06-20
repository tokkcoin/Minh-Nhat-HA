/* ============================================================
   Life Balance — main.js
   Page-specific boot for index.html (toast/Pi SDK live in common.js)
   ============================================================ */

'use strict';

// ── 1. How It Works — live post-count preview ───────────────
// Reads the same localStorage keys journal.js writes to
// (lifebalance_journal_<element>) and counts posts per range.

const HOW_PREVIEW_ELEMENTS = ['metal', 'wood', 'water', 'fire', 'earth'];

const HOW_PREVIEW_RANGE_START = {
  today: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  },
  week: () => Date.now() - 7 * 24 * 60 * 60 * 1000,
  month: () => Date.now() - 30 * 24 * 60 * 60 * 1000,
};

function countJournalPosts(range) {
  const since = HOW_PREVIEW_RANGE_START[range]?.() ?? 0;
  const counts = {};

  HOW_PREVIEW_ELEMENTS.forEach(key => {
    let posts = [];
    try {
      posts = JSON.parse(localStorage.getItem(`lifebalance_journal_${key}`)) || [];
    } catch {
      posts = [];
    }
    counts[key] = posts.filter(post => new Date(post.createdAt).getTime() >= since).length;
  });

  return counts;
}

function renderHowPreview(range) {
  const counts = countJournalPosts(range);
  const maxCount = Math.max(1, ...Object.values(counts));

  HOW_PREVIEW_ELEMENTS.forEach(key => {
    const bar = document.querySelector(`.how-preview__bar--${key}`);
    if (!bar) return;
    const fill = bar.querySelector('.how-preview__bar-fill');
    const countEl = bar.querySelector('.how-preview__bar-count');
    const count = counts[key];
    if (fill) fill.style.width = `${(count / maxCount) * 100}%`;
    if (countEl) countEl.textContent = count;
  });
}

function initHowPreview() {
  const tabs = document.querySelectorAll('.how-preview__tab');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderHowPreview(tab.dataset.range);
    });
  });

  renderHowPreview(document.querySelector('.how-preview__tab.active')?.dataset.range ?? 'today');
}

// ── 2. Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initPiSdk();
  initHowPreview();
});
