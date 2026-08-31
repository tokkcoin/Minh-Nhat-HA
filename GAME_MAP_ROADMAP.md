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
  enterable khu vực — see "Khu vực mechanics" below for what each one
  actually does, not just what it's called.

Player **combat/character** stats everywhere in this world still derive
from the player's real Five Elements data via `js/elementStats.js`
(already built) — never invent a parallel stat system. The in-world
**economy** (currency, shop items, cosmetics) is a separate, secondary
system layered on top — see "Economy & progression" below for exactly
where the line is.

## Economy & progression (new — fills the gap the first draft left vague)

Two earnable currencies, both from playing the map, neither from real
Five Elements data:

- **Linh Thạch** (Spirit Stones) — the common currency. Earned from
  Khu đánh quái (small amounts) and Hang động (larger amounts, per
  clear). Spent in Khu dân cư on consumables and cosmetics.
- **Điểm Danh Vọng** (Prestige Points) — the rare currency. Earned only
  from Tháp, scaled by floor reached (e.g. floor 10 pays more per floor
  than floor 1). Spent in Khu dân cư on exclusive cosmetic titles/skins
  not purchasable with Linh Thạch.

**Hard rule (do not violate this while building any khu vực):**
everything either currency buys is cosmetic, a consumable, or a
short-duration buff (minutes, not permanent) — never a permanent stat
increase, never a shortcut around real Five Elements progress. The
app's entire hook is "real habits → real power"; a shop that sells
permanent power would let players buy their way around that and quietly
gut the reason the feature exists. Consumables/buffs are fine (e.g. a
potion that gives +5% crit for the next 3 fights) because they're
temporary and still gated behind playing the map, not behind spending
real money or skipping real habits.

**Difficulty tiers per Huyện**, reusing the game's existing 5-tier
rarity language (`bronze → silver → gold → epic → legendary`, same
tiers `js/elementStats.js`/`weapon-prototype.js` already use) so a
player recognizes the scale immediately:

| Huyện position in its Châu | Recommended tier | Monster/tower scaling |
|---|---|---|
| 1st Huyện | bronze/silver | Beatable with baseline (no-real-data) stats |
| 2nd Huyện | silver/gold | Expects some real Five Elements progress |
| 3rd Huyện | gold/epic/legendary | Expects meaningful real progress across multiple elements |

This gives a legible reason to explore further Huyện as the player's
real habits grow, rather than all 15 Huyện being flat difficulty.

## Khu vực mechanics (what each of the 5 zones actually does)

The first draft of this roadmap only named these. Concrete specs below
— build to these, adjusting only where the real code makes something
clearly better, and note the deviation in your commit message + log.

1. **Khu đánh quái (wild field)** — 3-6 visible monster nodes placed on
   the local map (not random-encounter-on-every-tile — a VLTK-style
   visible mob you walk up to and engage). Walking into one opens the
   existing game-wulin combat screen. Reward: small Linh Thạch, small
   chance of a temporary buff item. Respawns after a short delay so the
   zone isn't a one-time-use.
2. **Hang động (cave/dungeon)** — one instanced sub-map (can be a
   smaller, separately-loaded tile grid, not a literal door into the
   same overworld) ending in a single named mini-boss fight (a stronger
   version of an existing monster, or a new one themed to that Châu's
   element). Once-per-real-day clear limit (track last-clear timestamp
   in localStorage, same pattern `js/dailyTasks.js` already uses
   elsewhere in this app) so it's a daily-return hook, not farmable.
   Reward: larger Linh Thạch, chance at a cosmetic weapon skin.
3. **Tháp (tower)** — sequential floors, each one harder than the last
   (simple scaling formula on monster HP/attack is fine to start).
   Player climbs until they lose; their best floor is saved
   (`localStorage`, per-Huyện or global — decide and document which
   when you build this). Reward scales with floor reached, paid in
   Điểm Danh Vọng. No multiplayer leaderboard yet (no backend for
   that) — a personal best is enough for this phase.
4. **Khu dân cư / mua sắm (town)** — the one khu vực that's a UI screen
   more than a combat encounter. At minimum two NPCs: a shopkeeper
   (spends Linh Thạch on consumables/cosmetics) and a "Cải Trang Sư"
   (spends Điểm Danh Vọng on exclusive cosmetics). This is also the
   natural home for a simple daily-quest NPC later (not required for
   the first build) that nudges the player toward the app's real habit
   pages. Reuse the existing `.finance-modal` chrome convention for any
   shop dialog, same as weapon-prototype.js's picker does.
5. **Khu luyện công (training grounds)** — a short interactive
   mini-challenge (a tap-timing or hold-and-release game is enough,
   doesn't need to be elaborate) that on success grants a *short*
   temporary combat buff (minutes-scale, e.g. +5% crit for 10 minutes)
   — a pre-fight ritual, not a stat system. This is the one khu vực
   most likely to tempt scope creep into "just another mini-game" —
   keep it under a few minutes of build time; it's a flavor beat, not
   a fifth full game.

## Visual direction (new — needed once real content starts, not just
the engine)

No external art assets (consistent with this repo's existing
no-dependency stance) — everything is drawn via canvas primitives
through `js/canvasUtils.js`, same convention game-arena.js/
game-artillery.js already established:

- **Tiles**: flat-colored rectangles + a simple 1-2px border, no
  texture/sprites. Color per tile type pulled from CSS tokens via
  `readCssVar()` — grass/path neutral tones for shared terrain, and
  each Châu's own element color (`--kim`/`--moc`/`--thuy`/`--hoa`/
  `--tho`, already defined in `css/style.css`) tinting that Châu's
  distinctive terrain (e.g. Hoả Châu's ground reads warmer/redder than
  Thuỷ Châu's).
- **Player sprite**: a simple filled shape (circle or diamond) with a
  small directional indicator (e.g. a notch/triangle pointing the
  facing direction) — not a pixel-art character. Matches this
  project's existing minimalist canvas style, keeps scope realistic.
- **Buildings/zone markers**: simple geometric shapes (rect body +
  triangle roof reads as "building" instantly) using `roundRectPath()`
  from canvasUtils, color-coded per khu vực type so a player can tell
  Hang động from Tháp from across the map at a glance.

## Technical approach (mandatory constraints)

- Vanilla HTML/CSS/JS only, canvas-based rendering, no build tools/
  frameworks/libraries — same constraint as the rest of this repo.
- Reuse `js/canvasUtils.js` (readCssVar/roundRectPath) for any canvas
  color/shape work rather than re-deriving it a third time.
- Mobile-first controls: Pi Browser is primarily a phone browser —
  confirmed working as of Phase A2 (virtual joystick).
- Tile-grid based movement + collision (simpler and more tractable in
  vanilla JS than pixel-perfect free-form physics) — a 2D grid of
  walkable/blocked cells, player position snapped to it, camera is a
  viewport window into a larger map that follows the player.
- Test with a real scratch Playwright/Node script against the actual
  files before committing, same convention every prior daily-dev session
  has used successfully — verify movement, collision, and transitions
  actually work, don't assume.

## Phase checklist (update after every session)

- [x] **A1 — Core render/camera/movement.** Done 2026-08-31 — see log.
- [x] **A2 — Mobile touch controls.** Virtual joystick. Done
      2026-08-31 — see log.
- [ ] **A3 — Collision / walkability layer.** A per-tile
      walkable/blocked flag; player cannot walk through blocked tiles
      (buildings, water, map edges).
- [ ] **A4 — Interaction/transition triggers.** Player enters a marked
      zone → a confirm prompt appears ("Nhấn để vào Hang Động", not an
      instant auto-transition, to avoid accidental triggers from just
      walking past) → confirming transitions to the target
      screen/state. Test with one dummy trigger first.
- [ ] **B — World navigation shell.** 5-Châu menu screen (reuses
      existing element color tokens/theming). Selecting a Châu loads its
      walkable overworld map with 3 Huyện markers connected by
      roads/paths. Walking into (or selecting) a Huyện marker loads that
      Huyện's own local map. Travel *between* Châu is menu-based (no
      walking a "world" scale map) — only Huyện-to-Huyện within one
      Châu is real walking.
- [ ] **C1 — Bạc Kim Trấn: Khu đánh quái.** First real Huyện map
      (Kim Châu's first Huyện, bronze/silver tier per the difficulty
      table above), populated with 3-6 monster nodes per the mechanics
      spec above, wired to real combat.
- [ ] **C2 — Bạc Kim Trấn: Hang động.** Instanced sub-map + named
      mini-boss + once-per-day clear limit + Linh Thạch/cosmetic reward.
- [ ] **C3 — Bạc Kim Trấn: Tháp.** Floor-climb loop, best-floor
      persistence, Điểm Danh Vọng payout.
- [ ] **C4 — Bạc Kim Trấn: Khu dân cư.** Shopkeeper + Cải Trang Sư
      NPCs, shop UI, introduces the Linh Thạch/Điểm Danh Vọng currency
      system for real (this is the first khu vực that needs it —
      C1-C3 only *earn* currency, C4 is where it's *spent*).
- [ ] **C5 — Bạc Kim Trấn: Khu luyện công.** Short training
      mini-interaction + temporary buff.
- [ ] **D1 — Hoàng Kim Cốc** (Kim Châu's 2nd Huyện, silver/gold tier).
      Apply the proven C1-C5 template with this Huyện's own monster/
      NPC flavor.
- [ ] **D2 — Thiết Huyết Thành** (Kim Châu's 3rd Huyện, gold/epic/
      legendary tier). Completes Kim Châu.
- [ ] **D3-D5 — Mộc Châu's 3 Huyện** (Lục Trúc Trang, Bách Thảo Cốc,
      Sơn Lâm Trấn).
- [ ] **D6-D8 — Thuỷ Châu's 3 Huyện** (Vân Thuỷ Trấn, Đông Hải Cảng,
      Bích Ba Cốc).
- [ ] **D9-D11 — Hoả Châu's 3 Huyện** (Viêm Dương Thành, Hồng Liên Tự,
      Cuồng Phong Trại).
- [ ] **D12-D14 — Thổ Châu's 3 Huyện** (Bàn Sơn Thành, Tuyệt Bích Trấn,
      Vạn Lý Bình Nguyên). Completes the full 5-Châu, 15-Huyện world.

Each D-item should ship with genuinely different monster/NPC flavor for
its Châu's element (not a copy-pasted reskin in name only) — e.g. Hoả
Châu's monsters/theming should read as fire-flavored, not generically
identical to Kim Châu's with a different color variable. Use judgment
on how much per-Huyện variation is worth the build time; a reasonable
bar is "a player who's seen 2 Huyện can tell they're in a new one within
a few seconds," not full bespoke art for all 15.

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

### 2026-08-31 (session 3) — Roadmap expanded: economy, khu vực mechanics, C split into C1-C5, D ordered
Owner asked for more detail after reviewing the first draft. Added: a
concrete two-currency economy (Linh Thạch / Điểm Danh Vọng) with an
explicit hard rule that neither ever buys permanent stat power (only
cosmetics/consumables/short buffs) so the map layer can't undercut the
app's core "real habits → real power" hook; per-Huyện difficulty tiers
reusing the existing bronze→legendary language; a real mechanics spec
for all 5 khu vực types (previously just named, not specified); a
visual-direction section (canvas-primitive tiles/sprites, no external
art, per-Châu color tinting via existing CSS tokens); and split the
previously-monolithic Phase C into C1-C5 (one khu vực each, sized to
one daily-dev session) plus an explicit D1-D14 build order covering all
15 Huyện with a note against copy-paste reskinning.

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
