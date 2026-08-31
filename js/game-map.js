/* ============================================================
   Life Balance — game-map.js
   Ngũ Hành Giang Hồ world map engine (GAME_MAP_ROADMAP.md):
   Phase A1-A4 built the tile-grid renderer, camera, keyboard/joystick
   movement, collision, and a walk-into-zone confirm+transition
   mechanic on one placeholder test map. Phase B (this version) replaces
   that placeholder with the real navigation shell: a 5-Châu menu
   screen, a walkable overworld map per Châu (3 Huyện markers connected
   by roads), and walking into a Huyện marker switching to that Huyện's
   own (still-placeholder) local map. Real per-khu-vực Huyện content is
   Phase C/D's job — this proves the map-to-map navigation shell works.

   Movement model unchanged from Phase A: the player's logical position
   is always snapped to a grid cell (tx, ty), the on-screen pixel
   position (px, py) eases smoothly between cells.

   Engine generalization (Phase B): map dimensions/tiles/tile-colors/
   trigger zones are no longer fixed globals — they're loaded per
   screen via loadMap() so the same render/camera/movement/collision
   code works for the Châu overworld maps AND the Huyện placeholder
   maps (different sizes, different tile palettes).

   Loaded as a plain global, same convention as every other page
   script in this project (no bundler, no ES modules).
   ============================================================ */

'use strict';

// ── 1. Châu/Huyện data ───────────────────────────────────────
// Names and per-Huyện difficulty tier from GAME_MAP_ROADMAP.md's
// "Naming" and "Economy & progression" sections. Tier labels reuse the
// existing rarity vocabulary from design.md's Weapon Rarity Tiers
// table (Sơ cấp/Rèn luyện/Thành thạo/Tinh anh/Huyền thoại) instead of
// the roadmap table's shorthand bronze/silver/gold/epic/legendary, so
// the in-world difficulty language matches what players already see on
// skills.html/weapon-prototype.html.

const CHAU_LIST = [
  {
    key: 'metal', label: 'Kim', name: 'Kim Xà Đại Lục',
    colorVar: '--metal', tintVar: '--metal-tint',
    huyen: [
      { name: 'Bạc Kim Trấn', tier: 'Sơ cấp · Rèn luyện' },
      { name: 'Hoàng Kim Cốc', tier: 'Rèn luyện · Thành thạo' },
      { name: 'Thiết Huyết Thành', tier: 'Thành thạo · Tinh anh · Huyền thoại' },
    ],
  },
  {
    key: 'wood', label: 'Mộc', name: 'Thanh Mộc Đại Lục',
    colorVar: '--wood', tintVar: '--wood-tint',
    huyen: [
      { name: 'Lục Trúc Trang', tier: 'Sơ cấp · Rèn luyện' },
      { name: 'Bách Thảo Cốc', tier: 'Rèn luyện · Thành thạo' },
      { name: 'Sơn Lâm Trấn', tier: 'Thành thạo · Tinh anh · Huyền thoại' },
    ],
  },
  {
    key: 'water', label: 'Thuỷ', name: 'Huyền Thuỷ Đại Lục',
    colorVar: '--water', tintVar: '--water-tint',
    huyen: [
      { name: 'Vân Thuỷ Trấn', tier: 'Sơ cấp · Rèn luyện' },
      { name: 'Đông Hải Cảng', tier: 'Rèn luyện · Thành thạo' },
      { name: 'Bích Ba Cốc', tier: 'Thành thạo · Tinh anh · Huyền thoại' },
    ],
  },
  {
    key: 'fire', label: 'Hoả', name: 'Xích Hoả Đại Lục',
    colorVar: '--fire', tintVar: '--fire-tint',
    huyen: [
      { name: 'Viêm Dương Thành', tier: 'Sơ cấp · Rèn luyện' },
      { name: 'Hồng Liên Tự', tier: 'Rèn luyện · Thành thạo' },
      { name: 'Cuồng Phong Trại', tier: 'Thành thạo · Tinh anh · Huyền thoại' },
    ],
  },
  {
    key: 'earth', label: 'Thổ', name: 'Hoàng Thổ Đại Lục',
    colorVar: '--earth', tintVar: '--earth-tint',
    huyen: [
      { name: 'Bàn Sơn Thành', tier: 'Sơ cấp · Rèn luyện' },
      { name: 'Tuyệt Bích Trấn', tier: 'Rèn luyện · Thành thạo' },
      { name: 'Vạn Lý Bình Nguyên', tier: 'Thành thạo · Tinh anh · Huyền thoại' },
    ],
  },
];

const TILE_SIZE = 32; // logical (CSS) px per tile, same for every map

// ── 2. Tile palettes ─────────────────────────────────────────
// Shared terrain (ground/road) stays neutral greyscale across every
// Châu per GAME_MAP_ROADMAP.md's visual-direction spec; only the
// scattered "feature" patches pick up that Châu's own element color,
// so a player can tell which Châu they're in without the terrain
// itself clashing (e.g. Kim Châu's ground isn't tinted gold everywhere).

function buildTileTypesForChau(chau) {
  return {
    0: { name: 'ground', walkable: true, color() { return CanvasUtils.readCssVar('--bg-card', '#141414'); } },
    1: { name: 'road', walkable: true, color() { return CanvasUtils.readCssVar('--bg-card-hover', '#1c1c1c'); } },
    2: { name: 'wall', walkable: false, color() { return CanvasUtils.readCssVar('--text-muted', '#6b6b6b'); } },
    3: { name: 'feature', walkable: true, color() { return CanvasUtils.readCssVar(chau.tintVar, 'rgba(255,255,255,.12)'); } },
  };
}

function buildNeutralTileTypes() {
  return {
    0: { name: 'ground', walkable: true, color() { return CanvasUtils.readCssVar('--bg-card', '#141414'); } },
    2: { name: 'wall', walkable: false, color() { return CanvasUtils.readCssVar('--text-muted', '#6b6b6b'); } },
  };
}

// ── 3. Map builders ───────────────────────────────────────────

// Draws an L-shaped road (horizontal leg at y1, then vertical leg at
// x2) between two points, only overwriting plain ground so it never
// clobbers a wall or an earlier road/feature tile.
function carveRoad(tiles, x1, y1, x2, y2) {
  let x = x1;
  while (x !== x2) {
    if (tiles[y1][x] === 0) tiles[y1][x] = 1;
    x += x2 > x1 ? 1 : -1;
  }
  let y = y1;
  while (y !== y2) {
    if (tiles[y][x2] === 0) tiles[y][x2] = 1;
    y += y2 > y1 ? 1 : -1;
  }
  if (tiles[y2][x2] === 0) tiles[y2][x2] = 1;
}

// Deterministic (not random) scatter so a given Châu's map looks the
// same on every visit — a simple modulo pattern is enough for "reads
// as flavor terrain from across the map", per the roadmap's visual
// direction spec; it doesn't need to be pretty up close.
function scatterFeaturePatches(tiles, cols, rows) {
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (tiles[y][x] === 0 && (x * 7 + y * 13) % 23 === 0) tiles[y][x] = 3;
    }
  }
}

// A couple of small wall clusters purely for visual variety + to keep
// exercising the Phase A3 collision layer on the real content, not
// just the retired placeholder test map. Positions are fixed fractions
// of the map size, chosen clear of the marker/road layout below.
function placeWallClusters(tiles, cols, rows) {
  const clusters = [
    [Math.floor(cols * 0.35), Math.floor(rows * 0.75)],
    [Math.floor(cols * 0.35) + 1, Math.floor(rows * 0.75)],
    [Math.floor(cols * 0.65), Math.floor(rows * 0.25)],
    [Math.floor(cols * 0.65) + 1, Math.floor(rows * 0.25)],
  ];
  clusters.forEach(([x, y]) => {
    if (tiles[y] && tiles[y][x] === 0) tiles[y][x] = 2;
  });
}

// Builds one Châu's walkable overworld: a 26x18 grid with its 3 Huyện
// laid out in a triangle and connected by roads, per Phase B's spec
// ("3 Huyện markers connected by roads/paths"). Travel between Huyện
// here is real walking; travel between Châu (menu -> here) is not.
function buildChauMap(chau) {
  const cols = 26;
  const rows = 18;
  const tiles = [];
  for (let y = 0; y < rows; y++) {
    tiles.push(new Array(cols).fill(0));
  }

  const markers = [
    { x: 3, y: Math.floor(rows / 2) },
    { x: Math.floor(cols / 2), y: 3 },
    { x: cols - 4, y: Math.floor(rows / 2) },
  ];
  carveRoad(tiles, markers[0].x, markers[0].y, markers[1].x, markers[1].y);
  carveRoad(tiles, markers[1].x, markers[1].y, markers[2].x, markers[2].y);

  scatterFeaturePatches(tiles, cols, rows);
  placeWallClusters(tiles, cols, rows);

  const triggerZones = chau.huyen.map((huyen, i) => ({
    id: `huyen-${chau.key}-${i}`,
    tx: markers[i].x,
    ty: markers[i].y,
    icon: '🏯',
    label: huyen.name,
    promptText: `Nhấn để vào ${huyen.name}`,
    meta: { tier: huyen.tier, chauName: chau.name },
  }));

  return {
    cols,
    rows,
    tiles,
    tileTypes: buildTileTypesForChau(chau),
    triggerZones,
    // Spawns just off the first Huyện, on the road leading to it, so
    // the player always lands somewhere walkable.
    spawn: { tx: markers[0].x + 2, ty: markers[0].y },
  };
}

// A small, empty, walled-in placeholder for a Huyện's own local map —
// proves the chau-map -> huyen-map screen transition and that the
// engine generalizes to a second, differently-sized map, per the A4
// log's "next session" note. Phase C replaces this with the real 5
// khu vực (đánh quái/hang động/tháp/khu dân cư/khu luyện công) for
// each Huyện, one at a time.
function buildHuyenPlaceholderMap() {
  const cols = 12;
  const rows = 9;
  const tiles = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      row.push(border ? 2 : 0);
    }
    tiles.push(row);
  }
  return {
    cols,
    rows,
    tiles,
    tileTypes: buildNeutralTileTypes(),
    triggerZones: [],
    spawn: { tx: Math.floor(cols / 2), ty: Math.floor(rows / 2) },
  };
}

function findTriggerAt(tx, ty) {
  return mapState.triggerZones.find((zone) => zone.tx === tx && zone.ty === ty) || null;
}

// ── 4. State ──────────────────────────────────────────────────

const mapState = {
  // 'menu' (Châu-select screen, no canvas) | 'chau' (walkable overworld)
  // | 'huyen' (walkable placeholder local map).
  screen: 'menu',
  currentChauKey: null,
  currentHuyenMeta: null, // { name, tier, chauName } while screen === 'huyen'

  cols: 0,
  rows: 0,
  tiles: [],
  tileTypes: {},
  triggerZones: [],

  player: {
    tx: 0, ty: 0,
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
  // 'none' (not on a trigger tile) -> 'prompt' (standing on a Huyện
  // marker, confirm bar visible). Confirming switches mapState.screen
  // straight to 'huyen' (see enterHuyen()) rather than opening a modal,
  // so there's no third "blocked" state to track here.
  trigger: { zone: null, state: 'none' },
};

const MOVE_DURATION_MS = 140;

const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const KEY_TO_DIRECTION = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};

// ── 5. Movement ───────────────────────────────────────────────

function isWalkable(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= mapState.cols || ty >= mapState.rows) return false;
  const type = mapState.tileTypes[mapState.tiles[ty][tx]];
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

// ── 6. Camera ─────────────────────────────────────────────────

function updateCamera() {
  const player = mapState.player;
  const viewportW = mapState.canvas.width / mapState.dpr;
  const viewportH = mapState.canvas.height / mapState.dpr;
  const mapPxW = mapState.cols * TILE_SIZE;
  const mapPxH = mapState.rows * TILE_SIZE;

  const centerX = player.px + TILE_SIZE / 2;
  const centerY = player.py + TILE_SIZE / 2;

  mapState.camera.x = mapPxW <= viewportW
    ? (mapPxW - viewportW) / 2
    : Math.max(0, Math.min(centerX - viewportW / 2, mapPxW - viewportW));

  mapState.camera.y = mapPxH <= viewportH
    ? (mapPxH - viewportH) / 2
    : Math.max(0, Math.min(centerY - viewportH / 2, mapPxH - viewportH));
}

// ── 7. Rendering ──────────────────────────────────────────────

function renderFrame() {
  const { ctx, canvas, camera, dpr } = mapState;
  const viewportW = canvas.width / dpr;
  const viewportH = canvas.height / dpr;

  ctx.clearRect(0, 0, viewportW, viewportH);
  ctx.fillStyle = CanvasUtils.readCssVar('--bg-page', '#0a0a0a');
  ctx.fillRect(0, 0, viewportW, viewportH);

  const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const endCol = Math.min(mapState.cols - 1, Math.ceil((camera.x + viewportW) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endRow = Math.min(mapState.rows - 1, Math.ceil((camera.y + viewportH) / TILE_SIZE));

  const borderColor = CanvasUtils.readCssVar('--border', '#2a2a2a');

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const type = mapState.tileTypes[mapState.tiles[row][col]];
      const screenX = col * TILE_SIZE - camera.x;
      const screenY = row * TILE_SIZE - camera.y;
      ctx.fillStyle = type.color();
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX + 0.5, screenY + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }

  // Trigger zone markers, drawn after tiles but before the player so a
  // marker under the player stays visible until they step off it.
  mapState.triggerZones.forEach((zone) => {
    if (zone.tx < startCol || zone.tx > endCol || zone.ty < startRow || zone.ty > endRow) return;
    const zx = zone.tx * TILE_SIZE - camera.x + TILE_SIZE / 2;
    const zy = zone.ty * TILE_SIZE - camera.y + TILE_SIZE / 2;
    ctx.font = `${Math.round(TILE_SIZE * 0.6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zone.icon, zx, zy);
  });

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

// ── 8. Interaction / transition triggers ────────────────────────
// Walking onto a Huyện marker shows a confirm prompt — never an
// instant auto-transition, per GAME_MAP_ROADMAP.md's spec, so a player
// just passing near a marker can't trigger it by accident. Walking off
// the tile before confirming cancels it (no separate cancel button
// needed). Confirming switches the whole screen to that Huyện's local
// map (enterHuyen()) rather than opening a modal over the Châu map.

function showTriggerPrompt(zone) {
  const promptEl = document.getElementById('map-trigger-prompt');
  const textEl = document.getElementById('map-trigger-prompt-text');
  if (!promptEl || !textEl) return;
  textEl.textContent = `${zone.icon} ${zone.promptText}`;
  promptEl.hidden = false;
}

function hideTriggerPrompt() {
  const promptEl = document.getElementById('map-trigger-prompt');
  if (promptEl) promptEl.hidden = true;
}

function confirmActiveTrigger() {
  const trig = mapState.trigger;
  if (trig.state !== 'prompt' || !trig.zone) return;
  hideTriggerPrompt();
  enterHuyen(trig.zone);
}

function updateTriggerZone() {
  const trig = mapState.trigger;
  const zoneHere = findTriggerAt(mapState.player.tx, mapState.player.ty);

  if (zoneHere && trig.state !== 'prompt') {
    trig.zone = zoneHere;
    trig.state = 'prompt';
    showTriggerPrompt(zoneHere);
  } else if (!zoneHere && trig.state === 'prompt') {
    trig.zone = null;
    trig.state = 'none';
    hideTriggerPrompt();
  }
}

function initTriggerUi() {
  document.getElementById('map-trigger-confirm-btn')?.addEventListener('click', confirmActiveTrigger);

  window.addEventListener('keydown', (e) => {
    if (mapState.trigger.state === 'prompt' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      confirmActiveTrigger();
    }
  });
}

// ── 9. Screen navigation (Phase B) ───────────────────────────────
// Three screens share the one canvas/engine: the Châu menu (no canvas,
// menu-based travel between Châu per the roadmap), a Châu's walkable
// overworld, and a Huyện's walkable local map. loadMap() is the single
// place that swaps the engine's active map data and resets per-map
// state (player position, camera, trigger prompt).

function loadMap(map, screenName) {
  mapState.cols = map.cols;
  mapState.rows = map.rows;
  mapState.tiles = map.tiles;
  mapState.tileTypes = map.tileTypes;
  mapState.triggerZones = map.triggerZones;

  const player = mapState.player;
  player.tx = map.spawn.tx;
  player.ty = map.spawn.ty;
  player.px = map.spawn.tx * TILE_SIZE;
  player.py = map.spawn.ty * TILE_SIZE;
  player.moving = false;

  mapState.pressed.clear();
  mapState.lastDirection = null;
  mapState.trigger = { zone: null, state: 'none' };
  hideTriggerPrompt();

  mapState.screen = screenName;
  showMapScreen(screenName);
}

function showMapScreen(screenName) {
  const menuEl = document.getElementById('map-chau-menu');
  const playArea = document.getElementById('map-play-area');
  const banner = document.getElementById('map-huyen-banner');

  if (menuEl) menuEl.hidden = screenName !== 'menu';
  if (playArea) playArea.hidden = screenName === 'menu';
  if (banner) banner.hidden = screenName !== 'huyen';

  if (screenName !== 'menu') {
    // The canvas may have just gone from hidden -> visible; a hidden
    // element's getBoundingClientRect() collapses to 0x0, so the size
    // computed while it was hidden would otherwise stick until the
    // next window resize. Recompute now that it has real layout.
    resizeCanvas();
  }
}

function updateNavHeader() {
  const backBtn = document.getElementById('map-nav-back-btn');
  const title = document.getElementById('map-nav-title');
  if (!backBtn || !title) return;

  if (mapState.screen === 'chau') {
    const chau = CHAU_LIST.find((c) => c.key === mapState.currentChauKey);
    backBtn.textContent = '← Về danh sách Châu';
    backBtn.onclick = exitToMenu;
    title.textContent = chau ? chau.name : '';
  } else if (mapState.screen === 'huyen') {
    const chau = CHAU_LIST.find((c) => c.key === mapState.currentChauKey);
    backBtn.textContent = `← Quay lại ${chau ? chau.name : 'bản đồ Châu'}`;
    backBtn.onclick = exitToChau;
    title.textContent = mapState.currentHuyenMeta ? mapState.currentHuyenMeta.name : '';
  }
}

function updateHuyenBanner() {
  const textEl = document.getElementById('map-huyen-banner-text');
  if (!textEl || !mapState.currentHuyenMeta) return;
  const meta = mapState.currentHuyenMeta;
  textEl.textContent = `🚧 ${meta.name} · ${meta.tier} — nội dung khu vực thật (đánh quái / hang động / tháp / khu dân cư / khu luyện công) sẽ được xây ở Phase C.`;
}

function enterChau(key) {
  const chau = CHAU_LIST.find((c) => c.key === key);
  if (!chau) return;
  mapState.currentChauKey = key;
  mapState.currentHuyenMeta = null;
  loadMap(buildChauMap(chau), 'chau');
  updateNavHeader();
}

function enterHuyen(zone) {
  mapState.currentHuyenMeta = { name: zone.label, tier: zone.meta.tier, chauName: zone.meta.chauName };
  loadMap(buildHuyenPlaceholderMap(), 'huyen');
  updateNavHeader();
  updateHuyenBanner();
}

function exitToChau() {
  if (!mapState.currentChauKey) {
    exitToMenu();
    return;
  }
  enterChau(mapState.currentChauKey);
}

function exitToMenu() {
  mapState.currentChauKey = null;
  mapState.currentHuyenMeta = null;
  mapState.screen = 'menu';
  showMapScreen('menu');
}

function renderChauMenu() {
  const container = document.getElementById('map-chau-menu');
  if (!container) return;
  container.textContent = '';

  CHAU_LIST.forEach((chau) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `map-chau-card map-chau-card--${chau.key}`;

    const label = document.createElement('span');
    label.className = 'map-chau-card__label';
    label.textContent = chau.label;

    const name = document.createElement('span');
    name.className = 'map-chau-card__name';
    name.textContent = chau.name;

    const huyenList = document.createElement('span');
    huyenList.className = 'map-chau-card__huyen';
    huyenList.textContent = chau.huyen.map((h) => h.name).join(' · ');

    card.append(label, name, huyenList);
    card.addEventListener('click', () => enterChau(chau.key));
    container.appendChild(card);
  });
}

// ── 10. Game loop ─────────────────────────────────────────────
// Movement/camera/render only run once a map is loaded (screen !==
// 'menu') — on the menu screen there's no canvas content to draw and
// mapState.cols/rows/tiles aren't populated yet.

function gameLoop(now) {
  if (mapState.screen !== 'menu') {
    updateMovement(now);
    if (!mapState.player.moving) processHeldMovement();
    updateTriggerZone();
    updateCamera();
    renderFrame();
    updateHud();
  }
  requestAnimationFrame(gameLoop);
}

// ── 11. Canvas sizing ─────────────────────────────────────────

function resizeCanvas() {
  const canvas = mapState.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  mapState.dpr = dpr;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  mapState.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ── 12. Input wiring ───────────────────────────────────────────

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

// ── 13. Boot ───────────────────────────────────────────────────

function initGameMap() {
  const canvas = document.getElementById('map-canvas');
  if (!canvas || !window.CanvasUtils) {
    console.warn('game-map.js: canvas or CanvasUtils missing, aborting');
    return;
  }

  mapState.canvas = canvas;
  mapState.ctx = canvas.getContext('2d');

  window.addEventListener('resize', resizeCanvas);

  initMapInput();
  initTriggerUi();
  renderChauMenu();
  showMapScreen('menu');

  requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initGameMap);
});
