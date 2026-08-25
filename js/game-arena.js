/* ============================================================
   Life Balance — game-arena.js
   "Đại Chiến Anh Hùng" — a small ORIGINAL 1-lane hero-vs-hero
   arena battler (no jungle/items/gold/leveling/hero roster —
   deliberately simplified, not a full MOBA, no third-party IP).

   Lane layout (logical x, 0..LANE_LENGTH):
     player base (0) — player tower — enemy tower — enemy base (LANE_LENGTH)
   Both sides auto-spawn minion waves on a timer that walk toward
   the enemy base and auto-fight anything in range. Each side has
   one hero: the player's is click-to-move + 2 ability buttons,
   the enemy's is driven by a simple heuristic. Towers must be
   destroyed before minions/heroes can reach (and damage) a base.

   Canvas-only rendering; all HUD/button chrome is plain HTML/CSS
   (css/game-arena.css) using this app's shared design tokens.
   ============================================================ */

'use strict';

// ── 1. Tunable Constants ───────────────────────────────────────

const LANE_LENGTH = 1000;
const PLAYER_BASE_X  = 0;
const PLAYER_TOWER_X = 300;
const ENEMY_TOWER_X  = 700;
const ENEMY_BASE_X   = LANE_LENGTH;
const PLAYER_HERO_START_X = 160;
const ENEMY_HERO_START_X  = 840;

const BASE_MAX_HP = 1000;

// Towers: clearly tankier + harder-hitting than minions/heroes.
const TOWER_MAX_HP     = 900;
const TOWER_ATK        = 45;
const TOWER_RANGE      = 150;
const TOWER_ATK_INTERVAL = 1.1;

const MINION_MAX_HP    = 55;
const MINION_ATK       = 7;
const MINION_RANGE     = 36;
const MINION_SPEED     = 55; // lane units / sec
const MINION_ATK_INTERVAL = 1.0;
const MINION_SPAWN_INTERVAL = 15; // sec, both sides spawn together
const MINIONS_PER_WAVE = 3;

const HERO_MAX_HP      = 380;
const HERO_ATK         = 16;
const HERO_RANGE       = 65;
const HERO_SPEED       = 110;
const HERO_ATK_INTERVAL = 0.75;
const HERO_RESPAWN_TIME = 8; // sec, no permanent-death mechanic in spec

const NUKE_DAMAGE    = 95;
const NUKE_COOLDOWN  = 6;
const ABILITY_RANGE  = 210;

const HEAL_AMOUNT     = 110;
const SHIELD_AMOUNT   = 70;
const SHIELD_DURATION = 4;
const HEAL_COOLDOWN   = 9;

const AI_DECISION_INTERVAL = 0.5;
const AI_AWARENESS_RADIUS  = 260;

// Test-only hook: set window.__ARENA_TIME_SCALE__ before this script loads
// (e.g. via Playwright's addInitScript) to fast-forward the simulation for
// automated testing, without changing any real gameplay-facing constant.
const TIME_SCALE = (typeof window !== 'undefined' && window.__ARENA_TIME_SCALE__) || 1;

// ── 2. State ────────────────────────────────────────────────────

let state = null;
let nextUnitId = 1;
function newId() { return nextUnitId++; }

function makeBase(side) {
  return {
    id: newId(), type: 'base', side,
    x: side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X,
    hp: BASE_MAX_HP, maxHp: BASE_MAX_HP, alive: true, shield: 0,
  };
}

function makeTower(side) {
  return {
    id: newId(), type: 'tower', side,
    x: side === 'player' ? PLAYER_TOWER_X : ENEMY_TOWER_X,
    hp: TOWER_MAX_HP, maxHp: TOWER_MAX_HP, alive: true, shield: 0,
    atk: TOWER_ATK, range: TOWER_RANGE, atkInterval: TOWER_ATK_INTERVAL, atkTimer: 0,
  };
}

function makeHero(side) {
  return {
    id: newId(), type: 'hero', side,
    x: side === 'player' ? PLAYER_HERO_START_X : ENEMY_HERO_START_X,
    hp: HERO_MAX_HP, maxHp: HERO_MAX_HP, alive: true, shield: 0, shieldTimer: 0,
    atk: HERO_ATK, range: HERO_RANGE, speed: HERO_SPEED,
    atkInterval: HERO_ATK_INTERVAL, atkTimer: 0,
    nukeCd: 0, healCd: 0, moveTargetX: null, respawnTimer: 0, aiTimer: 0,
  };
}

function makeMinion(side, x) {
  return {
    id: newId(), type: 'minion', side, x,
    hp: MINION_MAX_HP, maxHp: MINION_MAX_HP, alive: true, shield: 0,
    atk: MINION_ATK, range: MINION_RANGE, speed: MINION_SPEED,
    atkInterval: MINION_ATK_INTERVAL, atkTimer: 0,
    yOffset: (Math.random() - 0.5) * 18, // purely visual scatter
  };
}

function createInitialState() {
  nextUnitId = 1;
  const playerHero = makeHero('player');
  const enemyHero = makeHero('enemy');
  return {
    playerBase: makeBase('player'),
    enemyBase: makeBase('enemy'),
    playerTower: makeTower('player'),
    enemyTower: makeTower('enemy'),
    playerHero,
    enemyHero,
    units: [playerHero, enemyHero], // + minions, pushed by spawnWave()
    effects: [],
    spawnTimer: MINION_SPAWN_INTERVAL,
    gameOver: false,
    winner: null,
  };
}

// ── 3. Combat / Movement Helpers ───────────────────────────────

// A unit may only search for/reach the enemy base once that side's tower is
// destroyed — this is the one rule that enforces "tower must fall first",
// independent of how the unit got positioned (walked there or was clicked).
function findTarget(unit) {
  const enemySide = unit.side === 'player' ? 'enemy' : 'player';
  const enemyTower = unit.side === 'player' ? state.enemyTower : state.playerTower;
  const enemyBase  = unit.side === 'player' ? state.enemyBase  : state.playerBase;

  let best = null;
  let bestDist = Infinity;
  for (const other of state.units) {
    if (other.side !== enemySide || !other.alive) continue;
    const dist = Math.abs(other.x - unit.x);
    if (dist <= unit.range && dist < bestDist) { best = other; bestDist = dist; }
  }
  if (enemyTower.alive) {
    const dist = Math.abs(enemyTower.x - unit.x);
    if (dist <= unit.range && dist < bestDist) { best = enemyTower; bestDist = dist; }
  } else if (enemyBase.alive) {
    const dist = Math.abs(enemyBase.x - unit.x);
    if (dist <= unit.range && dist < bestDist) { best = enemyBase; bestDist = dist; }
  }
  return best;
}

// Furthest x a unit may advance to — stops it just inside attack range of
// the enemy tower (while alive) or the enemy base (once the tower is down).
function forwardCap(unit) {
  if (unit.side === 'player') {
    return state.enemyTower.alive
      ? state.enemyTower.x - unit.range * 0.85
      : state.enemyBase.x - unit.range * 0.85;
  }
  return state.playerTower.alive
    ? state.playerTower.x + unit.range * 0.85
    : state.playerBase.x + unit.range * 0.85;
}

function moveUnit(unit, dt) {
  let desiredX;
  if (unit.type === 'minion') {
    desiredX = unit.side === 'player' ? LANE_LENGTH : 0;
  } else if (unit.type === 'hero') {
    if (unit.moveTargetX == null) return;
    desiredX = unit.moveTargetX;
  } else {
    return; // towers never move
  }
  desiredX = Math.min(LANE_LENGTH, Math.max(0, desiredX));
  const cap = forwardCap(unit);
  const targetX = unit.side === 'player' ? Math.min(desiredX, cap) : Math.max(desiredX, cap);
  const dx = targetX - unit.x;
  if (Math.abs(dx) < 0.5) return;
  const dir = Math.sign(dx);
  unit.x += dir * unit.speed * dt;
  if ((dir > 0 && unit.x > targetX) || (dir < 0 && unit.x < targetX)) unit.x = targetX;
}

function applyDamage(target, amount, _source) {
  if (!target.alive) return;
  let dmg = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, dmg);
    target.shield -= absorbed;
    dmg -= absorbed;
  }
  target.hp = Math.max(0, target.hp - dmg);
  if (target.hp <= 0) {
    target.alive = false;
    if (target.type === 'hero') target.respawnTimer = HERO_RESPAWN_TIME;
  }
}

function combatTick(unit, dt) {
  if (!unit.alive) return;
  const target = findTarget(unit);
  if (target) {
    unit.atkTimer -= dt;
    if (unit.atkTimer <= 0) {
      applyDamage(target, unit.atk, unit);
      unit.atkTimer = unit.atkInterval;
    }
  } else {
    moveUnit(unit, dt);
  }
}

// ── 4. Minion Spawning ───────────────────────────────────────────

function spawnWave(side) {
  const baseX = side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X;
  const dir = side === 'player' ? 1 : -1;
  for (let i = 0; i < MINIONS_PER_WAVE; i++) {
    state.units.push(makeMinion(side, baseX + dir * (20 + i * 22)));
  }
}

function updateSpawning(dt) {
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnWave('player');
    spawnWave('enemy');
    state.spawnTimer = MINION_SPAWN_INTERVAL;
  }
}

// ── 5. Abilities ──────────────────────────────────────────────────

function findBestNukeTarget(hero) {
  const enemySide = hero.side === 'player' ? 'enemy' : 'player';
  const candidates = state.units.filter(
    (u) => u.side === enemySide && u.alive && Math.abs(u.x - hero.x) <= ABILITY_RANGE
  );
  const enemyTower = hero.side === 'player' ? state.enemyTower : state.playerTower;
  if (enemyTower.alive && Math.abs(enemyTower.x - hero.x) <= ABILITY_RANGE) candidates.push(enemyTower);
  if (!candidates.length) return null;
  // Lowest HP fraction first — "most value / lowest HP in range".
  candidates.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  return candidates[0];
}

function useNukeAbility(hero, target) {
  applyDamage(target, NUKE_DAMAGE, hero);
  hero.nukeCd = NUKE_COOLDOWN;
  state.effects.push({ type: 'nuke', x1: hero.x, x2: target.x, ttl: 0.3, maxTtl: 0.3 });
}

function useHealAbility(hero) {
  hero.hp = Math.min(hero.maxHp, hero.hp + HEAL_AMOUNT);
  hero.shield = SHIELD_AMOUNT;
  hero.shieldTimer = SHIELD_DURATION;
  hero.healCd = HEAL_COOLDOWN;
  state.effects.push({ type: 'heal', x: hero.x, ttl: 0.6, maxTtl: 0.6 });
}

function updateCooldowns(dt) {
  [state.playerHero, state.enemyHero].forEach((hero) => {
    hero.nukeCd = Math.max(0, hero.nukeCd - dt);
    hero.healCd = Math.max(0, hero.healCd - dt);
    if (hero.shield > 0) {
      hero.shieldTimer -= dt;
      if (hero.shieldTimer <= 0) { hero.shield = 0; hero.shieldTimer = 0; }
    }
  });
}

function updateEffects(dt) {
  state.effects.forEach((e) => { e.ttl -= dt; });
  state.effects = state.effects.filter((e) => e.ttl > 0);
}

function respawnHero(hero) {
  hero.hp = hero.maxHp;
  hero.alive = true;
  hero.x = hero.side === 'player' ? PLAYER_HERO_START_X : ENEMY_HERO_START_X;
  hero.shield = 0;
  hero.shieldTimer = 0;
  hero.moveTargetX = null;
  hero.atkTimer = 0;
}

function updateRespawns(dt) {
  [state.playerHero, state.enemyHero].forEach((hero) => {
    if (hero.alive) return;
    hero.respawnTimer -= dt;
    if (hero.respawnTimer <= 0) respawnHero(hero);
  });
}

// ── 6. Enemy AI Heuristic ───────────────────────────────────────
// Advances when its side has more nearby HP than the opponent, retreats
// or shields/heals when its own HP is low, otherwise nukes off cooldown
// against whatever's lowest-HP/most valuable in range.

function sumHpNear(x, side, radius) {
  let total = 0;
  state.units.forEach((u) => {
    if (u.side === side && u.alive && Math.abs(u.x - x) <= radius) total += u.hp;
  });
  return total;
}

function updateAiHero(dt) {
  const hero = state.enemyHero;
  if (!hero.alive) return;
  hero.aiTimer -= dt;
  if (hero.aiTimer <= 0) {
    hero.aiTimer = AI_DECISION_INTERVAL;
    const hpPct = hero.hp / hero.maxHp;
    if (hpPct < 0.35 && hero.healCd <= 0) {
      useHealAbility(hero);
    } else if (hpPct < 0.35) {
      hero.moveTargetX = Math.min(LANE_LENGTH, hero.x + 120); // retreat toward own base
    } else {
      const ownHp = sumHpNear(hero.x, 'enemy', AI_AWARENESS_RADIUS);
      const foeHp = sumHpNear(hero.x, 'player', AI_AWARENESS_RADIUS);
      hero.moveTargetX = ownHp >= foeHp
        ? Math.max(0, hero.x - 150)         // advance toward player base
        : Math.min(LANE_LENGTH, hero.x + 80); // hold back / retreat slightly
    }
  }
  if (hero.nukeCd <= 0) {
    const target = findBestNukeTarget(hero);
    if (target) useNukeAbility(hero, target);
  }
}

// ── 7. Win / Lose ─────────────────────────────────────────────────

function checkWinLoss() {
  if (state.gameOver) return;
  if (!state.playerBase.alive) endGame('enemy');
  else if (!state.enemyBase.alive) endGame('player');
}

function endGame(winnerSide) {
  state.gameOver = true;
  state.winner = winnerSide;
  showResult(winnerSide);
}

function resetGame() {
  state = createInitialState();
  hideResult();
}

// ── 8. Main Simulation Tick ───────────────────────────────────────

function tick(rawDt) {
  if (state.gameOver) return;
  const dt = rawDt * TIME_SCALE;
  updateSpawning(dt);
  updateCooldowns(dt);
  updateEffects(dt);
  updateRespawns(dt);
  updateAiHero(dt);
  combatTick(state.playerTower, dt);
  combatTick(state.enemyTower, dt);
  state.units.forEach((u) => combatTick(u, dt));
  state.units = state.units.filter((u) => u.type !== 'minion' || u.alive);
  checkWinLoss();
}

// ── 9. Canvas Setup / Coordinate Mapping ──────────────────────────

let canvas, ctx;
let canvasWidth = 0;
let canvasHeight = 0;
const MARGIN = 40;
let colors = {};

function laneX(x) {
  return MARGIN + (x / LANE_LENGTH) * (canvasWidth - MARGIN * 2);
}
function laneY() {
  return canvasHeight / 2;
}

function readColors() {
  const style = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (style.getPropertyValue(name).trim() || fallback);
  colors = {
    player: v('--water', '#4dabf7'),
    enemy: v('--fire', '#ff6b5b'),
    tower: v('--tier-gold', '#e6c15c'),
    base: v('--text-primary', '#f5f5f5'),
    accent: v('--tier-epic', '#b98cff'),
    muted: v('--text-muted', '#6b6b6b'),
    border: v('--border', '#2a2a2a'),
    bgCard: v('--bg-card', '#141414'),
    danger: v('--danger', '#e74c3c'),
    success: v('--success', '#27ae60'),
  };
}

function resizeCanvas() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvasWidth = canvas.clientWidth;
  canvasHeight = canvas.clientHeight;
  canvas.width = Math.round(canvasWidth * dpr);
  canvas.height = Math.round(canvasHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ── 10. Rendering ─────────────────────────────────────────────────

function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHpBar(x, y, w, h, hp, maxHp, color) {
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(x - w / 2, y, w, h);
  const pct = Math.max(0, hp / maxHp);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w * pct, h);
}

function drawLaneBackground() {
  roundRectPath(0, 0, canvasWidth, canvasHeight, 12);
  ctx.fillStyle = colors.bgCard;
  ctx.fill();
  roundRectPath(0.5, 0.5, canvasWidth - 1, canvasHeight - 1, 12);
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  const y = laneY();
  ctx.save();
  ctx.strokeStyle = colors.border;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(MARGIN, y);
  ctx.lineTo(canvasWidth - MARGIN, y);
  ctx.stroke();
  ctx.restore();
}

function drawBase(base) {
  const x = laneX(base.x);
  const y = laneY();
  const size = 30;
  const color = base.side === 'player' ? colors.player : colors.enemy;
  ctx.save();
  ctx.globalAlpha = base.alive ? 1 : 0.4;
  ctx.fillStyle = base.alive ? color : colors.muted;
  roundRectPath(x - size / 2, y - size / 2, size, size, 7);
  ctx.fill();
  ctx.restore();
  drawHpBar(x, y - size / 2 - 14, 46, 5, base.hp, base.maxHp, color);
}

function drawTower(tower) {
  const x = laneX(tower.x);
  const y = laneY();
  const w = 16, h = 40;
  ctx.save();
  ctx.globalAlpha = tower.alive ? 1 : 0.35;
  ctx.fillStyle = tower.alive ? colors.tower : colors.muted;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawHpBar(x, y - h / 2 - 12, 40, 5, tower.hp, tower.maxHp, colors.tower);
}

function drawUnit(unit) {
  const x = laneX(unit.x);
  const y = laneY() + (unit.yOffset || 0);
  const color = unit.side === 'player' ? colors.player : colors.enemy;

  if (unit.type === 'hero') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = colors.accent;
    ctx.stroke();
    if (unit.shield > 0) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawHpBar(x, y - 26, 36, 4, unit.hp, unit.maxHp, color);
  } else {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawHpBar(x, y - 11, 16, 3, unit.hp, unit.maxHp, color);
  }
}

function drawEffect(e) {
  const alpha = Math.max(0, e.ttl / e.maxTtl);
  const y = laneY();
  ctx.save();
  ctx.globalAlpha = alpha;
  if (e.type === 'nuke') {
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(laneX(e.x1), y);
    ctx.lineTo(laneX(e.x2), y);
    ctx.stroke();
  } else if (e.type === 'heal') {
    ctx.strokeStyle = colors.success;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(laneX(e.x), y, 10 + 18 * (1 - alpha), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  if (!ctx || !state || !canvasWidth) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawLaneBackground();
  drawBase(state.playerBase);
  drawBase(state.enemyBase);
  drawTower(state.playerTower);
  drawTower(state.enemyTower);
  state.units.forEach((u) => { if (u.alive) drawUnit(u); });
  state.effects.forEach(drawEffect);
}

// ── 11. HUD / Result Overlay DOM Updates ───────────────────────────

let nukeBtn, healBtn, nukeCdEl, healCdEl, resultEl, resultTitleEl, resultTextEl, restartBtn;

function setBarFill(id, hp, maxHp, alive) {
  const fill = document.getElementById(id);
  if (!fill) return;
  fill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
  fill.closest('.arena-bar')?.classList.toggle('arena-bar--dead', !alive);
}

function updateAbilityButton(btn, cdEl, cd) {
  if (!btn) return;
  const ready = cd <= 0;
  btn.classList.toggle('is-cooldown', !ready);
  btn.disabled = !ready || (state && state.gameOver);
  if (cdEl) cdEl.textContent = ready ? '' : `${Math.ceil(cd)}s`;
}

function updateHud() {
  if (!state) return;
  setBarFill('arena-player-base-fill', state.playerBase.hp, state.playerBase.maxHp, state.playerBase.alive);
  setBarFill('arena-player-tower-fill', state.playerTower.hp, state.playerTower.maxHp, state.playerTower.alive);
  setBarFill('arena-enemy-base-fill', state.enemyBase.hp, state.enemyBase.maxHp, state.enemyBase.alive);
  setBarFill('arena-enemy-tower-fill', state.enemyTower.hp, state.enemyTower.maxHp, state.enemyTower.alive);
  updateAbilityButton(nukeBtn, nukeCdEl, state.playerHero.nukeCd);
  updateAbilityButton(healBtn, healCdEl, state.playerHero.healCd);
}

function showResult(winnerSide) {
  if (!resultEl) return;
  const won = winnerSide === 'player';
  resultTitleEl.textContent = won ? 'Chiến thắng!' : 'Thất bại';
  resultTextEl.textContent = won
    ? 'Bạn đã phá huỷ căn cứ đối phương.'
    : 'Căn cứ của bạn đã bị phá huỷ.';
  resultEl.hidden = false;
}

function hideResult() {
  if (resultEl) resultEl.hidden = true;
}

// ── 12. Input ────────────────────────────────────────────────────

function laneXFromClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const pxInCanvas = clientX - rect.left;
  const usableWidth = Math.max(1, canvasWidth - MARGIN * 2);
  const pct = Math.min(1, Math.max(0, (pxInCanvas - MARGIN) / usableWidth));
  return pct * LANE_LENGTH;
}

function onCanvasClick(e) {
  if (!state || state.gameOver) return;
  state.playerHero.moveTargetX = laneXFromClientX(e.clientX);
}

function onNukeClick() {
  if (!state || state.gameOver) return;
  const hero = state.playerHero;
  if (!hero.alive) return;
  if (hero.nukeCd > 0) { showToast('Đòn hủy diệt đang hồi chiêu'); return; }
  const target = findBestNukeTarget(hero);
  if (!target) { showToast('Không có mục tiêu trong tầm'); return; }
  useNukeAbility(hero, target);
}

function onHealClick() {
  if (!state || state.gameOver) return;
  const hero = state.playerHero;
  if (!hero.alive) return;
  if (hero.healCd > 0) { showToast('Khiên hồi phục đang hồi chiêu'); return; }
  useHealAbility(hero);
}

// ── 13. Main Loop / Boot ───────────────────────────────────────────

let lastTs = null;

function loop(ts) {
  if (lastTs == null) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  dt = Math.min(dt, 0.1); // clamp huge gaps (e.g. tab was backgrounded)
  tick(dt);
  render();
  updateHud();
  requestAnimationFrame(loop);
}

function initArena() {
  canvas = document.getElementById('arena-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  nukeBtn = document.getElementById('arena-ability-nuke');
  healBtn = document.getElementById('arena-ability-heal');
  nukeCdEl = document.getElementById('arena-ability-nuke-cd');
  healCdEl = document.getElementById('arena-ability-heal-cd');
  resultEl = document.getElementById('arena-result');
  resultTitleEl = document.getElementById('arena-result-title');
  resultTextEl = document.getElementById('arena-result-text');
  restartBtn = document.getElementById('arena-restart');

  readColors();
  resizeCanvas();
  window.addEventListener('resize', () => runBootStep(resizeCanvas));

  canvas.addEventListener('click', onCanvasClick);
  nukeBtn?.addEventListener('click', onNukeClick);
  healBtn?.addEventListener('click', onHealClick);
  restartBtn?.addEventListener('click', () => runBootStep(resetGame));

  state = createInitialState();
  requestAnimationFrame(loop);
}

// Test-only inspection/control hook (see .claude/rules/workflow.md testing
// notes) — harmless in production, just exposes the module-scoped state
// that would otherwise be unreachable from outside this file.
window.__arenaDebug = {
  getState: () => state,
  setBaseHp: (side, hp) => {
    const base = side === 'player' ? state.playerBase : state.enemyBase;
    base.hp = hp;
    if (hp <= 0) base.alive = false;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initArena);
});
