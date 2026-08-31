/* ============================================================
   Life Balance — game-map.js
   Ngũ Hành Giang Hồ world map engine — Phase A1+A2 (GAME_MAP_ROADMAP.md):
   tile-grid renderer, camera viewport following the player, keyboard
   (arrow/WASD) movement PLUS a virtual joystick for touch, on one
   small placeholder test map. No real Châu/Huyện content yet, no
   blocked tiles (A3), no interaction triggers (A4) — this file
   proves the engine itself works before any of that is layered on.

   Movement model: the player's logical position is always snapped to
   a grid cell (tx, ty) — per GAME_MAP_ROADMAP.md's "tile-grid based
   movement" constraint — but the on-screen pixel position (px, py)
   animates smoothly between cells so it doesn't feel like a jump-cut.
   Only bounds are enforced here; a real walkable/blocked flag per
   tile is Phase A3's job (see TILE_TYPES below, already shaped to
   take a `walkable` field so A3 slots in without a rewrite).

   Loaded as a plain global, same convention as every other page
   script in this project (no bundler, no ES modules).
   ============================================================ */

'use strict';

// ── 1. Placeholder test map ──────────────────────────────────
// Real Châu/Huyện content comes in Phase B/C. This is only meant to
// prove the render/camera/movement engine on a map bigger than one
// screen, with enough visual variety to see tiles + camera scrolling.

const MAP_COLS = 20;
const MAP_ROWS = 15;
const TILE_SIZE = 32; // logical (CSS) px per tile

const TILE_TYPES = {
  0: { name: 'grass', walkable: true, color() { return CanvasUtils.readCssVar('--wood-tint', 'rgba(95,208,104,.12)'); } },
  1: { name: 'path',  walkable: true, color() { return CanvasUtils.readCssVar('--earth-tint', 'rgba(201,160,121,.12)'); } },
};

function buildTestMap() {
  const tiles = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    const row = [];
    for (let x = 0; x < MAP_COLS; x++) {
      // A simple criss-cross "path" pattern over "grass" so camera
      // scrolling + tile boundaries are visually obvious while testing.
      const onPath = (x % 6 === 0) || (y % 5 === 0);
      row.push(onPath ? 1 : 0);
    }
    tiles.push(row);
  }
  return tiles;
}

// ── 2. State ──────────────────────────────────────────────────

const mapState = {
  tiles: buildTestMap(),
  player: {
    tx: Math.floor(MAP_COLS / 2),
    ty: Math.floor(MAP_ROWS / 2),
    px: 0, py: 0,       // current rendered pixel position (top-left of tile)
    fromPx: 0, fromPy: 0,
    toPx: 0, toPy: 0,
    moving: false,
    moveStart: 0,
  },
  camera: { x: 0, y: 0 },
  pressed: new Set(),
  lastDirection: null,
  canvas: null,
  ctx: null,
  dpr: 1,
};

const MOVE_DURATION_MS = 140;

const DIRECTIONS = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy: 1 },
  left:  { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const KEY_TO_DIRECTION = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};

// ── 3. Movement ───────────────────────────────────────────────

function isWalkable(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_COLS || ty >= MAP_ROWS) return false;
  const type = TILE_TYPES[mapState.tiles[ty][tx]];
  return !type || type.walkable;
}

function tryStartMove(direction) {
  const player = mapState.player;
  if (player.moving) return;

  const delta = DIRECTIONS[direction];
  if (!delta) return;

  const newTx = player.tx + delta.dx;
  const newTy = player.ty + delta.dy;
  if (!isWalkable(newTx, newTy)) return;

  player.fromPx = player.px;
  player.fromPy = player.py;
  player.toPx = newTx * TILE_SIZE;
  player.toPy = newTy * TILE_SIZE;
  player.tx = newTx;
  player.ty = newTy;
  player.moving = true;
  player.moveStart = performance.now();
}

function updateMovement(now) {
  const player = mapState.player;
  if (!player.moving) return;

  const elapsed = now - player.moveStart;
  const t = Math.min(1, elapsed / MOVE_DURATION_MS);
  // Ease-out so each step decelerates slightly into the next cell.
  const eased = 1 - (1 - t) * (1 - t);

  player.px = player.fromPx + (player.toPx - player.fromPx) * eased;
  player.py = player.fromPy + (player.toPy - player.fromPy) * eased;

  if (t >= 1) {
    player.px = player.toPx;
    player.py = player.toPy;
    player.moving = false;
  }
}

function processHeldMovement() {
  const player = mapState.player;
  if (player.moving) return;

  let direction = null;
  if (mapState.lastDirection && mapState.pressed.has(mapState.lastDirection)) {
    direction = mapState.lastDirection;
  } else if (mapState.pressed.size > 0) {
    direction = mapState.pressed.values().next().value;
  }
  if (direction) tryStartMove(direction);
}

// ── 4. Camera ─────────────────────────────────────────────────

function updateCamera() {
  const player = mapState.player;
  const viewportW = mapState.canvas.width / mapState.dpr;
  const viewportH = mapState.canvas.height / mapState.dpr;
  const mapPxW = MAP_COLS * TILE_SIZE;
  const mapPxH = MAP_ROWS * TILE_SIZE;

  const centerX = player.px + TILE_SIZE / 2;
  const centerY = player.py + TILE_SIZE / 2;

  mapState.camera.x = mapPxW <= viewportW
    ? (mapPxW - viewportW) / 2
    : Math.max(0, Math.min(centerX - viewportW / 2, mapPxW - viewportW));

  mapState.camera.y = mapPxH <= viewportH
    ? (mapPxH - viewportH) / 2
    : Math.max(0, Math.min(centerY - viewportH / 2, mapPxH - viewportH));
}

// ── 5. Rendering ──────────────────────────────────────────────

function renderFrame() {
  const { ctx, canvas, camera, dpr } = mapState;
  const viewportW = canvas.width / dpr;
  const viewportH = canvas.height / dpr;

  ctx.clearRect(0, 0, viewportW, viewportH);
  ctx.fillStyle = CanvasUtils.readCssVar('--bg-page', '#0a0a0a');
  ctx.fillRect(0, 0, viewportW, viewportH);

  const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const endCol = Math.min(MAP_COLS - 1, Math.ceil((camera.x + viewportW) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endRow = Math.min(MAP_ROWS - 1, Math.ceil((camera.y + viewportH) / TILE_SIZE));

  const borderColor = CanvasUtils.readCssVar('--border', '#2a2a2a');

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const type = TILE_TYPES[mapState.tiles[row][col]];
      const screenX = col * TILE_SIZE - camera.x;
      const screenY = row * TILE_SIZE - camera.y;
      ctx.fillStyle = type.color();
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX + 0.5, screenY + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }

  const player = mapState.player;
  const px = player.px - camera.x + TILE_SIZE / 2;
  const py = player.py - camera.y + TILE_SIZE / 2;

  ctx.font = `${Math.round(TILE_SIZE * 0.75)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧑‍🎤', px, py);
}

function updateHud() {
  const hud = document.getElementById('map-hud-pos');
  if (hud) hud.textContent = `Ô: (${mapState.player.tx}, ${mapState.player.ty})`;
}

// ── 6. Game loop ──────────────────────────────────────────────

function gameLoop(now) {
  updateMovement(now);
  if (!mapState.player.moving) processHeldMovement();
  updateCamera();
  renderFrame();
  updateHud();
  requestAnimationFrame(gameLoop);
}

// ── 7. Canvas sizing ──────────────────────────────────────────

function resizeCanvas() {
  const canvas = mapState.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  mapState.dpr = dpr;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  mapState.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ── 8. Input wiring ───────────────────────────────────────────

// Shared by keyboard and joystick: both are just sources of a held
// "direction" that feeds the same tryStartMove()/processHeldMovement()
// mechanism. Edge-triggering tryStartMove() on activation (rather than
// only via the game loop's per-frame poll) matters for BOTH sources —
// see the Phase A1 log entry in GAME_MAP_ROADMAP.md: a press short
// enough that release fires before the next animation frame would
// otherwise never register a move at all, whether that press is a key
// tap or a quick joystick flick.
function activateDirection(direction) {
  const isNewPress = !mapState.pressed.has(direction);
  if (isNewPress) mapState.lastDirection = direction;
  mapState.pressed.add(direction);
  if (isNewPress) tryStartMove(direction);
}

function deactivateDirection(direction) {
  mapState.pressed.delete(direction);
  if (mapState.lastDirection === direction) mapState.lastDirection = null;
}

function initKeyboardInput() {
  window.addEventListener('keydown', (e) => {
    const direction = KEY_TO_DIRECTION[e.key];
    if (!direction) return;
    e.preventDefault();
    activateDirection(direction);
  });

  window.addEventListener('keyup', (e) => {
    const direction = KEY_TO_DIRECTION[e.key];
    if (!direction) return;
    deactivateDirection(direction);
  });
}

// Virtual joystick: drag from the base's center, direction snaps to
// whichever axis has the larger offset (4-way, matching the tile-grid
// movement model — no diagonals), a small dead zone avoids jitter from
// a near-still finger. Uses Pointer Events so touch and mouse share one
// code path (mouse makes it testable on desktop too).
const JOYSTICK_DEAD_ZONE_PX = 14;
const JOYSTICK_MAX_OFFSET_PX = 30;

function initJoystickInput() {
  const base = document.getElementById('map-joystick');
  const thumb = document.getElementById('map-joystick-thumb');
  if (!base || !thumb) return;

  let activePointerId = null;
  let centerX = 0;
  let centerY = 0;
  let currentDirection = null;

  function setThumbOffset(dx, dy) {
    thumb.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function releaseJoystick() {
    if (currentDirection) deactivateDirection(currentDirection);
    currentDirection = null;
    activePointerId = null;
    setThumbOffset(0, 0);
    base.classList.remove('map-joystick--active');
  }

  base.addEventListener('pointerdown', (e) => {
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    try {
      base.setPointerCapture(activePointerId);
    } catch (err) {
      console.warn('game-map.js: setPointerCapture failed, continuing without capture', err);
    }
    const rect = base.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    base.classList.add('map-joystick--active');
    e.preventDefault();
  });

  base.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const magnitude = Math.hypot(dx, dy);

    const clamped = Math.min(magnitude, JOYSTICK_MAX_OFFSET_PX);
    if (magnitude > 0) {
      setThumbOffset((dx / magnitude) * clamped, (dy / magnitude) * clamped);
    } else {
      setThumbOffset(0, 0);
    }

    let nextDirection = null;
    if (magnitude >= JOYSTICK_DEAD_ZONE_PX) {
      nextDirection = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
    }

    if (nextDirection !== currentDirection) {
      if (currentDirection) deactivateDirection(currentDirection);
      currentDirection = nextDirection;
      if (currentDirection) activateDirection(currentDirection);
    }
  });

  const endHandler = (e) => {
    if (e.pointerId !== activePointerId) return;
    releaseJoystick();
  };
  base.addEventListener('pointerup', endHandler);
  base.addEventListener('pointercancel', endHandler);
  base.addEventListener('pointerleave', (e) => {
    // A mouse can leave the base while still held; touch delivers
    // pointercancel/pointerup instead, so this mainly matters for mice.
    if (e.pointerId !== activePointerId || e.pointerType !== 'mouse') return;
    releaseJoystick();
  });
}

function initMapInput() {
  initKeyboardInput();
  initJoystickInput();
}

// ── 9. Boot ───────────────────────────────────────────────────

function initGameMap() {
  const canvas = document.getElementById('map-canvas');
  if (!canvas || !window.CanvasUtils) {
    console.warn('game-map.js: canvas or CanvasUtils missing, aborting');
    return;
  }

  mapState.canvas = canvas;
  mapState.ctx = canvas.getContext('2d');
  mapState.player.px = mapState.player.tx * TILE_SIZE;
  mapState.player.py = mapState.player.ty * TILE_SIZE;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  initMapInput();
  requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initGameMap);
});
