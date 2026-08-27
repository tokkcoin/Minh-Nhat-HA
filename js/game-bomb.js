/* ============================================================
   Life Balance — game-bomb.js
   "Đại Chiến Bom" — original bomb-placing maze arcade game.
   Grid-based maze (13x11), destructible/indestructible blocks,
   a "+" blast that starts at 1 tile/1 bomb and grows via
   power-ups (bigger radius, more simultaneous bombs, faster
   movement) dropped by destroyed blocks, 3 random-walk enemies,
   3 player lives. Keyboard (arrows/WASD) + on-screen D-pad/bomb
   button, both wired to the same movement logic. No persistence —
   a fresh board (and power-up levels) is generated on every
   load/restart, matching the "single play session" scope agreed
   for this mini-game.
   ============================================================ */

'use strict';

// ── 1. Board Constants ─────────────────────────────────────────

const BOMB_ROWS = 11;
const BOMB_COLS = 13;
const BOMB_FUSE_MS = 2000;
const BLAST_DURATION_MS = 400;
const RESPAWN_DELAY_MS = 900;
const ENEMY_TICK_MS = 500;
const MOVE_COOLDOWN_MS = 140;
const SOFT_BLOCK_MIN_DENSITY = 0.55;
const SOFT_BLOCK_MAX_DENSITY = 0.65;

// Power-ups: dropped from a destroyed soft block with this chance,
// sit on the floor until the player walks onto them. Each type has
// a cap so a single game can't scale forever.
const POWERUP_SPAWN_CHANCE = 0.3;
const POWERUP_MAX_RADIUS = 4; // base 1 + up to 3 pickups
const POWERUP_MAX_BOMBS = 4;  // base 1 + up to 3 pickups
const POWERUP_MAX_SPEED_LEVEL = 3;
const SPEED_STEP_MS = 25;
const MIN_MOVE_COOLDOWN_MS = 60;

const POWERUP_INFO = {
  radius: { glyph: '💥', label: 'Tầm nổ' },
  bombs:  { glyph: '🧨', label: 'Số bom' },
  speed:  { glyph: '👟', label: 'Tốc độ' },
};
const POWERUP_TYPES = Object.keys(POWERUP_INFO);

// Player spawn + the 3 enemy spawn corners. Each corner cell plus
// its 2 orthogonal neighbors must stay clear of soft blocks so no
// one starts boxed in (spec requirement for the player corner;
// applied to enemy corners too so they aren't born stuck forever,
// since enemies never destroy blocks).
const BOMB_SPAWN_CORNERS = [
  { r: 1, c: 1 },                          // player
  { r: 1, c: BOMB_COLS - 2 },              // enemy A
  { r: BOMB_ROWS - 2, c: 1 },              // enemy B
  { r: BOMB_ROWS - 2, c: BOMB_COLS - 2 },  // enemy C
];

const BOMB_DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

// ── 2. Game State ───────────────────────────────────────────────

let bombGrid = [];          // bombGrid[r][c] = 'wall' | 'floor' | 'soft'
let bombPlayer = null;      // { r, c, lives, visible, respawning, lastMoveAt, blastRadius, maxBombs, speedLevel, moveCooldownMs }
let bombEnemies = [];       // [{ id, r, c, alive }]
let bombActiveBombs = [];   // [{ r, c, radius }] — one entry per bomb currently ticking
let bombBlastCells = [];    // cells currently showing the blast highlight (may hold overlapping blasts from separate bombs)
let bombPowerUps = {};      // { 'r,c': 'radius' | 'bombs' | 'speed' } — pickups sitting on the floor
let bombGameState = 'playing'; // 'playing' | 'won' | 'lost'
let bombEnemyIntervalId = null;
let bombCellEls = [];       // bombCellEls[r][c] -> the cell's <div>

// DOM refs (assigned once in initBombGame)
let bombBoardEl = null;
let bombLivesEl = null;
let bombEnemiesEl = null;
let bombPowerEl = null;
let bombOverlayEl = null;
let bombOverlayIconEl = null;
let bombOverlayTitleEl = null;
let bombOverlayTextEl = null;

// ── 3. Board Generation ─────────────────────────────────────────

function buildBombGrid() {
  const grid = [];
  for (let r = 0; r < BOMB_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BOMB_COLS; c++) {
      const isBorder = r === 0 || r === BOMB_ROWS - 1 || c === 0 || c === BOMB_COLS - 1;
      const isPillar = r % 2 === 0 && c % 2 === 0;
      row.push(isBorder || isPillar ? 'wall' : 'floor');
    }
    grid.push(row);
  }

  const protectedCells = new Set();
  BOMB_SPAWN_CORNERS.forEach(({ r, c }) => {
    protectedCells.add(`${r},${c}`);
    BOMB_DIRECTIONS.forEach(({ dr, dc }) => {
      const nr = r + dr, nc = c + dc;
      if (grid[nr]?.[nc] === 'floor') protectedCells.add(`${nr},${nc}`);
    });
  });

  const density = SOFT_BLOCK_MIN_DENSITY + Math.random() * (SOFT_BLOCK_MAX_DENSITY - SOFT_BLOCK_MIN_DENSITY);
  for (let r = 0; r < BOMB_ROWS; r++) {
    for (let c = 0; c < BOMB_COLS; c++) {
      if (grid[r][c] !== 'floor') continue;
      if (protectedCells.has(`${r},${c}`)) continue;
      if (Math.random() < density) grid[r][c] = 'soft';
    }
  }

  return grid;
}

// ── 4. Movement / Occupancy Helpers ─────────────────────────────

function isBombWalkable(r, c) {
  if (r < 0 || r >= BOMB_ROWS || c < 0 || c >= BOMB_COLS) return false;
  const terrain = bombGrid[r][c];
  if (terrain === 'wall' || terrain === 'soft') return false;
  if (bombActiveBombs.some((b) => b.r === r && b.c === c)) return false;
  return true;
}

// ── 5. Rendering ─────────────────────────────────────────────────

function buildBombBoardCells() {
  const fragment = document.createDocumentFragment();
  bombCellEls = [];
  for (let r = 0; r < BOMB_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BOMB_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'bomb-cell';
      fragment.appendChild(cell);
      row.push(cell);
    }
    bombCellEls.push(row);
  }
  bombBoardEl.appendChild(fragment);
}

function renderBombBoard() {
  for (let r = 0; r < BOMB_ROWS; r++) {
    for (let c = 0; c < BOMB_COLS; c++) {
      const cell = bombCellEls[r][c];
      const terrain = bombGrid[r][c];
      let cls = `bomb-cell bomb-cell--${terrain}`;
      let glyph = '';

      const powerUpType = bombPowerUps[`${r},${c}`];
      if (powerUpType) {
        cls += ' bomb-cell--powerup';
        glyph = POWERUP_INFO[powerUpType].glyph;
      }

      if (bombActiveBombs.some((b) => b.r === r && b.c === c)) {
        cls += ' bomb-cell--bomb';
        glyph = '💣';
      }

      const liveEnemy = bombEnemies.find((e) => e.alive && e.r === r && e.c === c);
      if (liveEnemy) {
        cls += ' bomb-cell--enemy';
        glyph = '👾';
      }

      if (bombPlayer.visible && bombPlayer.r === r && bombPlayer.c === c) {
        cls += ' bomb-cell--player';
        glyph = '🙂';
      }

      if (bombBlastCells.some((b) => b.r === r && b.c === c)) {
        cls += ' bomb-cell--blast';
        glyph = '🔥';
      }

      cell.className = cls;
      cell.textContent = glyph;
    }
  }
}

function updateBombHud() {
  if (bombLivesEl) {
    const lives = Math.max(bombPlayer.lives, 0);
    bombLivesEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(3 - lives, 0));
  }
  if (bombEnemiesEl) {
    bombEnemiesEl.textContent = String(bombEnemies.filter((e) => e.alive).length);
  }
  if (bombPowerEl) {
    const parts = [];
    if (bombPlayer.blastRadius > 1) parts.push(`💥×${bombPlayer.blastRadius}`);
    if (bombPlayer.maxBombs > 1) parts.push(`🧨×${bombPlayer.maxBombs}`);
    if (bombPlayer.speedLevel > 0) parts.push(`👟×${bombPlayer.speedLevel}`);
    bombPowerEl.textContent = parts.length ? parts.join(' ') : '–';
  }
}

// ── 6. Player Actions ────────────────────────────────────────────

function moveBombPlayer(dr, dc) {
  if (bombGameState !== 'playing' || bombPlayer.respawning) return;
  const now = performance.now();
  if (now - bombPlayer.lastMoveAt < bombPlayer.moveCooldownMs) return;
  const nr = bombPlayer.r + dr;
  const nc = bombPlayer.c + dc;
  if (!isBombWalkable(nr, nc)) return;
  bombPlayer.r = nr;
  bombPlayer.c = nc;
  bombPlayer.lastMoveAt = now;
  collectPowerUpAt(nr, nc);
  renderBombBoard();
}

function placeBomb() {
  if (bombGameState !== 'playing' || bombPlayer.respawning) return;
  if (bombActiveBombs.length >= bombPlayer.maxBombs) return;
  if (bombActiveBombs.some((b) => b.r === bombPlayer.r && b.c === bombPlayer.c)) return;
  const bomb = { r: bombPlayer.r, c: bombPlayer.c, radius: bombPlayer.blastRadius };
  bombActiveBombs.push(bomb);
  renderBombBoard();
  setTimeout(() => explodeBomb(bomb), BOMB_FUSE_MS);
}

// Walks outward from the bomb in all 4 directions up to its own
// radius, stopping at a wall (blocks it entirely) or right after a
// soft block (the blast destroys it but doesn't punch through).
function explodeBomb(bomb) {
  const idx = bombActiveBombs.indexOf(bomb);
  if (idx === -1) return; // already resolved (shouldn't happen, defensive)
  bombActiveBombs.splice(idx, 1);

  // A bomb whose fuse outlives the round (e.g. placed right before
  // the player's last life was lost) shouldn't still deal damage,
  // spawn power-ups, or re-trigger the win/lose overlay.
  if (bombGameState !== 'playing') {
    renderBombBoard();
    return;
  }

  const { r: br, c: bc, radius } = bomb;
  const tiles = [{ r: br, c: bc }];

  BOMB_DIRECTIONS.forEach(({ dr, dc }) => {
    for (let step = 1; step <= radius; step++) {
      const nr = br + dr * step;
      const nc = bc + dc * step;
      if (nr < 0 || nr >= BOMB_ROWS || nc < 0 || nc >= BOMB_COLS) break;
      if (bombGrid[nr][nc] === 'wall') break;
      tiles.push({ r: nr, c: nc });
      if (bombGrid[nr][nc] === 'soft') break;
    }
  });

  bombBlastCells = bombBlastCells.concat(tiles);

  tiles.forEach(({ r, c }) => {
    if (bombGrid[r][c] === 'soft') {
      bombGrid[r][c] = 'floor';
      maybeSpawnPowerUp(r, c);
    }
    if (bombPlayer.visible && bombPlayer.r === r && bombPlayer.c === c) damageBombPlayer();
    bombEnemies.forEach((enemy) => {
      if (enemy.alive && enemy.r === r && enemy.c === c) killBombEnemy(enemy);
    });
  });

  updateBombHud();
  renderBombBoard();

  setTimeout(() => {
    bombBlastCells = bombBlastCells.filter((cell) => !tiles.includes(cell));
    if (bombGameState === 'playing') renderBombBoard();
  }, BLAST_DURATION_MS);
}

// ── 6b. Power-Ups ────────────────────────────────────────────────

function maybeSpawnPowerUp(r, c) {
  if (Math.random() >= POWERUP_SPAWN_CHANCE) return;
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  bombPowerUps[`${r},${c}`] = type;
}

function collectPowerUpAt(r, c) {
  const key = `${r},${c}`;
  const type = bombPowerUps[key];
  if (!type) return;
  delete bombPowerUps[key];
  applyPowerUp(type);
}

function applyPowerUp(type) {
  if (type === 'radius') {
    if (bombPlayer.blastRadius >= POWERUP_MAX_RADIUS) { showToast('💥 Tầm nổ đã đạt mức tối đa!'); return; }
    bombPlayer.blastRadius += 1;
    showToast(`💥 Tầm nổ bom +1! (${bombPlayer.blastRadius})`);
  } else if (type === 'bombs') {
    if (bombPlayer.maxBombs >= POWERUP_MAX_BOMBS) { showToast('🧨 Số bom tối đa đã đạt mức cao nhất!'); return; }
    bombPlayer.maxBombs += 1;
    showToast(`🧨 Số bom tối đa +1! (${bombPlayer.maxBombs})`);
  } else if (type === 'speed') {
    if (bombPlayer.speedLevel >= POWERUP_MAX_SPEED_LEVEL) { showToast('👟 Tốc độ đã đạt mức tối đa!'); return; }
    bombPlayer.speedLevel += 1;
    bombPlayer.moveCooldownMs = Math.max(MOVE_COOLDOWN_MS - bombPlayer.speedLevel * SPEED_STEP_MS, MIN_MOVE_COOLDOWN_MS);
    showToast(`👟 Tốc độ di chuyển +1! (${bombPlayer.speedLevel})`);
  }
  updateBombHud();
}

function damageBombPlayer() {
  bombPlayer.lives -= 1;
  bombPlayer.visible = false;
  bombPlayer.respawning = true;

  if (bombPlayer.lives <= 0) {
    endBombGame('lost');
    return;
  }

  setTimeout(() => {
    if (bombGameState !== 'playing') return;
    bombPlayer.r = BOMB_SPAWN_CORNERS[0].r;
    bombPlayer.c = BOMB_SPAWN_CORNERS[0].c;
    bombPlayer.visible = true;
    bombPlayer.respawning = false;
    renderBombBoard();
  }, RESPAWN_DELAY_MS);
}

function killBombEnemy(enemy) {
  enemy.alive = false;
  if (bombEnemies.every((e) => !e.alive)) endBombGame('won');
}

// ── 7. Enemy AI ───────────────────────────────────────────────────

function bombEnemyTick() {
  if (bombGameState !== 'playing') return;
  bombEnemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const options = BOMB_DIRECTIONS
      .map(({ dr, dc }) => ({ r: enemy.r + dr, c: enemy.c + dc }))
      .filter(({ r, c }) => isBombWalkable(r, c));
    if (options.length === 0) return;
    const pick = options[Math.floor(Math.random() * options.length)];
    enemy.r = pick.r;
    enemy.c = pick.c;
  });
  renderBombBoard();
}

// ── 8. Win / Lose / Restart ────────────────────────────────────────

function endBombGame(result) {
  bombGameState = result;
  if (bombEnemyIntervalId) clearInterval(bombEnemyIntervalId);
  // A blast's fade-out timeout (see explodeBomb) only re-renders while still
  // 'playing', so if the game ends mid-fade the 🔥 highlight would otherwise
  // stay stuck on the board under the overlay — clear it here too.
  bombBlastCells = [];
  renderBombBoard();
  updateBombHud();

  if (result === 'won') {
    showBombOverlay('🏆', 'Chiến thắng!', 'Bạn đã tiêu diệt toàn bộ đối thủ trong mê cung.');
  } else {
    showBombOverlay('💥', 'Trò chơi kết thúc', 'Bạn đã hết mạng. Nhấn "Chơi lại" để thử lại mê cung mới.');
  }
}

function showBombOverlay(icon, title, text) {
  if (!bombOverlayEl) return;
  if (bombOverlayIconEl) bombOverlayIconEl.textContent = icon;
  if (bombOverlayTitleEl) bombOverlayTitleEl.textContent = title;
  if (bombOverlayTextEl) bombOverlayTextEl.textContent = text;
  bombOverlayEl.hidden = false;
}

function hideBombOverlay() {
  if (bombOverlayEl) bombOverlayEl.hidden = true;
}

function resetBombGame() {
  bombGrid = buildBombGrid();
  bombPlayer = {
    r: BOMB_SPAWN_CORNERS[0].r,
    c: BOMB_SPAWN_CORNERS[0].c,
    lives: 3,
    visible: true,
    respawning: false,
    lastMoveAt: 0,
    blastRadius: 1,
    maxBombs: 1,
    speedLevel: 0,
    moveCooldownMs: MOVE_COOLDOWN_MS,
  };
  bombEnemies = BOMB_SPAWN_CORNERS.slice(1).map((pos, i) => ({
    id: i,
    r: pos.r,
    c: pos.c,
    alive: true,
  }));
  bombActiveBombs = [];
  bombBlastCells = [];
  bombPowerUps = {};
  bombGameState = 'playing';

  hideBombOverlay();
  updateBombHud();
  renderBombBoard();

  if (bombEnemyIntervalId) clearInterval(bombEnemyIntervalId);
  bombEnemyIntervalId = setInterval(bombEnemyTick, ENEMY_TICK_MS);
}

// ── 9. Input Wiring ─────────────────────────────────────────────────

const BOMB_KEY_MOVES = {
  arrowup: { dr: -1, dc: 0 },
  w: { dr: -1, dc: 0 },
  arrowdown: { dr: 1, dc: 0 },
  s: { dr: 1, dc: 0 },
  arrowleft: { dr: 0, dc: -1 },
  a: { dr: 0, dc: -1 },
  arrowright: { dr: 0, dc: 1 },
  d: { dr: 0, dc: 1 },
};

function handleBombKeydown(e) {
  const key = e.key.toLowerCase();
  const move = BOMB_KEY_MOVES[key];
  if (move) {
    e.preventDefault();
    moveBombPlayer(move.dr, move.dc);
    return;
  }
  if (key === ' ' || key === 'b') {
    e.preventDefault();
    placeBomb();
  }
}

function wireBombControls() {
  document.addEventListener('keydown', handleBombKeydown);

  document.getElementById('bomb-btn-up')?.addEventListener('click', () => moveBombPlayer(-1, 0));
  document.getElementById('bomb-btn-down')?.addEventListener('click', () => moveBombPlayer(1, 0));
  document.getElementById('bomb-btn-left')?.addEventListener('click', () => moveBombPlayer(0, -1));
  document.getElementById('bomb-btn-right')?.addEventListener('click', () => moveBombPlayer(0, 1));
  document.getElementById('bomb-btn-place')?.addEventListener('click', () => placeBomb());
  document.getElementById('bomb-restart-btn')?.addEventListener('click', () => resetBombGame());
}

// ── 10. Boot ───────────────────────────────────────────────────────

function initBombGame() {
  bombBoardEl = document.getElementById('bomb-board');
  bombLivesEl = document.getElementById('bomb-lives');
  bombEnemiesEl = document.getElementById('bomb-enemies');
  bombPowerEl = document.getElementById('bomb-power');
  bombOverlayEl = document.getElementById('bomb-overlay');
  bombOverlayIconEl = document.getElementById('bomb-overlay-icon');
  bombOverlayTitleEl = document.getElementById('bomb-overlay-title');
  bombOverlayTextEl = document.getElementById('bomb-overlay-text');

  if (!bombBoardEl) {
    console.warn('game-bomb: #bomb-board not found, skipping init');
    return;
  }

  buildBombBoardCells();
  wireBombControls();
  resetBombGame();
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initBombGame);
});
