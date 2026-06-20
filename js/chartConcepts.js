/* ============================================================
   Life Balance — chartConcepts.js
   Renders 5 combo (bar + line) chart designs on chart-concepts.html,
   comparing growth across the Five Elements by journal post count.
   Reads real posts from localStorage (same keys as journal.js);
   falls back to a fixed demo dataset when nothing has been posted yet.
   ============================================================ */

'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WEEK_COUNT = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ELEMENTS (object, keyed by element) comes from common.js — this file
// only needs it as an ordered array.
const ELEMENTS_LIST = Object.values(ELEMENTS);

// ── 1. Data: real posts (localStorage) with demo fallback ──────

function loadAllPosts() {
  const result = {};
  ELEMENTS_LIST.forEach(el => { result[el.key] = loadElementPosts(el.key); });
  return result;
}

function buildWeeklySeriesFromPosts(allPosts) {
  const totalPosts = Object.values(allPosts).reduce((sum, arr) => sum + arr.length, 0);
  if (totalPosts === 0) return null;

  const now = Date.now();
  const weekly = {};
  ELEMENTS_LIST.forEach(el => { weekly[el.key] = Array(WEEK_COUNT).fill(0); });

  ELEMENTS_LIST.forEach(el => {
    allPosts[el.key].forEach(post => {
      const age = now - new Date(post.createdAt).getTime();
      const weeksAgo = Math.floor(age / WEEK_MS);
      const idx = WEEK_COUNT - 1 - weeksAgo;
      if (idx >= 0 && idx < WEEK_COUNT) weekly[el.key][idx] += 1;
    });
  });

  return weekly;
}

function demoWeeklySeries() {
  return {
    metal: [1, 2, 2, 3, 3, 4, 5, 6],
    wood: [2, 2, 3, 3, 4, 4, 4, 5],
    water: [0, 1, 1, 2, 2, 3, 4, 5],
    fire: [3, 2, 4, 3, 5, 4, 6, 5],
    earth: [1, 1, 2, 2, 2, 3, 3, 4],
  };
}

function getWeekLabels() {
  const labels = [];
  const now = new Date();
  for (let i = WEEK_COUNT - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * WEEK_MS);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return labels;
}

// ── 2. Derived series helpers ───────────────────────────────────

function cumulative(arr) {
  let sum = 0;
  return arr.map(v => (sum += v));
}

function weeklyTotals(weekly) {
  const totals = Array(WEEK_COUNT).fill(0);
  ELEMENTS_LIST.forEach(el => weekly[el.key].forEach((v, i) => { totals[i] += v; }));
  return totals;
}

function allTimeTotalsRanked(weekly) {
  return ELEMENTS_LIST
    .map(el => ({ key: el.key, name: el.name, total: weekly[el.key].reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
}

function growthRatePercent(arr) {
  const half = Math.floor(arr.length / 2);
  const firstAvg = arr.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondAvg = arr.slice(half).reduce((a, b) => a + b, 0) / (arr.length - half);
  if (firstAvg === 0) return secondAvg > 0 ? 100 : 0;
  return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
}

// ── 3. SVG helpers ───────────────────────────────────────────────

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function gridLines(svg, x, y, w, h, rows = 4) {
  for (let i = 0; i <= rows; i++) {
    const gy = y + (h / rows) * i;
    svg.appendChild(svgEl('line', {
      x1: x, x2: x + w, y1: gy, y2: gy,
      stroke: 'var(--border)', 'stroke-width': '1',
    }));
  }
}

function buildLegend(container, items) {
  container.innerHTML = '';
  items.forEach(item => {
    const chip = document.createElement('span');
    chip.className = 'chart-legend__chip';
    const swatch = document.createElement('span');
    swatch.className = item.shape === 'line' ? 'chart-legend__line' : 'chart-legend__dot';
    swatch.style.background = item.color;
    chip.appendChild(swatch);
    chip.appendChild(document.createTextNode(item.label));
    container.appendChild(chip);
  });
}

// ── 4. Design 1 — Grouped Bars + Total Trend Line ───────────────

function renderDesign1(mount, weekly, labels) {
  const width = 760, height = 280;
  const padL = 30, padR = 36, padT = 16, padB = 28;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const PCT_ROWS = 4;
  const PCT_MAX = 100; // each element's line is indexed to its own all-time total = 100%

  const maxBar = Math.max(1, ...ELEMENTS_LIST.flatMap(el => weekly[el.key]));

  const growthByEl = {};
  ELEMENTS_LIST.forEach(el => {
    const cum = cumulative(weekly[el.key]);
    const base = Math.max(cum[WEEK_COUNT - 1], 1);
    growthByEl[el.key] = cum.map(v => (v / base) * 100);
  });

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });
  gridLines(svg, padL, padT, plotW, plotH);

  for (let r = 0; r <= PCT_ROWS; r++) {
    const y = padT + (plotH / PCT_ROWS) * r;
    const countVal = Math.round(maxBar - (maxBar / PCT_ROWS) * r);
    const pctVal = Math.round(PCT_MAX - (PCT_MAX / PCT_ROWS) * r);
    svg.appendChild(svgEl('text', {
      x: padL - 6, y: y + 3, 'text-anchor': 'end', 'font-size': '8', fill: 'var(--text-muted)',
    })).textContent = countVal;
    svg.appendChild(svgEl('text', {
      x: padL + plotW + 6, y: y + 3, 'text-anchor': 'start', 'font-size': '8', fill: 'var(--text-muted)',
    })).textContent = `${pctVal}%`;
  }

  const clusterW = plotW / WEEK_COUNT;
  const barW = (clusterW * 0.7) / ELEMENTS_LIST.length;
  const linePointsByEl = {};
  ELEMENTS_LIST.forEach(el => { linePointsByEl[el.key] = []; });

  for (let i = 0; i < WEEK_COUNT; i++) {
    const clusterX = padL + i * clusterW + clusterW * 0.15;
    ELEMENTS_LIST.forEach((el, j) => {
      const value = weekly[el.key][i];
      const barH = (value / maxBar) * plotH;
      svg.appendChild(svgEl('rect', {
        x: clusterX + j * barW, y: padT + plotH - barH,
        width: barW * 0.85, height: barH,
        fill: `var(--${el.key})`, rx: 1.5,
      }));
      linePointsByEl[el.key].push({
        x: clusterX + j * barW + (barW * 0.85) / 2,
        y: padT + plotH - (growthByEl[el.key][i] / PCT_MAX) * plotH,
      });
    });
    svg.appendChild(svgEl('text', {
      x: padL + i * clusterW + clusterW / 2, y: height - 8,
      'text-anchor': 'middle', 'font-size': '9', fill: 'var(--text-muted)',
    })).textContent = labels[i];
  }

  ELEMENTS_LIST.forEach(el => {
    svg.appendChild(svgEl('path', {
      d: smoothPath(linePointsByEl[el.key]), fill: 'none',
      stroke: `var(--${el.key})`, 'stroke-width': '2',
    }));
    linePointsByEl[el.key].forEach(p => {
      svg.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 2.5, fill: `var(--${el.key})` }));
    });
  });

  mount.innerHTML = '';
  mount.appendChild(svg);

  buildLegend(document.getElementById('legend-1'), [
    ...ELEMENTS_LIST.map(el => ({ label: `${el.name} — bar = posts/week, line = growth %`, color: `var(--${el.key})`, shape: 'dot' })),
  ]);
}

// ── 5. Design 2 — Stacked Bars + Per-Element Growth Lines ───────

function renderDesign2(mount, weekly, labels) {
  const width = 760, height = 280;
  const padL = 36, padR = 16, padT = 16, padB = 28;
  const plotW = width - padL - padR, plotH = height - padT - padB;

  const totals = weeklyTotals(weekly);
  const maxStack = Math.max(1, ...totals);
  const cumByEl = {};
  ELEMENTS_LIST.forEach(el => { cumByEl[el.key] = cumulative(weekly[el.key]); });
  const maxCum = Math.max(1, ...ELEMENTS_LIST.map(el => cumByEl[el.key][WEEK_COUNT - 1]));

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });
  gridLines(svg, padL, padT, plotW, plotH);

  const barW = (plotW / WEEK_COUNT) * 0.6;

  for (let i = 0; i < WEEK_COUNT; i++) {
    const x = padL + i * (plotW / WEEK_COUNT) + (plotW / WEEK_COUNT - barW) / 2;
    let stackedY = padT + plotH;
    ELEMENTS_LIST.forEach(el => {
      const value = weekly[el.key][i];
      const segH = (value / maxStack) * plotH;
      stackedY -= segH;
      svg.appendChild(svgEl('rect', {
        x, y: stackedY, width: barW, height: segH,
        fill: `var(--${el.key})`, opacity: '0.55',
      }));
    });
    svg.appendChild(svgEl('text', {
      x: x + barW / 2, y: height - 8,
      'text-anchor': 'middle', 'font-size': '9', fill: 'var(--text-muted)',
    })).textContent = labels[i];
  }

  ELEMENTS_LIST.forEach(el => {
    const points = cumByEl[el.key].map((v, i) => ({
      x: padL + i * (plotW / WEEK_COUNT) + (plotW / WEEK_COUNT) / 2,
      y: padT + plotH - (v / maxCum) * plotH,
    }));
    svg.appendChild(svgEl('path', {
      d: smoothPath(points), fill: 'none',
      stroke: `var(--${el.key})`, 'stroke-width': '2',
    }));
  });

  mount.innerHTML = '';
  mount.appendChild(svg);

  buildLegend(document.getElementById('legend-2'), [
    ...ELEMENTS_LIST.map(el => ({ label: `${el.name} (cumulative)`, color: `var(--${el.key})`, shape: 'line' })),
  ]);
}

// ── 6. Design 3 — Small-Multiples Element Cards ─────────────────

function renderDesign3(mount, weekly) {
  mount.innerHTML = '';

  ELEMENTS_LIST.forEach(el => {
    const card = document.createElement('div');
    card.className = `chart-mini-card chart-mini-card--${el.key}`;

    const series = weekly[el.key];
    const cum = cumulative(series);
    const total = cum[WEEK_COUNT - 1];

    const head = document.createElement('div');
    head.className = 'chart-mini-card__head';
    head.innerHTML = `<span class="chart-mini-card__name">${el.name}</span><span class="chart-mini-card__total">${total}</span>`;
    card.appendChild(head);

    const width = 160, height = 70;
    const padL = 2, padR = 2, padT = 4, padB = 2;
    const plotW = width - padL - padR, plotH = height - padT - padB;
    const maxBar = Math.max(1, ...series);
    const maxCum = Math.max(1, total);

    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });
    const barW = (plotW / WEEK_COUNT) * 0.55;

    series.forEach((value, i) => {
      const x = padL + i * (plotW / WEEK_COUNT) + (plotW / WEEK_COUNT - barW) / 2;
      const barH = (value / maxBar) * plotH * 0.6;
      svg.appendChild(svgEl('rect', {
        x, y: padT + plotH - barH, width: barW, height: barH,
        fill: `var(--${el.key})`, opacity: '0.35', rx: 1,
      }));
    });

    const linePoints = cum.map((v, i) => ({
      x: padL + i * (plotW / WEEK_COUNT) + (plotW / WEEK_COUNT) / 2,
      y: padT + plotH - (v / maxCum) * plotH,
    }));
    svg.appendChild(svgEl('path', {
      d: smoothPath(linePoints), fill: 'none',
      stroke: `var(--${el.key})`, 'stroke-width': '2',
    }));

    const svgWrap = document.createElement('div');
    svgWrap.className = 'chart-mini-card__svg';
    svgWrap.appendChild(svg);
    card.appendChild(svgWrap);

    mount.appendChild(card);
  });
}

// ── 7. Design 4 — Ranking Bars + Growth-Rate Line (Dual Axis) ───

function renderDesign4(mount, weekly) {
  const width = 760, height = 280;
  const padL = 36, padR = 36, padT = 16, padB = 28;
  const plotW = width - padL - padR, plotH = height - padT - padB;

  const ranked = allTimeTotalsRanked(weekly);
  const maxTotal = Math.max(1, ...ranked.map(r => r.total));
  const rates = ranked.map(r => growthRatePercent(weekly[r.key]));
  const maxRate = Math.max(20, ...rates.map(Math.abs));

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });
  gridLines(svg, padL, padT, plotW, plotH);

  const zeroY = padT + plotH / 2;
  svg.appendChild(svgEl('line', {
    x1: padL, x2: padL + plotW, y1: zeroY, y2: zeroY,
    stroke: 'var(--text-muted)', 'stroke-width': '1', 'stroke-dasharray': '3,3',
  }));

  const colW = plotW / ranked.length;
  const linePoints = [];

  ranked.forEach((r, i) => {
    const x = padL + i * colW + colW * 0.25;
    const barH = (r.total / maxTotal) * plotH;
    svg.appendChild(svgEl('rect', {
      x, y: padT + plotH - barH, width: colW * 0.5, height: barH,
      fill: `var(--${r.key})`, rx: 2,
    }));
    svg.appendChild(svgEl('text', {
      x: x + colW * 0.25, y: height - 8,
      'text-anchor': 'middle', 'font-size': '10', fill: 'var(--text-secondary)',
    })).textContent = r.name;

    const rate = rates[i];
    const ly = zeroY - (rate / maxRate) * (plotH / 2);
    linePoints.push({ x: x + colW * 0.25, y: ly, rate });
  });

  svg.appendChild(svgEl('path', {
    d: smoothPath(linePoints), fill: 'none',
    stroke: 'var(--text-primary)', 'stroke-width': '2',
  }));
  linePoints.forEach(p => {
    svg.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 3, fill: 'var(--text-primary)' }));
    svg.appendChild(svgEl('text', {
      x: p.x, y: p.y - 8, 'text-anchor': 'middle', 'font-size': '9',
      fill: p.rate >= 0 ? 'var(--success)' : 'var(--danger)',
    })).textContent = `${p.rate >= 0 ? '+' : ''}${p.rate}%`;
  });

  mount.innerHTML = '';
  mount.appendChild(svg);

  buildLegend(document.getElementById('legend-4'), [
    { label: 'All-time posts (bar, ranked)', color: 'var(--text-secondary)', shape: 'dot' },
    { label: 'Growth rate vs. earlier weeks (line)', color: 'var(--text-primary)', shape: 'line' },
  ]);
}

// ── 8. Design 5 — Hero-Style Glow Timeline ──────────────────────

function renderDesign5(mount, weekly, labels) {
  const width = 760, height = 300;
  const padL = 24, padR = 24, padT = 20, padB = 28;
  const plotW = width - padL - padR, plotH = height - padT - padB;

  const totals = weeklyTotals(weekly);
  const maxBar = Math.max(1, ...totals);
  const cumByEl = {};
  ELEMENTS_LIST.forEach(el => { cumByEl[el.key] = cumulative(weekly[el.key]); });
  const maxCum = Math.max(1, ...ELEMENTS_LIST.map(el => cumByEl[el.key][WEEK_COUNT - 1]));

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });

  const defs = svgEl('defs', {});
  const filter = svgEl('filter', { id: 'glow5', x: '-50%', y: '-50%', width: '200%', height: '200%' });
  filter.appendChild(svgEl('feGaussianBlur', { stdDeviation: '2.6', result: 'blur' }));
  const merge = svgEl('feMerge', {});
  merge.appendChild(svgEl('feMergeNode', { in: 'blur' }));
  merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
  filter.appendChild(merge);
  defs.appendChild(filter);
  svg.appendChild(defs);

  const colW = plotW / WEEK_COUNT;
  totals.forEach((value, i) => {
    const barH = (value / maxBar) * plotH * 0.85;
    svg.appendChild(svgEl('rect', {
      x: padL + i * colW + colW * 0.1, y: padT + plotH - barH,
      width: colW * 0.8, height: barH,
      fill: 'var(--bg-card-hover)', rx: 3,
    }));
    svg.appendChild(svgEl('text', {
      x: padL + i * colW + colW / 2, y: height - 8,
      'text-anchor': 'middle', 'font-size': '9', fill: 'var(--text-muted)',
    })).textContent = labels[i];
  });

  ELEMENTS_LIST.forEach(el => {
    const points = cumByEl[el.key].map((v, i) => ({
      x: padL + i * colW + colW / 2,
      y: padT + plotH - (v / maxCum) * plotH,
    }));
    svg.appendChild(svgEl('path', {
      d: smoothPath(points), fill: 'none',
      stroke: `var(--${el.key})`, 'stroke-width': '2.5', filter: 'url(#glow5)',
    }));
    const last = points[points.length - 1];
    svg.appendChild(svgEl('circle', { cx: last.x, cy: last.y, r: 3.5, fill: `var(--${el.key})` }));
    svg.appendChild(svgEl('text', {
      x: last.x + 6, y: last.y - 6, 'font-size': '10', fill: `var(--${el.key})`, 'font-weight': '700',
    })).textContent = cumByEl[el.key][WEEK_COUNT - 1];
  });

  mount.innerHTML = '';
  mount.appendChild(svg);

  buildLegend(document.getElementById('legend-5'), [
    ...ELEMENTS_LIST.map(el => ({ label: `${el.name} (cumulative growth)`, color: `var(--${el.key})`, shape: 'line' })),
  ]);
}

// ── 9. Boot ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initPiSdk();

  const realWeekly = buildWeeklySeriesFromPosts(loadAllPosts());
  const isDemo = !realWeekly;
  const weekly = realWeekly || demoWeeklySeries();
  const labels = getWeekLabels();

  const note = document.getElementById('data-source-note');
  if (note) {
    note.textContent = isDemo
      ? 'No journal posts found yet — showing demo data so all five designs are visible. Post a few entries per element to see real growth.'
      : 'Showing real growth from your journal posts (last 8 weeks).';
  }

  renderDesign1(document.getElementById('chart-1'), weekly, labels);
  renderDesign2(document.getElementById('chart-2'), weekly, labels);
  renderDesign3(document.getElementById('chart-3'), weekly);
  renderDesign4(document.getElementById('chart-4'), weekly);
  renderDesign5(document.getElementById('chart-5'), weekly, labels);
});
