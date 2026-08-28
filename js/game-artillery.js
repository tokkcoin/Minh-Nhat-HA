/* ============================================================
   Life Balance — game-artillery.js
   "Pháo Đài Anh Hùng" — original turn-based 2D artillery duel.
   Canvas-rendered procedural terrain, parabolic projectile
   physics (gravity + per-round wind), player vs local AI,
   single-player only, entirely client-side, no build step.
   ============================================================ */

'use strict';

// ── 1. Constants (tuned for a 900x420 logical canvas) ─────────

const LOGICAL_W = 900;
const LOGICAL_H = 420;

const GRAVITY           = 0.35;  // px / frame^2 (downward)
const WIND_ACCEL_SCALE  = 0.018; // turns a -5..5 wind value into a small constant horizontal accel
const MIN_SPEED         = 3;     // launch speed at 0% power
const MAX_SPEED         = 18;    // launch speed at 100% power
const SUBSTEPS          = 4;     // physics sub-steps per animation frame (collision accuracy only)

// Projectile visual radius — 5x the original (was 4px) per explicit request.
// HIT_RADIUS is bumped to just past the new visual radius (not a full 5x)
// so the hit registers right as the drawn ball visually touches a
// character, rather than either "hits from empty space" (hitbox bigger
// than sprite) or "visibly overlapping but no hit" (sprite bigger than
// hitbox) — a deliberate, coherent choice tied to the size change, not an
// unrelated balance tweak.
const PROJECTILE_RADIUS = 20;    // was 4
const TRAIL_RADIUS      = 7;     // was 2 — scaled up, but less than 5x so the trail doesn't overwhelm the scene
// Bumped again (24→34) alongside the 5x character-size change below — a
// hit should register the moment the now-much-bigger projectile visibly
// touches the now-much-bigger character, not still use a hitbox sized for
// the old tiny 16px sprite.
const HIT_RADIUS        = 34;

// ── Nội Lực (inner-power) resource — governs how many shots a side can
// fire in a single turn. Resets to full at the start of each side's own
// turn (not banked across turns) so the tradeoff stays simple: spend it
// all this turn or lose it, never a long-term resource to hoard.
const NOI_LUC_MAX = 100;

// ── Weapon (ammo) types — real tactical trade-offs, not cosmetic-only.
// `cost` is spent from the shooter's Nội Lực per shot — cheaper weapons
// can be fired more times in one turn, expensive ones fewer.
// Each button in the HUD maps to one of these; the shooter's *current*
// selection is read at fire time in playerFire()/aiTurn().
const WEAPON_TYPES = {
  normal:   { label: 'Thường', directMin: 25, directMax: 35, splashRadius: 55, splashDamage: 22, cost: 30 },
  piercing: { label: 'Xuyên',  directMin: 34, directMax: 46, splashRadius: 32, splashDamage: 12, cost: 50 },
  cluster:  { label: 'Chùm',   directMin: 16, directMax: 24, splashRadius: 78, splashDamage: 30, cost: 40 },
};
const CHEAPEST_WEAPON_COST = Math.min(...Object.values(WEAPON_TYPES).map((w) => w.cost));

// ── Pet/mount (roadmap item: "a pet/mount system for game-artillery.html
// fed by Wood/health data, Gunny-style") ────────────────────────────────
// The pet is never a separate thing the player builds *in* this game —
// it's a live readout of health.js's real quest level (js/elementStats.js's
// ElementStats.readWood(), the same reader game-wulin.js/characterPanel.js
// already use), same "never invent a parallel data model" rule as the
// gear-tier wiring in game-wulin.js. Higher real Mộc/Health quest level ->
// a further-evolved pet/mount -> a real combat bonus (extra max HP, plus a
// flat % damage bonus once the pet becomes rideable). Ordered highest
// minLevel first so PET_STAGES.find() below returns the first (highest)
// stage the player currently qualifies for, mirroring
// ElementStats.STAR_TIERS'/game-wulin.js's WULIN_WEAPON_BONUS_PCT's own
// "ordered highest-first, take the first match" convention. A brand-new
// user with zero health quests is still level 1 (elementStatsQuestLevel's
// floor(0/100)+1), which correctly lands on the zero-bonus "Trứng" stage
// below rather than crashing or falling through to nothing.
const PET_STAGES = [
  { minLevel: 25, key: 'divine',    emoji: '🐉', label: 'Thần thú',  hpBonus: 60, dmgBonusPct: .18 },
  { minLevel: 13, key: 'mount',     emoji: '🐴', label: 'Thú cưỡi',  hpBonus: 35, dmgBonusPct: .10 },
  { minLevel: 7,  key: 'pet',       emoji: '🐕', label: 'Thú cưng',  hpBonus: 20, dmgBonusPct: .05 },
  { minLevel: 3,  key: 'hatchling', emoji: '🐣', label: 'Thú non',   hpBonus: 10, dmgBonusPct: 0 },
  { minLevel: 1,  key: 'egg',       emoji: '🥚', label: 'Trứng',     hpBonus: 0,  dmgBonusPct: 0 },
];

function computeArtilleryPetStage() {
  const { level } = ElementStats.readWood();
  const stage = PET_STAGES.find((s) => level >= s.minLevel) || PET_STAGES[PET_STAGES.length - 1];
  return { ...stage, level };
}

const CRATER_RADIUS = 26;
const CRATER_DEPTH  = 34;

// Character visual footprint — 5x the original tiny 16px body, per explicit
// request. This is now the single source of truth for where a character's
// "center" sits (used for the emoji draw position, the floating HP/Nội
// Lực bars, the aim-line origin, AND the collision center used by
// applyTerrainImpact()/simulateShot() below) — replaces the old
// BODY_W/BODY_H constants entirely so every one of those stays visually
// consistent with the new bigger sprite instead of drifting apart.
const CHAR_VISUAL_SIZE = 80;   // ~5x the old 16px BODY_H
const CHAR_ANCHOR_Y    = 36;   // how far above the ground line the character's center sits
const BARREL_LEN       = 28;   // was 20 — nudged up so the aim line still reads clearly against the bigger sprite

// ── 2. Small Math Helpers ──────────────────────────────────────

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }
function randRange(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(randRange(min, max + 1)); }

// ── 3. Terrain Generation (midpoint displacement) ──────────────

function generateTerrain(width, height) {
  const n = 7; // 2^7 + 1 = 129 control points across the width
  const size = 2 ** n + 1;
  const pts = new Array(size);
  const baseline = height * 0.55;

  pts[0] = baseline + (Math.random() - 0.5) * height * 0.15;
  pts[size - 1] = baseline + (Math.random() - 0.5) * height * 0.15;

  let step = size - 1;
  let range = height * 0.30;
  const roughness = 0.55;
  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < size - 1; i += step) {
      const avg = (pts[i - half] + pts[i + half]) / 2;
      pts[i] = avg + (Math.random() - 0.5) * range;
    }
    step = half;
    range *= roughness;
  }

  for (let i = 0; i < size; i++) {
    pts[i] = clamp(pts[i], height * 0.25, height * 0.88);
  }

  // Interpolate the sparse control points into one y-value per pixel column
  // so collision checks can just index straight into the array.
  const heights = new Float32Array(width);
  const seg = (width - 1) / (size - 1);
  for (let x = 0; x < width; x++) {
    const posf = x / seg;
    const i0 = Math.floor(posf);
    const i1 = Math.min(i0 + 1, size - 1);
    const t = posf - i0;
    heights[x] = pts[i0] * (1 - t) + pts[i1] * t;
  }
  return heights;
}

// ── 4. Game State ───────────────────────────────────────────────

const state = {
  width: LOGICAL_W,
  height: LOGICAL_H,
  terrain: null,
  player: { x: 0, hp: 100, maxHp: 100, aimAngle: 45, weapon: 'normal', hits: 0, noiLuc: NOI_LUC_MAX },
  ai: { x: 0, hp: 100, maxHp: 100, aimAngle: 135, weapon: 'normal', hits: 0, noiLuc: NOI_LUC_MAX },
  round: 1,
  wind: 0,
  turn: 'player', // 'player' | 'ai'
  busy: false,    // true while a projectile is flying or it's the AI's turn
  over: false,
  pet: null,      // current pet/mount stage, set by newGame() from real Wood/health data
};

// ── 5. DOM Refs + Colors (filled in by initArtilleryGame) ──────

let canvas, ctx;
let angleInput, powerInput, angleValueEl, powerValueEl, fireBtn;
let playerHpFill, playerHpValue, aiHpFill, aiHpValue, turnEl, windEl;
let overlayEl, overlayTitleEl, overlayTextEl, restartBtn;
let roundEl, windArrowEl, playerBadgeEl, aiBadgeEl, playerStatEl, aiStatEl;
let playerPetBadgeEl, playerPetLineEl;
let playerNoiLucFill, playerNoiLucValue, aiNoiLucFill, aiNoiLucValue;
let weaponBtns = [];
let COLORS = {};

function loadPaletteColors() {
  const v = CanvasUtils.readCssVar;
  COLORS = {
    bgPage:     v('--bg-page', '#0a0a0a'),
    bgCard:     v('--bg-card', '#141414'),
    bgCardHover:v('--bg-card-hover', '#1c1c1c'),
    border:     v('--border', '#2a2a2a'),
    tierSilver: v('--tier-silver', '#c7ccd1'),
    tierGold:   v('--tier-gold', '#e6c15c'),
    tierEpic:   v('--tier-epic', '#b98cff'),
    fire:       v('--fire', '#ff6b5b'),
    water:      v('--water', '#4dabf7'),
    earth:      v('--earth', '#c9a079'),
    success:    v('--success', '#27ae60'),
    danger:     v('--danger', '#e74c3c'),
    textSecondary: v('--text-secondary', '#a3a3a3'),
  };
}

// Recolors the power slider's native accent (green→gold→red) as a cheap,
// cross-browser-safe stand-in for a full custom gauge — avoids the
// vendor-prefixed track/thumb pseudo-elements a "real" gradient slider
// would need, which is riskier on Pi Browser's mobile WebKit.
function updatePowerGaugeColor() {
  if (!powerInput) return;
  const v = Number(powerInput.value);
  const color = v < 40 ? COLORS.success : v < 75 ? COLORS.tierGold : COLORS.danger;
  powerInput.style.accentColor = color;
  powerValueEl.style.color = color;
}

// ── 6. Terrain / Character Sampling ────────────────────────────

function getSurfaceY(x) {
  const xi = clamp(Math.round(x), 0, state.width - 1);
  return state.terrain[xi];
}

function carveCrater(x, y) {
  const cx = Math.round(x);
  for (let dx = -CRATER_RADIUS; dx <= CRATER_RADIUS; dx++) {
    const col = cx + dx;
    if (col < 0 || col >= state.width) continue;
    const d = Math.abs(dx);
    if (d > CRATER_RADIUS) continue;
    const factor = 1 - d / CRATER_RADIUS;
    const push = CRATER_DEPTH * factor;
    state.terrain[col] = clamp(state.terrain[col] + push, state.height * 0.20, state.height * 0.94);
  }
}

// ── 7. Damage Application ───────────────────────────────────────

// `dmgMult` is the *shooter's* pet/mount damage bonus (1 = no bonus) —
// always derived from state.pet at fire time in simulateShot(), never
// stored on the weapon/target, since it's a property of who fired the
// shot, not of the weapon type or who it hits.
function applyDirectHit(charState, key, x, y, weapon, dmgMult = 1) {
  const damage = Math.round(randInt(weapon.directMin, weapon.directMax) * dmgMult);
  charState.hp = clamp(charState.hp - damage, 0, charState.maxHp);
  charState.hits += 1;
  return { type: 'direct', target: key, damage, x, y };
}

function applyTerrainImpact(x, y, weapon, dmgMult = 1) {
  carveCrater(x, y);
  const info = { type: 'splash', hits: [], x, y };
  [['player', state.player], ['ai', state.ai]].forEach(([key, c]) => {
    const cy = getSurfaceY(c.x) - CHAR_ANCHOR_Y;
    const d = dist(x, y, c.x, cy);
    if (d <= weapon.splashRadius) {
      const damage = Math.round(weapon.splashDamage * (1 - d / weapon.splashRadius) * dmgMult);
      if (damage > 0) {
        c.hp = clamp(c.hp - damage, 0, c.maxHp);
        info.hits.push({ target: key, damage });
      }
    }
  });
  return info;
}

// ── 8. Projectile Simulation (shared by player + AI) ────────────

function simulateShot(side, angleDeg, power) {
  return new Promise((resolve) => {
    const shooter = side === 'player' ? state.player : state.ai;
    const weapon = WEAPON_TYPES[shooter.weapon] || WEAPON_TYPES.normal;
    // Only the player's shots carry the pet/mount damage bonus — it's a
    // reward for the real user's own tracked habit progress, not something
    // the local AI opponent should also benefit from.
    const dmgMult = side === 'player' ? 1 + (state.pet?.dmgBonusPct || 0) : 1;
    const dir = side === 'player' ? 1 : -1;
    const rad = (angleDeg * Math.PI) / 180;
    const speed = MIN_SPEED + (power / 100) * (MAX_SPEED - MIN_SPEED);

    const groundY = getSurfaceY(shooter.x);
    const originX = shooter.x;
    const originY = groundY - CHAR_ANCHOR_Y;
    const tipX = originX + Math.cos(rad) * BARREL_LEN * dir;
    const tipY = originY - Math.sin(rad) * BARREL_LEN;

    shooter.aimAngle = angleDeg;

    const proj = {
      x: tipX,
      y: tipY,
      vx: Math.cos(rad) * speed * dir,
      vy: -Math.sin(rad) * speed,
    };
    const windAccel = state.wind * WIND_ACCEL_SCALE;
    const trail = [];
    const subDt = 1 / SUBSTEPS;

    function step() {
      let resolved = false;
      let hitInfo = null;

      for (let s = 0; s < SUBSTEPS && !resolved; s++) {
        proj.vx += windAccel * subDt;
        proj.vy += GRAVITY * subDt;
        proj.x += proj.vx * subDt;
        proj.y += proj.vy * subDt;
        trail.push({ x: proj.x, y: proj.y });
        if (trail.length > 18) trail.shift();

        if (proj.x < -20 || proj.x > state.width + 20 || proj.y > state.height + 40) {
          resolved = true;
          hitInfo = { type: 'miss' };
          break;
        }

        // Direct-hit check only against the *opponent* — never the shooter's
        // own position. Real bug hit while testing the 5x character/hitbox
        // size bump: the projectile spawns close to the shooter's own
        // collision point (barrel tip is only BARREL_LEN away), and once
        // HIT_RADIUS grew past that spawn distance, every shot immediately
        // "hit" the shooter themselves in the very first substep. Splash
        // damage (applyTerrainImpact, below) still legitimately checks both
        // sides — landing a shot close to your own position on terrain
        // impact is a real, intentional risk; hitting yourself the instant
        // you fire is not.
        const target = side === 'player' ? state.ai : state.player;
        const targetKey = side === 'player' ? 'ai' : 'player';
        const targetCy = getSurfaceY(target.x) - CHAR_ANCHOR_Y;
        if (dist(proj.x, proj.y, target.x, targetCy) < HIT_RADIUS) {
          resolved = true;
          hitInfo = applyDirectHit(target, targetKey, proj.x, proj.y, weapon, dmgMult);
          break;
        }

        const ground = getSurfaceY(clamp(proj.x, 0, state.width - 1));
        if (proj.y >= ground) {
          resolved = true;
          hitInfo = applyTerrainImpact(clamp(proj.x, 0, state.width - 1), ground, weapon, dmgMult);
          break;
        }
      }

      draw({ trail, projectile: resolved ? null : { x: proj.x, y: proj.y } });

      if (resolved) {
        resolve(hitInfo);
      } else {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  });
}

// ── 9. AI Aiming ─────────────────────────────────────────────────
// Basic projectile-range math at a fixed 45° (sin(2*45°) = 1, so
// speed = sqrt(distance * gravity) solves the no-wind flat-range
// case), then a randomized error band on top — the band shrinks
// slightly each round so the AI slowly gets more accurate.

function computeAimForTarget(fromX, toX) {
  const dx = Math.abs(toX - fromX);
  const angle = 45;
  const speed = clamp(Math.sqrt(dx * GRAVITY), MIN_SPEED, MAX_SPEED);
  const power = clamp(((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 100, 5, 100);
  return { angle, power };
}

function computeAiAim() {
  const base = computeAimForTarget(state.ai.x, state.player.x);
  const errorBand = Math.max(10 - state.round * 0.5, 3);
  const angle = clamp(base.angle + (Math.random() * 2 - 1) * errorBand, 8, 82);
  const power = clamp(base.power + (Math.random() * 2 - 1) * errorBand * 1.6, 5, 100);
  return { angle, power };
}

// ── 10. Rendering ────────────────────────────────────────────────

function roundRectPath(x, y, w, h, r) {
  CanvasUtils.roundRectPath(ctx, x, y, w, h, r);
}

// Cute emoji avatars (5x the old plain rounded-rect body) — text glyphs
// drawn straight onto the canvas via fillText, no external image assets,
// matching this app's existing "emoji + inline SVG/CSS only" constraint
// even inside canvas drawing code.
const CHAR_EMOJI = { player: '🐹', ai: '👹' };

function drawFloatingBars(c, centerX, aboveY, accentColor) {
  const w = 46;
  const hpY = aboveY;
  const nlY = aboveY + 7;

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = COLORS.bgPage;
  roundRectPath(centerX - w / 2, hpY, w, 5, 2);
  ctx.fill();
  roundRectPath(centerX - w / 2, nlY, w, 4, 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const hpPct = clamp(c.hp, 0, c.maxHp) / c.maxHp;
  if (hpPct > 0) {
    ctx.fillStyle = accentColor;
    roundRectPath(centerX - w / 2, hpY, w * hpPct, 5, 2);
    ctx.fill();
  }
  const nlPct = clamp(c.noiLuc, 0, 100) / 100;
  if (nlPct > 0) {
    ctx.fillStyle = COLORS.tierEpic;
    roundRectPath(centerX - w / 2, nlY, w * nlPct, 4, 2);
    ctx.fill();
  }
}

function drawCharacter(c, color, dir, emoji) {
  const groundY = getSurfaceY(c.x);
  const centerY = groundY - CHAR_ANCHOR_Y;

  // Aim-direction indicator — kept as a separate glowing line + tip dot
  // (not part of the character sprite itself) so switching to a cute
  // emoji avatar doesn't lose the "which way am I aiming" readability
  // Worms-style artillery games rely on.
  const rad = (c.aimAngle * Math.PI) / 180;
  const bx = c.x + Math.cos(rad) * BARREL_LEN * dir;
  const by = centerY - Math.sin(rad) * BARREL_LEN;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(c.x, centerY);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(bx, by, 4, 0, Math.PI * 2);
  ctx.fill();

  // The cute avatar itself — the AI's is mirrored horizontally (dir < 0)
  // so it visually "faces" the player instead of facing away.
  ctx.save();
  ctx.font = `${CHAR_VISUAL_SIZE}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (dir < 0) {
    ctx.translate(c.x, centerY);
    ctx.scale(-1, 1);
    ctx.fillText(emoji, 0, 0);
  } else {
    ctx.fillText(emoji, c.x, centerY);
  }
  ctx.restore();

  drawFloatingBars(c, c.x, centerY - CHAR_VISUAL_SIZE * 0.62, color);
}

function drawWindIndicator() {
  const wind = state.wind;
  const cx = state.width / 2;
  const cy = 26;
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '600 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  const arrow = wind === 0 ? '·' : wind > 0 ? '→' : '←';
  ctx.fillText(`Gió ${arrow} ${Math.abs(wind).toFixed(1)}`, cx, cy);
  ctx.textAlign = 'left';
}

// Fixed star/torch positions + two parallax hill silhouettes, generated
// once per new game so they don't jitter every frame during a projectile
// animation. Two hill layers (far/near) give real depth instead of one
// flat silhouette; torches are small original decorative "hero fortress"
// details (glowing dots), not modeled on any specific game's art.
let backdropStars = [];
let backdropHillsFar = null;
let backdropHillsNear = null;
let backdropTorches = [];
let backdropRocks = [];

// Idle animation clock — advances on a lightweight setInterval (not a full
// 60fps requestAnimationFrame loop, to keep this cheap on the mobile
// target) so the water strip at the bottom of the scene actually shimmers
// even when no shot is in flight. Guarded to never run while a shot's own
// rAF stepping loop is driving draw() itself (see startIdleAnimation()).
let idleT = 0;
let idleAnimHandle = null;

function generateBackdrop() {
  backdropStars = Array.from({ length: 55 }, (_, i) => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height * 0.5,
    r: i % 9 === 0 ? Math.random() * 1.2 + 1.6 : Math.random() * 1.1 + 0.4, // a few "bright" stars
    a: Math.random() * 0.5 + 0.35,
    bright: i % 9 === 0,
  }));
  // Two coarser midpoint-displacement passes for far/near parallax hills —
  // purely decorative, collision only ever uses state.terrain.
  backdropHillsFar  = generateTerrain(state.width, state.height).map((y) => y * 0.55 + state.height * 0.16);
  backdropHillsNear = generateTerrain(state.width, state.height).map((y) => y * 0.68 + state.height * 0.22);
  // A few warm glowing "torches" sitting on the far hill line, evenly
  // spread with a little jitter so they don't look grid-aligned.
  backdropTorches = Array.from({ length: 4 }, (_, i) => {
    const x = Math.round(state.width * ((i + 0.5) / 4) + (Math.random() - 0.5) * 60);
    return { x, y: backdropHillsFar[clamp(x, 0, state.width - 1)] };
  });
  // Rocks sitting right on the real (collidable) terrain surface, for a
  // natural rocky-ground texture — positions read straight off state.terrain
  // (already generated above), never affecting collision.
  backdropRocks = Array.from({ length: 12 }, () => {
    const x = Math.random() * state.width;
    return { x, y: getSurfaceY(x), w: randRange(4, 10), h: randRange(3, 7) };
  });
}

function drawBackdrop() {
  // Dusk atmosphere wash — a soft colorful band low over the horizon,
  // layered at reduced alpha over the near-black base sky so the app's
  // dark theme is preserved while still reading as a real, colorful scene.
  const wash = ctx.createLinearGradient(0, 0, 0, state.height * 0.62);
  wash.addColorStop(0, COLORS.tierEpic);
  wash.addColorStop(0.55, COLORS.fire);
  wash.addColorStop(1, COLORS.bgPage);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, state.width, state.height * 0.62);
  ctx.globalAlpha = 1;

  // Moon, with a soft multi-ring halo instead of a flat disc.
  const moonX = state.width * 0.85;
  const moonY = state.height * 0.16;
  const halo = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 46);
  halo.addColorStop(0, COLORS.tierGold);
  halo.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = COLORS.tierGold;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Stars (a handful drawn brighter/bigger with a tiny glow for pop)
  backdropStars.forEach((s) => {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = s.bright ? COLORS.water : COLORS.tierSilver;
    if (s.bright) { ctx.shadowColor = COLORS.water; ctx.shadowBlur = 6; }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1;

  // Far hill layer (most translucent — deepest in the scene)
  drawHillLayer(backdropHillsFar, COLORS.tierEpic, 0.16);
  // Near hill layer (slightly warmer/darker — closer than the far layer,
  // still well behind the real, collidable terrain drawn after this)
  drawHillLayer(backdropHillsNear, COLORS.bgCard, 0.75);

  // Torch glows sitting on the far hill line
  backdropTorches.forEach((t) => {
    const glow = ctx.createRadialGradient(t.x, t.y, 1, t.x, t.y, 18);
    glow.addColorStop(0, COLORS.tierGold);
    glow.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawHillLayer(points, color, alpha) {
  if (!points) return;
  ctx.beginPath();
  ctx.moveTo(0, points[0]);
  for (let x = 1; x < state.width; x++) ctx.lineTo(x, points[x]);
  ctx.lineTo(state.width, state.height);
  ctx.lineTo(0, state.height);
  ctx.closePath();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Water strip + rocks at the base of the scene — always sits below the
// lowest point terrain generation can ever produce (terrain is clamped to
// height*0.88 max, this band starts at height*0.92), so it never covers
// the actual playfield/characters, only the "underground" dirt beneath it,
// reading as a river/lake bed at the base of the valley. `idleT` drives a
// small shimmer via startIdleAnimation()'s interval.
function drawWaterAndRocks() {
  const waterTop = state.height * 0.92;
  const shimmer = Math.sin(idleT) * 0.08;

  const waterGrad = ctx.createLinearGradient(0, waterTop, 0, state.height);
  waterGrad.addColorStop(0, COLORS.water);
  waterGrad.addColorStop(1, COLORS.bgCard);
  ctx.globalAlpha = 0.55 + shimmer;
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, waterTop, state.width, state.height - waterTop);
  ctx.globalAlpha = 1;

  // Drifting shimmer highlight lines across the water
  ctx.strokeStyle = COLORS.tierSilver;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = waterTop + 6 + i * 7 + Math.sin(idleT * 1.3 + i * 2) * 2;
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Rocks embedded along the real terrain ridge (drawn after the ridge
  // line so they visibly sit on top of it, half-buried in the ground).
  backdropRocks.forEach((r) => {
    ctx.fillStyle = COLORS.bgCardHover;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y - r.h * 0.3, r.w, r.h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function draw(dynamic = {}) {
  if (!ctx) return;
  const { trail = [], projectile = null } = dynamic;

  ctx.clearRect(0, 0, state.width, state.height);

  // Base sky is solid near-black — drawBackdrop() layers the actual color
  // (dusk wash, moon, stars, hills) on top at reduced alpha so this stays
  // a real dark-theme scene, not a flat black rectangle.
  ctx.fillStyle = COLORS.bgPage;
  ctx.fillRect(0, 0, state.width, state.height);

  drawBackdrop();
  drawWindIndicator();

  // Terrain fill — warm, lit-from-above gradient (gold ridge fading to
  // dark earth) instead of a flat gray, so the actual playfield reads as
  // a real battlefield rather than a grayscale silhouette.
  ctx.beginPath();
  ctx.moveTo(0, state.terrain[0]);
  for (let x = 1; x < state.width; x++) ctx.lineTo(x, state.terrain[x]);
  ctx.lineTo(state.width, state.height);
  ctx.lineTo(0, state.height);
  ctx.closePath();
  const terrainGrad = ctx.createLinearGradient(0, state.height * 0.3, 0, state.height);
  terrainGrad.addColorStop(0, COLORS.earth);
  terrainGrad.addColorStop(0.35, COLORS.border);
  terrainGrad.addColorStop(1, COLORS.bgCard);
  ctx.fillStyle = terrainGrad;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Terrain ridge line, with a soft glow so the playfield edge actually
  // pops against the backdrop instead of blending into it.
  ctx.strokeStyle = COLORS.tierGold;
  ctx.lineWidth = 2;
  ctx.shadowColor = COLORS.tierGold;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, state.terrain[0]);
  for (let x = 1; x < state.width; x++) ctx.lineTo(x, state.terrain[x]);
  ctx.stroke();
  ctx.shadowBlur = 0;

  drawWaterAndRocks();

  drawCharacter(state.player, COLORS.tierSilver, 1, CHAR_EMOJI.player);
  drawCharacter(state.ai, COLORS.fire, -1, CHAR_EMOJI.ai);

  trail.forEach((p, i) => {
    ctx.globalAlpha = ((i + 1) / trail.length) * 0.5;
    ctx.fillStyle = COLORS.tierGold;
    ctx.beginPath();
    ctx.arc(p.x, p.y, TRAIL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  if (projectile) {
    // A soft glow behind the (now much bigger, 5x) projectile core so it
    // reads as a hot/energetic ball rather than a flat gold disc.
    const glow = ctx.createRadialGradient(projectile.x, projectile.y, 2, projectile.x, projectile.y, PROJECTILE_RADIUS * 1.6);
    glow.addColorStop(0, COLORS.tierGold);
    glow.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, PROJECTILE_RADIUS * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLORS.tierGold;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── 11. HUD + Overlay ────────────────────────────────────────────

function windLabel(wind) {
  const arrow = wind === 0 ? '·' : wind > 0 ? '→' : '←';
  return `Gió: ${arrow} ${Math.abs(wind).toFixed(1)}`;
}

function updateHud() {
  playerHpFill.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  // Only spell out "current/max" once a pet bonus actually raised maxHp
  // above the default 100 — keeps the common/no-bonus-yet case looking
  // exactly as it always has.
  playerHpValue.textContent = state.player.maxHp !== 100
    ? `${state.player.hp}/${state.player.maxHp}`
    : state.player.hp;
  aiHpFill.style.width = `${(state.ai.hp / state.ai.maxHp) * 100}%`;
  aiHpValue.textContent = state.ai.hp;
  windEl.textContent = windLabel(state.wind);

  if (playerPetBadgeEl && playerPetLineEl && state.pet) {
    playerPetBadgeEl.textContent = state.pet.emoji;
    const bonusBits = [];
    if (state.pet.hpBonus) bonusBits.push(`+${state.pet.hpBonus} HP`);
    if (state.pet.dmgBonusPct) bonusBits.push(`+${Math.round(state.pet.dmgBonusPct * 100)}% ST`);
    const bonusText = bonusBits.length ? ` (${bonusBits.join(', ')})` : '';
    playerPetLineEl.textContent = `Thú cưỡi: ${state.pet.emoji} ${state.pet.label} Lv.${state.pet.level}${bonusText}`;
  }

  if (playerNoiLucFill) playerNoiLucFill.style.width = `${state.player.noiLuc}%`;
  if (playerNoiLucValue) playerNoiLucValue.textContent = `⚡${state.player.noiLuc}`;
  if (aiNoiLucFill) aiNoiLucFill.style.width = `${state.ai.noiLuc}%`;
  if (aiNoiLucValue) aiNoiLucValue.textContent = `⚡${state.ai.noiLuc}`;

  if (roundEl) roundEl.textContent = `Lượt ${state.round}`;
  if (playerBadgeEl) playerBadgeEl.textContent = state.player.hits;
  if (aiBadgeEl) aiBadgeEl.textContent = state.ai.hits;
  if (windArrowEl) {
    // Arrow points right for +wind, left for -wind (rotate 180°), stays
    // upright and dim for ~0 wind. Magnitude subtly scales the arrow size.
    const mag = Math.abs(state.wind);
    windArrowEl.style.transform = state.wind < 0 ? 'rotate(180deg)' : 'rotate(0deg)';
    windArrowEl.style.opacity = mag < 0.3 ? '0.35' : String(Math.min(1, 0.5 + mag / 10));
  }

  if (state.over) {
    turnEl.textContent = '';
  } else if (state.turn === 'player') {
    turnEl.textContent = state.busy ? 'Đạn đang bay...' : 'Lượt của bạn';
  } else {
    turnEl.textContent = 'Đối thủ đang ngắm...';
  }
}

function setControlsEnabled(enabled) {
  angleInput.disabled = !enabled;
  powerInput.disabled = !enabled;
  if (enabled) {
    updateWeaponAffordability(); // also sets fireBtn/weaponBtns disabled state correctly
  } else {
    fireBtn.disabled = true;
    weaponBtns.forEach((btn) => { btn.disabled = true; });
  }
}

// Fills each weapon button's mini stat bars from the real WEAPON_TYPES
// numbers (normalized against the max across all 3 weapons), so the bars
// can never drift out of sync with the actual gameplay values. Called
// once at boot — the numbers are static for the whole session.
function renderWeaponStatBars() {
  const entries = Object.entries(WEAPON_TYPES);
  const maxDamage = Math.max(...entries.map(([, w]) => (w.directMin + w.directMax) / 2));
  const maxBlast = Math.max(...entries.map(([, w]) => w.splashRadius));
  entries.forEach(([key, w]) => {
    const btn = document.querySelector(`.artillery__weapon-btn[data-weapon="${key}"]`);
    if (!btn) return;
    const avgDamage = (w.directMin + w.directMax) / 2;
    const dmgFill = btn.querySelector('[data-stat="damage"]');
    const blastFill = btn.querySelector('[data-stat="blast"]');
    if (dmgFill) dmgFill.style.width = `${Math.round((avgDamage / maxDamage) * 100)}%`;
    if (blastFill) blastFill.style.width = `${Math.round((w.splashRadius / maxBlast) * 100)}%`;
    const costEl = btn.querySelector('[data-cost]');
    if (costEl) costEl.textContent = `⚡${w.cost}`;
  });
}

// Disables any weapon the player can no longer afford this turn, and if
// the currently-selected weapon just became unaffordable, auto-switches
// to the cheapest one still affordable so Fire never points at a dead
// selection. Also disables Fire entirely once nothing is affordable
// (the turn-passing logic in playerFire() normally catches this first,
// but this keeps the UI honest if called from anywhere else).
function updateWeaponAffordability() {
  weaponBtns.forEach((btn) => {
    btn.disabled = state.player.noiLuc < WEAPON_TYPES[btn.dataset.weapon].cost;
  });
  const current = WEAPON_TYPES[state.player.weapon];
  if (state.player.noiLuc < current.cost) {
    const affordable = Object.entries(WEAPON_TYPES)
      .filter(([, w]) => w.cost <= state.player.noiLuc)
      .sort((a, b) => a[1].cost - b[1].cost);
    if (affordable.length) selectPlayerWeapon(affordable[0][0]);
  }
  if (fireBtn) fireBtn.disabled = state.player.noiLuc < CHEAPEST_WEAPON_COST;
}

function selectPlayerWeapon(key) {
  state.player.weapon = key;
  weaponBtns.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.weapon === key)));
  if (playerStatEl) playerStatEl.textContent = `Đạn: ${WEAPON_TYPES[key].label}`;
}

function showOverlay(win) {
  overlayTitleEl.textContent = win ? '🏆 Chiến thắng!' : '💥 Thất bại!';
  overlayTextEl.textContent = win
    ? 'Bạn đã hạ gục đối thủ! Chơi lại để thử một chiến trường mới.'
    : 'Đối thủ đã hạ gục bạn. Chơi lại để thử lại nhé!';
  overlayEl.hidden = false;
}

function reportHit(hit) {
  if (hit.type === 'direct') {
    const who = hit.target === 'player' ? 'bạn' : 'đối thủ';
    showToast(`💥 Trúng đích trực tiếp vào ${who}! -${hit.damage} HP`);
  } else if (hit.type === 'splash' && hit.hits.length) {
    showToast(`💢 Nổ gần mục tiêu! ${hit.hits.map((h) => `-${h.damage} HP`).join(', ')}`);
  } else {
    showToast('💨 Trượt mục tiêu!');
  }
}

function checkGameOver() {
  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.over = true;
    state.busy = true;
    setControlsEnabled(false);
    updateHud();
    showOverlay(false);
    return true;
  }
  if (state.ai.hp <= 0) {
    state.ai.hp = 0;
    state.over = true;
    state.busy = true;
    setControlsEnabled(false);
    updateHud();
    showOverlay(true);
    return true;
  }
  return false;
}

// ── 12. Turn Flow ────────────────────────────────────────────────

// A turn is no longer exactly one shot — a side keeps firing as long as
// it has enough Nội Lực left to afford at least the cheapest weapon.
// Nội Lực resets to full only at the start of that side's own next turn
// (see the end of playerFire()/aiTurn()), so there's no reason to hold
// back mid-turn — it's spend-it-or-lose-it each turn, by design.

async function playerFire() {
  if (state.over || state.busy || state.turn !== 'player') return;
  const weapon = WEAPON_TYPES[state.player.weapon];
  if (state.player.noiLuc < weapon.cost) return; // buttons are already disabled for this, but guard anyway

  const angle = Number(angleInput.value);
  const power = Number(powerInput.value);

  state.busy = true;
  setControlsEnabled(false);
  updateHud();

  const hit = await simulateShot('player', angle, power);
  state.player.noiLuc -= weapon.cost;
  reportHit(hit);
  updateHud();
  draw();

  if (checkGameOver()) return;

  if (state.player.noiLuc >= CHEAPEST_WEAPON_COST) {
    // Enough Nội Lực left for at least one more shot this turn.
    state.busy = false;
    setControlsEnabled(true);
    updateHud();
    showToast(`⚡ Còn ${state.player.noiLuc} nội lực — bắn tiếp!`);
  } else {
    state.turn = 'ai';
    state.ai.noiLuc = NOI_LUC_MAX;
    updateHud();
    setTimeout(() => { aiTurn(); }, 650);
  }
}

const WEAPON_KEYS = Object.keys(WEAPON_TYPES);

async function aiTurn() {
  // Keeps firing (random *affordable* ammo type each shot) until it can't
  // afford any weapon anymore, mirroring the player's own turn loop.
  while (!state.over && state.ai.noiLuc >= CHEAPEST_WEAPON_COST) {
    const affordable = WEAPON_KEYS.filter((k) => WEAPON_TYPES[k].cost <= state.ai.noiLuc);
    state.ai.weapon = affordable[randInt(0, affordable.length - 1)];
    if (aiStatEl) aiStatEl.textContent = `Đạn: ${WEAPON_TYPES[state.ai.weapon].label}`;

    const aim = computeAiAim();
    const hit = await simulateShot('ai', aim.angle, aim.power);
    state.ai.noiLuc -= WEAPON_TYPES[state.ai.weapon].cost;
    reportHit(hit);
    updateHud();
    draw();

    if (checkGameOver()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  state.round += 1;
  state.wind = randomWind();
  state.turn = 'player';
  state.player.noiLuc = NOI_LUC_MAX;
  state.busy = false;
  setControlsEnabled(true);
  updateHud();
  draw();
}

function randomWind() {
  return Math.round((Math.random() * 10 - 5) * 10) / 10;
}

// Lightweight idle redraw (not a 60fps rAF loop — see the comment on
// `idleT` above) purely so the water shimmer has real motion even while
// nothing is being fired. Explicitly skipped while `state.busy` so it can
// never fight simulateShot()'s own per-substep draw() calls during flight.
function startIdleAnimation() {
  if (idleAnimHandle) return;
  idleAnimHandle = setInterval(() => {
    idleT += 0.12;
    if (!state.busy) draw();
  }, 130);
}

// ── 13. New Game / Restart ───────────────────────────────────────

function newGame() {
  state.terrain = generateTerrain(LOGICAL_W, LOGICAL_H);
  generateBackdrop();
  // Re-derived from real Wood/health data on every new game/restart (not
  // just once at boot) so finishing a health quest in another tab and
  // coming back to restart immediately reflects the new stage — same
  // "never stale, always re-read live" spirit as game-wulin.js's equipped
  // weapon, just resolved once per game instead of once per render since
  // mid-battle maxHp changes would be confusing, not useful.
  state.pet = computeArtilleryPetStage();
  const playerMaxHp = 100 + state.pet.hpBonus;
  state.player = { x: Math.round(LOGICAL_W * (0.10 + Math.random() * 0.04)), hp: playerMaxHp, maxHp: playerMaxHp, aimAngle: 45, weapon: 'normal', hits: 0, noiLuc: NOI_LUC_MAX };
  state.ai = { x: Math.round(LOGICAL_W * (0.86 + Math.random() * 0.04)), hp: 100, maxHp: 100, aimAngle: 135, weapon: 'normal', hits: 0, noiLuc: NOI_LUC_MAX };
  state.round = 1;
  state.turn = 'player';
  state.wind = randomWind();
  state.busy = false;
  state.over = false;

  angleInput.value = 45;
  powerInput.value = 50;
  angleValueEl.textContent = '45°';
  powerValueEl.textContent = '50%';
  selectPlayerWeapon('normal');
  if (aiStatEl) aiStatEl.textContent = 'Đạn: Thường';
  updatePowerGaugeColor();

  setControlsEnabled(true);
  overlayEl.hidden = true;
  updateHud();
  draw();
}

// ── 14. Boot ──────────────────────────────────────────────────────

function initArtilleryGame() {
  canvas = document.getElementById('artillery-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = LOGICAL_W * dpr;
  canvas.height = LOGICAL_H * dpr;
  ctx.scale(dpr, dpr);

  angleInput = document.getElementById('artillery-angle');
  powerInput = document.getElementById('artillery-power');
  angleValueEl = document.getElementById('artillery-angle-value');
  powerValueEl = document.getElementById('artillery-power-value');
  fireBtn = document.getElementById('artillery-fire-btn');

  playerHpFill = document.getElementById('artillery-player-hp-fill');
  playerHpValue = document.getElementById('artillery-player-hp-value');
  aiHpFill = document.getElementById('artillery-ai-hp-fill');
  aiHpValue = document.getElementById('artillery-ai-hp-value');
  turnEl = document.getElementById('artillery-turn-indicator');
  windEl = document.getElementById('artillery-wind');

  overlayEl = document.getElementById('artillery-overlay');
  overlayTitleEl = document.getElementById('artillery-overlay-title');
  overlayTextEl = document.getElementById('artillery-overlay-text');
  restartBtn = document.getElementById('artillery-restart-btn');

  roundEl = document.getElementById('artillery-round');
  windArrowEl = document.getElementById('artillery-wind-arrow');
  playerBadgeEl = document.getElementById('artillery-player-badge');
  aiBadgeEl = document.getElementById('artillery-ai-badge');
  playerStatEl = document.getElementById('artillery-player-stat');
  aiStatEl = document.getElementById('artillery-ai-stat');
  playerPetBadgeEl = document.getElementById('artillery-player-pet-badge');
  playerPetLineEl = document.getElementById('artillery-player-pet-line');
  playerNoiLucFill = document.getElementById('artillery-player-noiluc-fill');
  playerNoiLucValue = document.getElementById('artillery-player-noiluc-value');
  aiNoiLucFill = document.getElementById('artillery-ai-noiluc-fill');
  aiNoiLucValue = document.getElementById('artillery-ai-noiluc-value');
  weaponBtns = Array.from(document.querySelectorAll('.artillery__weapon-btn'));
  renderWeaponStatBars();

  loadPaletteColors();

  weaponBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.busy || state.over) return;
      selectPlayerWeapon(btn.dataset.weapon);
    });
  });

  angleInput?.addEventListener('input', () => {
    angleValueEl.textContent = `${angleInput.value}°`;
    state.player.aimAngle = Number(angleInput.value);
    if (!state.busy) draw();
  });
  powerInput?.addEventListener('input', () => {
    powerValueEl.textContent = `${powerInput.value}%`;
    updatePowerGaugeColor();
  });
  fireBtn?.addEventListener('click', playerFire);
  restartBtn?.addEventListener('click', newGame);

  newGame();
  startIdleAnimation();

  // Test-only hook: not referenced by any production UI. Lets an automated
  // smoke test read state and compute a real firing solution (same math the
  // AI uses) without having to reverse-engineer the randomized terrain/
  // position seed from outside the module.
  window.__artilleryDebug = {
    getState: () => JSON.parse(JSON.stringify({
      player: state.player, ai: state.ai, wind: state.wind,
      turn: state.turn, over: state.over, busy: state.busy,
    })),
    aimAtAi: () => computeAimForTarget(state.player.x, state.ai.x),
    setWind: (w) => { state.wind = w; updateHud(); },
    forceWin: () => { state.ai.hp = 0; checkGameOver(); },
    forceLose: () => { state.player.hp = 0; checkGameOver(); },
  };
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initArtilleryGame);
});
