/* ============================================================
   Life Balance — game-bomb.js
   "Đại Chiến Bom" — original bomb-placing maze arcade game.
   Grid-based maze (13x11), destructible/indestructible blocks,
   1 active bomb at a time with a "+" blast radius of 1 tile,
   3 random-walk enemies, 3 player lives. Keyboard (arrows/WASD)
   + on-screen D-pad/bomb button, both wired to the same movement
   logic. No persistence — a fresh board is generated on every
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
let bombPlayer = null;      // { r, c, lives, visible, respawning, lastMoveAt }
let bombEnemies = [];       // [{ id, r, c, alive }]
let bombActive = null;      // { r, c } of the single active bomb, or null
let bombBlastCells = [];    // cells currently showing the blast highlight
let bombGameState = 'playing'; // 'playing' | 'won' | 'lost'
let bombEnemyIntervalId = null;
let bombCellEls = [];       // bombCellEls[r][c] -> the cell's <div>

// DOM refs (assigned once in initBombGame)
let bombBoardEl = null;
let bombLivesEl = null;
let bombEnemiesEl = null;
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
  if (bombActive && bombActive.r === r && bombActive.c === c) return false;
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

      if (bombActive && bombActive.r === r && bombActive.c === c) {
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
}

// ── 6. Player Actions ────────────────────────────────────────────

function moveBombPlayer(dr, dc) {
  if (bombGameState !== 'playing' || bombPlayer.respawning) return;
  const now = performance.now();
  if (now - bombPlayer.lastMoveAt < MOVE_COOLDOWN_MS) return;
  const nr = bombPlayer.r + dr;
  const nc = bombPlayer.c + dc;
  if (!isBombWalkable(nr, nc)) return;
  bombPlayer.r = nr;
  bombPlayer.c = nc;
  bombPlayer.lastMoveAt = now;
  renderBombBoard();
}

function placeBomb() {
  if (bombGameState !== 'playing' || bombPlayer.respawning || bombActive) return;
  bombActive = { r: bombPlayer.r, c: bombPlayer.c };
  renderBombBoard();
  setTimeout(explodeBomb, BOMB_FUSE_MS);
}

function explodeBomb() {
  if (!bombActive) return;
  const { r: br, c: bc } = bombActive;

  const tiles = [{ r: br, c: bc }];
  BOMB_DIRECTIONS.forEach(({ dr, dc }) => {
    const nr = br + dr, nc = bc + dc;
    if (nr < 0 || nr >= BOMB_ROWS || nc < 0 || nc >= BOMB_COLS) return;
    if (bombGrid[nr][nc] === 'wall') return;
    tiles.push({ r: nr, c: nc });
  });

  bombActive = null;
  bombBlastCells = tiles;

  tiles.forEach(({ r, c }) => {
    if (bombGrid[r][c] === 'soft') bombGrid[r][c] = 'floor';
    if (bombPlayer.visible && bombPlayer.r === r && bombPlayer.c === c) damageBombPlayer();
    bombEnemies.forEach((enemy) => {
      if (enemy.alive && enemy.r === r && enemy.c === c) killBombEnemy(enemy);
    });
  });

  updateBombHud();
  renderBombBoard();

  setTimeout(() => {
    bombBlastCells = [];
    if (bombGameState === 'playing') renderBombBoard();
  }, BLAST_DURATION_MS);
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
  };
  bombEnemies = BOMB_SPAWN_CORNERS.slice(1).map((pos, i) => ({
    id: i,
    r: pos.r,
    c: pos.c,
    alive: true,
  }));
  bombActive = null;
  bombBlastCells = [];
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
