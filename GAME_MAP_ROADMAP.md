# Ngũ Hành Giang Hồ — World Map Roadmap

> Owner-set focus (2026-08-31 onward): all daily-dev cycles concentrate
> exclusively on this map system for game-wulin.html until it reaches a
> playable vertical slice. Work on game-arena/game-artillery/game-bomb is
> paused except for critical bug/data-integrity fixes.
>
> This file is the authoritative day-to-day progress tracker for this
> initiative (`.claude/memory.md` is off-limits for automated runs — see
> CLAUDE.md/workflow.md — so this repo-root file replaces it for this
> specific effort). Update the checklist below at the end of every session
> that touches the map, and append a dated log entry summarizing exactly
> what was built/decided, referencing real file/function names.

## Vision

Reference: Võ Lâm Truyền Kỳ 2's world structure — a menu-level world map,
regional overworld maps you walk across, and local town/field maps with
enterable buildings/dungeons. Adapted to this app's Five Elements theme:

- **World map** (menu, not walkable): 5 Châu, one per element —
  Kim (Metal), Mộc (Wood), Thuỷ (Water), Hoả (Fire), Thổ (Earth).
- **Châu map** (walkable overworld, canvas + tile grid): connects that
  châu's 3 Huyện via walkable terrain/roads. Entering a Huyện marker
  transitions to that Huyện's local map.
- **Huyện map** (walkable local map): contains 5 distinct, physically
  enterable khu vực (zones):
  1. Khu đánh quái (wild monster field) — walking in triggers combat
     (reuse game-wulin's existing monster-select/combat system).
  2. Hang động (cave/dungeon) — a tougher, themed instance.
  3. Tháp (tower) — floor-climbing scaling challenge, tracks highest
     floor reached.
  4. Khu dân cư / mua sắm (town/shop) — NPC(s), a shop UI (define/reuse
     a spendable currency — check what already exists, e.g. skill hours,
     before inventing a new one).
  5. Khu luyện công (training grounds) — an active/idle training
     interaction feeding back into the player's stats.

Player stats everywhere in this world still derive from the player's
real Five Elements data via `js/elementStats.js` (already built) —
never invent a parallel stat system.

## Technical approach (mandatory constraints)

- Vanilla HTML/CSS/JS only, canvas-based rendering, no build tools/
  frameworks/libraries — same constraint as the rest of this repo.
- Reuse `js/canvasUtils.js` (readCssVar/roundRectPath) for any canvas
  color/shape work rather than re-deriving it a third time.
- Mobile-first controls: Pi Browser is primarily a phone browser. Touch
  input (virtual joystick or tap-to-move) is not optional polish — it's
  core, build it in Phase A2, don't ship desktop-only keyboard controls
  as if that were sufficient.
- Tile-grid based movement + collision (simpler and more tractable in
  vanilla JS than pixel-perfect free-form physics) — a 2D grid of
  walkable/blocked cells, player position snapped to it, camera is a
  viewport window into a larger map that follows the player.
- Test with a real scratch Playwright/Node script against the actual
  files before committing, same convention every prior daily-dev session
  has used successfully — verify movement, collision, and transitions
  actually work, don't assume.

## Phase checklist (update after every session)

- [x] **A1 — Core render/camera/movement.** Tile-grid renderer, camera
      viewport following the player sprite, keyboard (arrow/WASD)
      movement, on one small placeholder test map (doesn't need real
      content yet — just prove the engine works). Done 2026-08-31 —
      see log entry below.
- [x] **A2 — Mobile touch controls.** Virtual joystick, tested at a real
      mobile viewport width (390px class). Done 2026-08-31 — see log
      entry below.
- [ ] **A3 — Collision / walkability layer.** A per-tile
      walkable/blocked flag; player cannot walk through blocked tiles
      (buildings, water, map edges).
- [ ] **A4 — Interaction/transition triggers.** Proximity- or
      overlap-based zones that transition to another screen/state when
      the player walks into them (test with one dummy trigger first).
- [ ] **B — World navigation shell.** 5-Châu menu screen (reuses
      existing element color tokens/theming). Selecting a Châu loads its
      walkable overworld map with 3 Huyện markers connected by
      roads/paths. Walking into (or selecting) a Huyện marker loads that
      Huyện's own local map.
- [ ] **C — First full Huyện vertical slice.** Pick Kim Châu's first
      Huyện. Build its local walkable map with all 5 khu vực physically
      present and enterable, each wired to real (even if simple at
      first) functionality — not placeholder labels.
- [ ] **D — Replicate to remaining Huyện/Châu.** Once the Huyện template
      is proven, build out the other 2 Huyện of Kim Châu, then the
      remaining 4 Châu (3 Huyện each) — 14 more Huyện maps total.

## Naming (starting suggestions — refine freely as you build, keep it
consistent with this repo's existing Vietnamese wuxia flavor)

- Kim Châu: "Kim Xà Đại Lục" — Huyện: Bạc Kim Trấn, Hoàng Kim Cốc,
  Thiết Huyết Thành
- Mộc Châu: "Thanh Mộc Đại Lục" — Huyện: Lục Trúc Trang, Bách Thảo Cốc,
  Sơn Lâm Trấn
- Thuỷ Châu: "Huyền Thuỷ Đại Lục" — Huyện: Vân Thuỷ Trấn, Đông Hải Cảng,
  Bích Ba Cốc
- Hoả Châu: "Xích Hoả Đại Lục" — Huyện: Viêm Dương Thành, Hồng Liên Tự,
  Cuồng Phong Trại
- Thổ Châu: "Hoàng Thổ Đại Lục" — Huyện: Bàn Sơn Thành, Tuyệt Bích Trấn,
  Vạn Lý Bình Nguyên

## Log

### 2026-08-31 (session 2) — Phase A2 done: virtual joystick touch controls

- **New `.map-joystick`/`.map-joystick__thumb` overlay** in `game-map.html`,
  positioned absolutely inside a new `.map-canvas-inner` wrapper (added
  specifically so the joystick anchors to the canvas's own corner, not the
  whole `.map-canvas-wrap` — the wrap also contains the HUD row and the
  keyboard-hint text below the canvas, and an earlier version of this
  overlapped both; screenshot-verified fixed after the `.map-canvas-inner`
  split). Base circle + draggable thumb, styled with existing tokens only
  (`--bg-page`/`--bg-card-hover`/`--border`/`--text-secondary`), no new
  colors.
- **Input model** (`js/game-map.js`): refactored the Phase A1 keyboard
  handlers into two shared helpers, `activateDirection()`/
  `deactivateDirection()`, that both keyboard and joystick now call —
  neither input source keeps its own parallel state, both just add/remove
  a direction from the same `mapState.pressed` set and let the existing
  `tryStartMove()` (edge-triggered on activation) / `processHeldMovement()`
  (per-frame poll, continuous repeat while held) pipeline from Phase A1
  handle the rest unchanged. `initJoystickInput()` wires Pointer Events
  (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`/`pointerleave`)
  on the joystick base — deliberately Pointer Events rather than Touch
  Events, so touch AND mouse share one code path (makes it testable with a
  plain mouse drag, not just real touch).
- **Direction detection**: drag offset from the base's center, dead zone
  14px (below that: no direction, thumb still recenters visually but
  movement doesn't fire — prevents jitter from a barely-moving finger),
  above that: snaps to whichever axis (dx vs dy) has the larger absolute
  offset — 4-way only, matching the tile-grid's no-diagonals movement
  model, thumb visually clamped to a 30px max radius from center.
- **Real bug found + fixed during testing**: `Element.setPointerCapture()`
  threw synchronously in one code path during test iteration (Playwright's
  raw `dispatchEvent()` doesn't create a genuine browser-tracked active
  pointer, so the capture call had nothing to attach to). Rather than
  concluding this was purely a test artifact, wrapped the call in
  try/catch (`console.warn` on failure, movement still works without
  capture — capture is a nice-to-have for not losing the drag if the
  finger slides off the base, not a correctness requirement) since this
  is exactly the kind of platform-quirk risk this app's iOS/Pi-Browser
  WebKit target could plausibly hit for real. Switched the test itself to
  drive drags via `page.mouse.move/down/up` (genuine trusted pointer
  events) instead of `dispatchEvent`, which resolved the artifact and
  still exercises the real code path.
- **Test-authoring lesson (not a code bug)**: an early version of the
  scratch test waited 200-250ms *while still holding* the simulated drag
  before checking tile position and expected exactly one step — but
  200-250ms exceeds `MOVE_DURATION_MS` (140ms, from Phase A1), so the
  per-frame hold-repeat (correctly) fires a second step in that window,
  same as holding a keyboard key does. Fixed by releasing immediately
  after the drag for true single-flick assertions, and only holding
  deliberately (with a wider before/after window) for the continuous-
  movement assertion. Worth remembering next session: any future test of
  a discrete "one tap" input must release before ~140ms elapses, or it's
  indistinguishable from a hold.
- **Tested via a scratch Playwright script** (same convention as Phase
  A1): at a 390×844 mobile viewport with `hasTouch`/`isMobile` context
  options — joystick renders inside the canvas bounds with no horizontal
  overflow; a single drag-and-release moves exactly one tile in the
  dragged direction (down and left both verified); holding the drag for
  ~700ms produces multiple tiles of continuous movement; releasing stops
  movement immediately and the thumb recenters; a sub-dead-zone drag
  produces zero movement; a diagonal drag snaps to the dominant axis only
  (no diagonal moves); at a 1024px desktop viewport, keyboard
  arrow/WASD movement still works unchanged (both hold-repeat and a
  quick single tap) — confirms the shared-helper refactor didn't regress
  Phase A1. Zero `pageerror`/app-level `console.error` across all runs
  (only the same pre-existing sandbox network-block noise for the Pi
  SDK/fonts as every prior session). Also screenshot-checked the joystick
  layout at 1024px/768px/480px per `workflow.md`'s responsiveness step —
  no overlap with the HUD/hint text at any width after the
  `.map-canvas-inner` fix.
- **Not done / deliberately deferred**: no blocked tiles (A3), no
  interaction triggers (A4), no real Châu/Huyện content (B/C/D) — same
  "one phase at a time" discipline as every prior session.
- **Next session**: start Phase A3 (collision/walkability layer) —
  add a blocked tile type to `TILE_TYPES` (already shaped for this since
  Phase A1, per that log entry) and make `isWalkable()` respect it so the
  player can't walk through it; test by placing at least one blocked tile
  in the test map and confirming movement into it is rejected from all 4
  directions, with both keyboard and the new joystick.
- **Backup tag push**: same 403 as the last two sessions (see the A1 log
  entry directly below and `.claude/memory.md` 2026-08-24) — did not
  re-attempt investigating it again this session per the prior note that
  it's a standing gap; used the pre-merge `main` SHA as the rollback
  point again, same as last time.

### 2026-08-31 — Phase A1 done: core render/camera/movement engine

- **New standalone engine test page**, `game-map.html` + `js/game-map.js`
  + `css/game-map.css` — deliberately **not linked from `index.html` or
  `game-wulin.html`'s nav** yet (same "standalone feasibility demo, not
  wired into the main app" pattern `weapon-prototype.html` used before
  Phase B wires the real world-nav shell in); reachable only by URL, has
  `<meta name="robots" content="noindex">` and a `journal-back` link
  back to `game-wulin.html`.
- **Placeholder test map**: `buildTestMap()` in `js/game-map.js` — a
  20×15 tile grid (`MAP_COLS`/`MAP_ROWS`), 32px tiles (`TILE_SIZE`), a
  criss-cross grass/path pattern purely so camera scroll + tile
  boundaries are visually obvious. `TILE_TYPES` is keyed by tile-type
  id and already carries a `walkable` boolean per type (currently both
  types are `true`) — Phase A3 adds a blocked type here, no rewrite
  needed.
- **Movement model**: player position is always snapped to an integer
  grid cell (`player.tx`/`ty`, per the roadmap's "tile-grid based
  movement" constraint), but the rendered pixel position
  (`player.px`/`py`) eases smoothly between cells over 140ms
  (`MOVE_DURATION_MS`, `updateMovement()`) so it doesn't read as a
  jump-cut. Only map-bounds are checked before a move starts
  (`isWalkable()`) — no blocked-tile logic yet, that's Phase A3.
  Arrow keys and WASD both map to the same 4 directions
  (`KEY_TO_DIRECTION`).
- **Camera**: `updateCamera()` centers the viewport on the player's
  pixel position and clamps to the map's pixel bounds; when the map is
  smaller than the viewport in either axis it centers the map instead
  of clamping to a degenerate (min > max) range. Verified working in
  both directions via the corner-walking Playwright test below.
- **Real bug found + fixed during testing**: movement was originally
  only started from the game loop's per-frame poll of currently-held
  keys (`processHeldMovement()`). A `Playwright` `keyboard.press()` (and,
  it turns out, any sufficiently fast real tap) sends keydown+keyup
  faster than one animation frame, so `keyup` cleared the pressed-key
  set before the loop ever saw it — a quick single tap registered zero
  movement. Fixed by triggering `tryStartMove()` directly from the
  `keydown` handler on a new press (edge-triggered), while still using
  the per-frame poll only for repeat-while-held. This is a real
  precision-control bug that would have shipped invisibly (holding a
  key always worked, only quick taps were broken) — worth remembering
  for Phase A2's touch input, which will have the same tap-vs-hold
  distinction.
- **Tested via a scratch Playwright script** (same one-off
  `npm install playwright` in the OS scratch dir pointed at the
  pre-installed `/opt/pw-browsers/chromium-1194` binary + `file://`
  path, per this project's established convention): confirmed initial
  HUD position, single ArrowRight/ArrowDown/A(left) taps each move
  exactly one tile (this is what caught the bug above), holding
  ArrowDown for ~700ms produces ~5 tiles of continuous movement,
  walking into each of the 4 map edges repeatedly clamps exactly at
  `(0,0)` and `(19,14)` with no overshoot/crash, zero
  `pageerror`/app-level `console.error` (only the pre-existing sandbox
  network-block errors for the Pi SDK/fonts, same as every other page),
  no horizontal overflow at a 375px mobile viewport. Screenshots
  confirm the tile grid, player sprite, and HUD render correctly at
  both a top-left and bottom-right map corner.
- **Not done / deliberately deferred**: no touch/joystick input (A2),
  no blocked tiles (A3), no interaction triggers (A4), no real
  Châu/Huyện content (B/C/D) — all per the "one phase at a time"
  instruction. `js/elementStats.js` is not wired in yet either; real
  player stats only matter once actual gameplay content exists
  (Phase C), so this pure-engine page doesn't read them.
- **Next session**: start Phase A2 (mobile touch controls — virtual
  joystick or tap-to-move, tested at a 390px-class viewport), building
  on this same `game-map.html`/`js/game-map.js`. Keep the tap-vs-hold
  lesson from the bug above in mind for the touch input design.
- **Backup tag push still blocked** with the same 403 documented in
  `.claude/memory.md` (2026-08-24) — branch/contents pushes work fine,
  tag-ref pushes don't, even after 3 retries with backoff. Used the
  pre-merge `main` SHA as the rollback point instead:
  `721ec5ec9c4572d88136358357cb687c79f3793b`. This is now a standing
  gap across at least two sessions a week apart — if it's still broken
  next time, it's worth flagging to the owner as likely needing a
  broader GitHub App permission grant rather than re-investigating from
  scratch each session.

### 2026-08-31 — Roadmap created
Owner set the standing direction: concentrate all daily-dev effort on
game-wulin's world map (VLTK2-style, real free-roam movement, not a
card/menu-based area picker) instead of spreading across all 4 games.
This file created as the cross-session progress tracker since
`.claude/memory.md` can't be edited by automated runs. No engine code
written yet — next session should start Phase A1.
