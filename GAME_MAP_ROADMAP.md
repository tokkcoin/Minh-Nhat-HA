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
- [x] **A3 — Collision / walkability layer.** A per-tile
      walkable/blocked flag; player cannot walk through blocked tiles
      (buildings, water, map edges). Done 2026-08-31 — see log.
- [x] **A4 — Interaction/transition triggers.** Player enters a marked
      zone → a confirm prompt appears ("Nhấn để vào Hang Động", not an
      instant auto-transition, to avoid accidental triggers from just
      walking past) → confirming transitions to the target
      screen/state. Test with one dummy trigger first. Done
      2026-08-31 — see log.
- [x] **B — World navigation shell.** Done 2026-08-31 — see log.
- [x] **C1 — Bạc Kim Trấn: Khu đánh quái.** Done 2026-08-31 — see log.
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

### 2026-08-31 (session 7) — Phase C1 done: Bạc Kim Trấn's Khu đánh quái, wired to real combat + real Linh Thạch

- **Verified ground truth before starting**: read all of Phase B's actual
  `js/game-map.js`/`game-map.html`/`css/game-map.css`/`js/game-wulin.js`
  (not just the log) — confirmed `enterHuyen(zone)` and
  `buildHuyenPlaceholderMap()` were exactly as documented, and that
  `game-wulin.html`'s combat is a full separate page (own DOM, own
  `WULIN_MONSTERS` roster, own `startCombat()`/`endCombat()`), not
  anything game-map.js could call in-process.
- **This is a static multi-page app, so "walk into a monster" is a real
  page navigation, not a same-runtime function call.** Designed the
  handoff as: `game-map.js`'s `engageMonsterNode(zone)` saves
  `{chauKey, huyenIndex}` to `localStorage` (`lifebalance_map_return_ctx`,
  since the URL round-trip only needs to carry the node id + result) and
  navigates to `game-wulin.html?mapMonster=<id>&mapNode=<nodeId>`;
  `game-wulin.js`'s `initWulinGame()` detects those params
  (`parseWulinMapContext()`), skips the monster-select screen, and
  jumps straight into `startCombat()`; the result overlay's "Chọn quái
  khác" button relabels to "↩ Quay lại bản đồ" and navigates back to
  `game-map.html?resumeNode=<id>&resumeResult=win|lose`;
  `tryResumeFromCombat()` there reads the saved context, reopens the
  exact Huyện (not just the Chau menu), applies a respawn cooldown only
  on a win, and strips the query string via `history.replaceState` so a
  refresh doesn't replay it. Retreating mid-fight round-trips the same
  way with no `resumeResult`, so the node stays up — confirmed this
  isn't a discarded edge case, it's real (see the "found a wrong test
  assumption" note below).
- **Data dedup, not scope creep**: `WULIN_MONSTERS` moved out of
  `js/game-wulin.js` into `data/wulinMonsters.js`
  (`window.WULIN_MONSTERS_DATA`), the project's existing script-loaded
  data-file convention (tech-defaults.md), so a map monster node can
  read the real icon/name/reward without loading game-wulin.js's whole
  combat-screen script (which assumes combat DOM elements exist that
  game-map.html doesn't have). `game-wulin.js` now just does
  `const WULIN_MONSTERS = window.WULIN_MONSTERS_DATA || [];` — same
  array, same values, zero behavior change to the standalone monster-
  select flow.
- **`buildBacKimTranMap(chau)`** (`js/game-map.js` §3): a 16x11 walled
  local map for Bạc Kim Trấn only — every other Huyện still routes
  through the Phase B placeholder via a new `buildHuyenMap(chauKey,
  huyenIndex)` dispatcher (the single place C2-D14 will extend). 4
  monster nodes (`BAC_KIM_TRAN_MOB_PLACEMENTS`, within the roadmap's
  3-6 range) using `game-wulin.html`'s real Dễ/Trung bình monsters
  (2x Hồ Ly Sương Sớm, 1x Quỷ Ảnh Cốc Sâu, 1x Xà Tinh Vạn Niên) to
  actually match this Huyện's Sơ cấp/Rèn luyện tier. Deliberately no
  interior wall clusters on this map (unlike the Châu overworld) — a
  fixed wall layout risked landing on a fixed monster tile and making
  that node permanently unreachable; simpler to skip it for this first
  real content map than add collision math to verify against.
- **Trigger zones now carry `kind`** (`'huyen'` | `'monster'`) so
  `confirmActiveTrigger()` can branch — Huyện markers still call
  `enterHuyen()`, monster nodes call the new `engageMonsterNode()`.
  Refactored `enterHuyen(zone)` into a thin wrapper over a new
  `openHuyen(chauKey, huyenIndex)` core, since `tryResumeFromCombat()`
  needs to reopen a specific Huyện from saved ids, not a live zone
  object.
- **Linh Thạch — the roadmap's common currency — is real now, not just
  named.** Added `getLinhThach()`/`addLinhThach()` to `js/common.js`
  (a single `localStorage` running total, deliberately NOT routed
  through `elementStats.js` — this is the map's own economy layer, per
  the roadmap's "Economy & progression" section, not real Five
  Elements data). `game-wulin.js`'s `endCombat('win')` credits it via
  `addLinhThach(monster.reward)` **only** when the fight was launched
  from a map node — reused the monster's existing `reward` number
  (already shown as flavor-only "Nội lực +N" for the standalone
  monster-select flow) as the "small amount" the roadmap calls for,
  instead of inventing a second reward table. The standalone flow is
  completely unchanged — still flavor-only, same as every prior
  session. `game-map.html` gained a small `💠 <n>` HUD readout next to
  the tile-position HUD.
- **Deliberately NOT built this session** (documented, not silently
  dropped): the "small chance of a temporary buff item" half of Khu
  đánh quái's reward spec — there's no consumable/buff-item system
  anywhere in the app yet, and building one now would be leapfrogging
  into C5's (Khu luyện công) territory before it's needed. Also not
  built: Bạc Kim Trấn's other 4 khu vực (hang động/tháp/khu dân
  cư/khu luyện công) — this Huyện's map only has monster nodes right
  now; C2-C5 add the rest one at a time, same one-khu-vực-per-session
  discipline as every prior phase split.
- **Two real bugs found via Playwright, not by inspection** — both
  because Phase B's own tests happened to exercise a Huyện screen that
  had zero trigger zones, so neither collision was reachable until a
  real one existed:
  1. `.map-huyen-banner` (the persistent "this Huyện's info" bar) and
     `.map-trigger-prompt` (the walk-into-a-node confirm bar) shared
     one absolute top-center spot in `.map-canvas-inner`. On a Huyện
     with real trigger zones both are visible at once, and the banner
     sat on top of — and silently ate clicks on — the confirm button.
     First fix attempt (move the banner to the bottom) traded that
     collision for a second one: at narrow/mobile widths the banner
     now overlapped the joystick, which lives in that same bottom-left
     corner. Real fix: took `.map-huyen-banner` out of the absolute-
     positioned overlay entirely — it's static per-Huyện info text, not
     a positioned gameplay element, so it never actually needed to be
     an overlay. It's a plain block in normal document flow above the
     canvas now (`game-map.html`/`css/game-map.css` v6). Screenshot-
     verified clean at 1024/768/480px and a 390×844 mobile/touch
     viewport after the fix.
  2. My own test script asserted retreating mid-fight should land back
     on the Châu menu — that assertion was simply wrong, not the app:
     `wulinState.mapNodeId` is set for the whole session once a fight
     starts from the map (so "Đấu tiếp" rematches still count as
     map-launched), so a retreat's `returnToMap(null)` still carries
     `resumeNode` (just no `resumeResult`), and
     `tryResumeFromCombat()` correctly reopens the exact same Huyện
     with no cooldown applied — better UX than dumping the player back
     at the menu mid-session. Fixed the test's expectation, not the
     code, once I re-read what the code was actually supposed to do.
- **Tested via two scratch Playwright scripts** (`node test-c1.js` /
  `test-c1b.js` in the OS scratch dir, same convention as every prior
  phase): full happy path — menu → Kim Châu → walk to Bạc Kim Trấn →
  confirm → correct banner/4 monster zones present → walk to a monster
  node → confirm prompt shows the right name → navigates to
  `game-wulin.html` with the right `mapMonster` → combat auto-starts
  (select screen skipped) → result-select button relabeled → forced a
  deterministic win (set `monster.hp = 1`, one attack) → reward text
  and `localStorage` both show the correct Linh Thạch credit (verified
  the exact number, 20 for Hồ Ly Sương Sớm, not just "some number") →
  "↩ Quay lại bản đồ" navigates to `game-map.html?resumeNode=...` →
  resumes directly into Bạc Kim Trấn (not the menu) → query string
  stripped → node correctly on cooldown in `localStorage` → currency
  HUD shows 20 → walking back onto the cooling-down node shows no
  prompt (regression-proof `findTriggerAt` cooldown gate, not just a
  render-only dim). Regression checks in the same run: a different
  Huyện (Hoàng Kim Cốc) still shows the generic 🚧 placeholder banner
  with zero monster zones (dispatcher routes correctly); border-wall
  collision on the new Bạc Kim Trấn map still rejects movement from the
  interior corner. Second script covers the retreat/no-cooldown path
  end to end (see bug #2 above) — confirmed zero Linh Thạch on retreat
  and the node still engageable afterward. Screenshot-reviewed
  1024/768/480px (no horizontal overflow at any width, verified via
  `scrollWidth`/`clientWidth`) plus a 390×844 mobile/touch run
  (joystick-drove the player around the new map, screenshot-confirmed
  no banner/joystick overlap after the CSS fix). Zero `pageerror` and
  zero unexpected `console.error` across every run (only the same
  pre-existing sandbox network-block noise for the Pi SDK every prior
  session has hit).
- **Not done / deliberately deferred**: C2-C5 (Bạc Kim Trấn's other 4
  khu vực), the buff-item chance on a đánh quái win (see above), and
  Điểm Danh Vọng (only Tháp/C3 earns it, per the roadmap). D1+ (the
  other 14 Huyện) untouched.
- **Next session**: start Phase C2 — Bạc Kim Trấn's Hang động (one
  instanced sub-map, a named mini-boss, once-per-real-day clear limit
  via a `localStorage` last-clear timestamp same pattern as
  `js/dailyTasks.js`, larger Linh Thạch + a chance at a cosmetic weapon
  skin reward per the roadmap's mechanics spec). Decide during that
  session whether the sub-map is a genuinely separate map object
  (loaded via the same `loadMap()`/screen-swap mechanism C1 already
  proved works for arbitrary map shapes) or something lighter — the
  roadmap explicitly says "can be a smaller, separately-loaded tile
  grid, not a literal door into the same overworld," so leaning toward
  reusing `loadMap()` with a 4th screen state unless that turns out
  awkward once actually building it.
- **Backup tag push**: attempted again this session — same `403`/
  `RPC failed`/`send-pack: unexpected disconnect` as every session
  since 2026-08-24, now a full week+ of consecutive failures on
  tag-ref pushes specifically (branch/content pushes are unaffected).
  Used the pre-merge `main` SHA as the rollback point instead, per the
  standing "confirmed gap, needs a broader GitHub App permission grant
  only the human owner can make" note from prior sessions.

### 2026-08-31 (session 6) — Phase B done: world navigation shell

- **Verified ground truth before starting**: read all of `js/game-map.js`/
  `game-map.html`/`css/game-map.css` as they stood after A4 (not just
  the log) — confirmed the "next session" note was right that the
  engine's global `MAP_COLS`/`MAP_ROWS`/`TILE_TYPES`/`TRIGGER_ZONES`
  constants needed generalizing before a second map (let alone 6) could
  exist. Refactored those into `mapState.cols`/`rows`/`tileTypes`/
  `triggerZones`, set per screen by one `loadMap(map, screenName)`
  function — `isWalkable()`, `updateCamera()`, `renderFrame()` all read
  the swappable state instead of fixed globals, no other engine logic
  changed.
- **Retired the Phase A placeholder test map + A4's dummy trigger/modal
  overlay** (`buildTestMap()`, `WALL_TILES`, the one dummy
  `TRIGGER_ZONES` entry, `#map-trigger-overlay`'s `.finance-modal`
  chrome) — they were explicitly scaffolding to prove the engine before
  real content existed, and Phase B's real Châu maps + Huyện transition
  now cover the same ground for real, so keeping the dummy versions
  around would just be dead code. Noted as a deliberate, in-scope
  supersession, not scope creep.
- **Three screens, one canvas** (`js/game-map.js` §9): `mapState.screen`
  is `'menu' | 'chau' | 'huyen'`. `'menu'` is a plain DOM grid
  (`#map-chau-menu`, no canvas) of 5 cards, one per Châu, built from a
  new `CHAU_LIST` data table (name/color token/3 Huyện names+tiers per
  Châu, from this file's own "Naming" and "Economy & progression"
  sections). Clicking a card calls `enterChau(key)`, which builds that
  Châu's walkable overworld and switches the canvas in. Difficulty-tier
  labels use design.md's existing Sơ cấp/Rèn luyện/Thành thạo/Tinh anh/
  Huyền thoại rarity vocabulary rather than re-translating this file's
  own bronze/silver/gold/epic/legendary shorthand, so the in-world
  language matches what players already see on skills.html/
  weapon-prototype.html — noting this as a deliberate wording deviation
  from the roadmap table, not a spec change.
- **`buildChauMap(chau)`**: a 26x18 grid per Châu, 3 Huyện markers laid
  out in a triangle and connected by L-shaped roads (`carveRoad()`),
  plus scattered element-tinted "feature" tiles (`scatterFeaturePatches()`,
  using that Châu's own `--<element>-tint` token) and two small wall
  clusters for collision variety — all deterministic (no `Math.random`)
  so a given Châu's map looks identical on every visit. Walking into
  (or being close enough to trigger) a Huyện marker reuses A4's
  walk-in-and-confirm prompt exactly, just re-pointed: confirming now
  calls `enterHuyen(zone)` instead of opening a modal.
- **`enterHuyen(zone)`**: switches the whole screen to a small (12x9),
  wall-bordered, currently-empty placeholder local map
  (`buildHuyenPlaceholderMap()`) — proves the chau-map -> huyen-map
  transition and that the generalized engine really does work on a
  second, differently-sized/shaped map, which was this session's main
  technical risk per the A4 log's "next session" note. A persistent
  info banner (`#map-huyen-banner`, a no-button variant of the same
  `.map-trigger-prompt` bar) names the Huyện + its tier and says its
  real khu vực content is Phase C's job. Deliberate deviation from a
  literal reading of "loads that Huyện's own local map": it's real and
  walkable, just empty — Phase C fills in the first real one (Bạc Kim
  Trấn) rather than this session hand-building placeholder rooms for
  all 15 Huyện.
- **Navigation is otherwise UI-button-driven, not walk-triggered**: one
  `#map-nav-back-btn` (reusing `.journal-back`'s existing pill style,
  not a new button system), relabeled/rehandled by `updateNavHeader()`
  depending on screen — "← Về danh sách Châu" (chau -> menu) or
  "← Quay lại <Châu name>" (huyen -> chau). Matches the roadmap's
  "travel between Châu is menu-based" instruction; only Huyện-marker
  entry is a walk-and-confirm interaction.
- **Real bug found + fixed (pre-existing since Phase A4, not introduced
  this session)**: `.map-trigger-prompt` sets `display: flex`, and an
  *author* CSS rule always wins over the browser's default
  `[hidden]{display:none}` UA rule regardless of selector specificity —
  so toggling the `hidden` attribute in JS was never actually hiding
  the confirm-prompt bar; it just sat there as an empty box until first
  shown. Went uncaught in every A1-A4 Playwright run because those
  tests only asserted the DOM `hidden` attribute, not real computed
  visibility. Same gotcha this project already knew about and worked
  around for `.finance-modal[hidden]{display:none}` — just hadn't been
  applied here yet. Fixed by adding the equivalent `[hidden]{display:
  none}` overrides for `.map-trigger-prompt`, `.map-chau-menu`, and
  `.map-play-area` (the last two are new this session and would have
  had the identical bug — caught before shipping because this
  session's screenshot review caught the menu and chau screens
  rendering stacked on top of each other, which is what led to
  re-auditing `.map-trigger-prompt` too). Test methodology fixed to
  match: added an `isVisible()` helper that reads
  `getComputedStyle(el).display` instead of the `hidden` attribute, and
  replaced every hidden/visible assertion in this session's test with
  it.
- **Tested via a scratch Playwright script** (`node test-b.js` in the
  OS scratch dir, same convention as every prior phase): desktop
  1024px keyboard run — menu shows exactly 5 cards with correct
  name/color per Châu; entering Kim Châu shows the overworld with the
  correct nav title and a real (non-zero) canvas size; walked to the
  first Huyện marker (2 tiles from spawn), confirmed the prompt shows
  the correct Huyện name and is visually hidden (computed `display`,
  not just the attribute) both before arriving and after walking off
  without confirming; walked back and confirmed via Enter, landed on
  the Huyện placeholder screen with the correct title/banner
  text/spawn position, confirmed the banner is visually visible there
  and the chau-screen's trigger prompt is not; walked into the
  placeholder room's border wall from the interior and confirmed
  collision still rejects the move (regression check on the Phase A3
  collision layer generalizing correctly to a new map); clicked the
  back button and confirmed it returns to the *same* Châu
  (`Kim Xà Đại Lục`) with the player back at the Châu's spawn tile, not
  a stale position; confirmed `#map-trigger-overlay` no longer exists
  in the DOM at all (retired code actually removed, not just unused);
  clicked back-to-menu and confirmed the menu is visually visible again
  and the play area is visually hidden. Screenshot-reviewed 1024/768/
  480px (menu + a Châu overworld at each width, no horizontal overflow
  at any width) and a 390x844 mobile/touch run (joystick-drove the
  player on Thổ Châu's overworld, confirmed movement). Also visually
  reviewed a huyện-screen screenshot directly (not just asserted) —
  this is what caught the `[hidden]` CSS bug above; the fix was
  re-verified against the same screenshot set afterward. Zero
  `pageerror` and zero unexpected `console.error` across all runs
  (only the same pre-existing sandbox network-block noise for the Pi
  SDK/fonts every prior session has hit).
- **Not done / deliberately deferred**: no real per-khu-vực Huyện
  content (C1-C5) — every Huyện in every Châu currently leads to the
  same empty placeholder room; only Bạc Kim Trấn is meant to get real
  content next, per the roadmap's C1-C5 ordering. No economy
  (Linh Thạch/Điểm Danh Vọng) wiring yet — that starts at C4 per the
  roadmap. `js/elementStats.js` still isn't read anywhere in this
  engine — real player stats don't matter until real combat exists
  (Phase C).
- **Next session**: start Phase C1 — Bạc Kim Trấn's Khu đánh quái.
  Replace that one Huyện's placeholder room (`buildHuyenPlaceholderMap()`
  is currently shared/generic for all 15 Huyện — C1 should branch on
  which Huyện was entered rather than continuing to always build the
  same generic room) with 3-6 visible monster nodes wired to
  game-wulin's existing combat screen, per this file's "Khu vực cơ chế"
  spec. Decide during that session how `enterHuyen()` should route to
  per-Huyện-specific map builders vs. staying on one generic builder
  with content flags — the cleanest generalization isn't obvious yet
  and shouldn't be guessed at speculatively before C1 needs it.
- **Backup tag push**: attempted again this session (not skipped, in
  case the standing gap had cleared) — same `403`/`RPC failed`/
  `send-pack: unexpected disconnect` as every session since 2026-08-24.
  Still a confirmed standing gap needing a broader GitHub App
  permission grant only the human owner can make; used the pre-merge
  `main` SHA as the rollback point instead (recorded in this session's
  merge commit).

### 2026-08-31 (session 5) — Phase A4 done: interaction/transition triggers

- **Verified ground truth before starting**: read the actual A1-A3 code
  in `js/game-map.js` (not just this log) — `isWalkable()`/
  `tryStartMove()` and the wall-tile collision from Phase A3 were
  confirmed working as claimed, so A4 could build cleanly on top
  without re-deriving anything.
- **`TRIGGER_ZONES`** (`js/game-map.js`) — one dummy zone,
  `{ id: 'dummy-cave', tx: 5, ty: 7, icon: '🕳️', label, promptText }`,
  on an open grass tile clear of `WALL_TILES` and the player spawn.
  Shaped so Phase C's real khu vực markers slot into the same array
  with no rewrite (same pattern `TILE_TYPES` used for A3's wall type).
- **State machine** (`mapState.trigger.state`): `none` → `prompt`
  (standing on a zone tile, confirm bar visible) → `transitioned`
  (placeholder sub-screen open, movement paused via an early return in
  `tryStartMove()`) → `cooldown` (sub-screen just closed; waits for the
  player to step off the tile before the prompt can re-fire, so closing
  the overlay doesn't instantly re-show the same prompt) → back to
  `none` once they've left the tile. `updateTriggerZone()` drives all
  the automatic transitions (entering/leaving a zone tile) each frame
  from the game loop; `confirmActiveTrigger()`/`closeTriggerOverlay()`
  handle the two explicit user actions.
- **UI**: a new non-blocking `.map-trigger-prompt` bar
  (`game-map.html`/`css/game-map.css`) anchored to the top of the
  canvas — deliberately not a full overlay, so the player can still see
  the map and just walk away to cancel, per the roadmap's "not an
  instant auto-transition" spec. The placeholder "transitioned"
  sub-screen reuses `.finance-modal`'s existing overlay/card/close-
  button chrome (`#map-trigger-overlay` carries that class directly) —
  only its body copy and back button needed new CSS
  (`.map-trigger-overlay__body`/`__back-btn`) — same reuse-over-new-
  system instinct the roadmap calls out for the real C4 shop dialog.
  Confirm works via clicking/tapping the "Vào" button or pressing
  Enter/Space while the prompt is open; closing works via the "Quay lại
  bản đồ" button, the modal's "✕", or Escape.
- **No design deviation from the roadmap spec** — built exactly what
  A4 described (confirm-first entry, walk-away-to-cancel, transition to
  a placeholder screen). The only addition not explicitly spelled out
  is the `cooldown` state, added because without it closing the overlay
  while still standing on the tile would instantly re-show the same
  prompt — worth calling out in case Phase C's real zones want
  different re-entry behavior (e.g. a dungeon you can walk straight
  back into after leaving mid-fight).
- **Tested via a scratch Playwright script** (same convention as every
  prior phase, `node test-a4.js` in the OS scratch dir): desktop
  keyboard run at 1024px — walked from spawn (10,7) to the trigger tile
  (5,7), confirmed the prompt appears with the correct text; walked off
  without confirming and confirmed the prompt auto-hides (cancel-by-
  leaving); walked back on and confirmed via Enter, confirmed the
  overlay opens with the correct title and the prompt hides; confirmed
  movement (ArrowUp) is rejected while the overlay is open, position
  unchanged; closed via Escape, confirmed the prompt does NOT
  immediately reappear (cooldown working) and does reappear after
  stepping off then back onto the tile; re-confirmed via a mouse click
  on the "Vào" button and closed via the "✕" button; re-ran the Phase
  A3 wall-collision regression (approaching (10,4) from the south,
  movement into it still rejected) to confirm A4 didn't regress
  collision. Mobile run at 390×844 with `hasTouch`/`isMobile` — drove
  the player to the trigger tile via joystick flicks, confirmed the
  prompt appears, tapped "Vào" to open the overlay and "Quay lại bản
  đồ" to close it. Screenshot-checked 1024/768/480px (plus the mobile
  viewport) — prompt bar and overlay both render inside the canvas/page
  bounds with no overlap with the joystick or HUD, no horizontal
  overflow; visually confirmed the overlay's dark-theme modal chrome
  reads correctly. Zero `pageerror` and zero unexpected `console.error`
  across all runs (only the same pre-existing sandbox network-block
  noise for the Pi SDK/fonts every prior session has hit).
- **Not done / deliberately deferred**: no real Châu/Huyện content (B/C/D)
  — this dummy trigger and its placeholder sub-screen are still
  engine-proof-only, same "one phase at a time" discipline as every
  prior session. Phase A is now fully complete (A1-A4 all done).
- **Next session**: start Phase B — the 5-Châu menu screen (reuses
  existing element color tokens/theming) and the first walkable
  overworld map with 3 Huyện markers connected by roads/paths, per the
  roadmap's Phase B spec. This is the first phase that needs a second,
  larger map (a Châu overworld) alongside the existing placeholder test
  map — decide during that session whether `game-map.js`'s engine
  functions generalize to an arbitrary map object/size cleanly, or need
  a small refactor first, before adding the real Kim Châu content.
- **Backup tag push**: attempted once (`backup-2026-08-31-165002`) —
  same `403`/`RPC failed`/`send-pack: unexpected disconnect` as every
  session since 2026-08-24, now well over a week of consecutive
  failures on tag-ref pushes specifically (branch/content pushes are
  unaffected). Per the 2026-08-31 (session 2) note, treated as a
  confirmed standing gap rather than worth full retry-with-backoff
  every session — still needs a broader GitHub App permission grant
  only the human owner can make. Used the pre-merge `main` SHA as the
  rollback point instead: `c25d8b85618a1f741b6b8d48d99a979363efd9af`.

### 2026-08-31 (session 4) — Phase A3 done: collision/walkability layer

- **`isWalkable()`/`tryStartMove()` (from Phase A1) already gated movement
  on a per-tile `walkable` flag** — verified by reading the actual code
  before starting, per this roadmap's "code is ground truth" instruction.
  So A3 needed no new movement-gating logic, only something real for that
  gate to reject: a first blocked `TILE_TYPES` entry (`js/game-map.js`,
  id `2`, `name: 'wall'`, `walkable: false`), rendered as a flat solid
  `--text-muted` fill (no rgba tint, unlike grass/path) so it visually
  reads as an obstacle even before real building sprites exist.
- **`WALL_TILES` placements** in `buildTestMap()`: one isolated lone tile
  at `(10, 4)` — open on all 4 sides regardless of the existing criss-
  cross grass/path pattern, specifically so collision could be verified
  from every direction — plus a 2×2 cluster at `(15-16, 10-11)` for
  visual variety and a second, joystick-driven collision check.
- **No changes needed to `isWalkable()`, `tryStartMove()`, camera, or
  either input source** — this phase is intentionally data-only (a new
  tile type + placements), which is why the diff is small.
- **Tested via a scratch Playwright script** (same convention as every
  prior phase): at a 1024px desktop viewport, keyboard-drove the player
  to approach the isolated wall tile at `(10,4)` from all 4 sides
  (south, west, east, north in that order, routing around via open
  tiles between attempts) — every attempted move into the wall tile was
  rejected, player position unchanged each time; confirmed normal
  movement onto open tiles and held-key continuous movement both still
  work unregressed. At a 390×844 mobile viewport with `hasTouch`/
  `isMobile`, joystick-drove the player to `(14,10)` (adjacent west of
  the wall cluster) and confirmed an eastward joystick drag into the
  cluster is also rejected; re-confirmed the A2 sub-dead-zone-drag-
  produces-zero-movement behavior is unregressed; screenshot-verified
  the wall cluster renders as a visually distinct solid gray block next
  to the player. Also screenshot-checked 1024px/768px/480px per
  `workflow.md`'s responsiveness step — no overflow or joystick/HUD
  overlap at any width (no layout changed this session, but re-verified
  since the canvas now renders new tile content). Zero `pageerror` and
  zero unexpected `console.error` across all runs (filtered out only the
  same pre-existing sandbox network-block noise for the Pi SDK/fonts
  every prior session has hit — `ERR_TUNNEL_CONNECTION_FAILED`/
  `ERR_CONNECTION_RESET` — not app errors).
- **Not done / deliberately deferred**: no interaction/transition
  triggers (A4), no real Châu/Huyện content (B/C/D) — same "one phase at
  a time" discipline as every prior session. The wall tile type and
  placements here are still placeholder-map-only; Phase C's real per-
  Huyện obstacle layouts are a separate, later task, not extended from
  this file's `WALL_TILES` array.
- **Next session**: start Phase A4 (interaction/transition triggers) —
  a marked zone the player can walk into that shows a confirm prompt
  ("Nhấn để vào Hang Động") rather than an instant auto-transition, per
  the roadmap spec; test with one dummy trigger tile first, confirming
  the prompt appears on entry, confirming transitions, and declining (or
  walking away) does not.
- **Backup tag push**: retried this session rather than skipped outright
  (in case the earlier 403 was transient) — still fails with the same
  `403`/`RPC failed`/`send-pack: unexpected disconnect` as every session
  since 2026-08-24, a full week of consecutive failures now. Used the
  pre-merge `main` SHA as the rollback point instead:
  `c8e47891ef6cd6c2937b9ff86753b75aca4686d8`. Per the 2026-08-31
  (session 2) note, treating this as a confirmed standing gap rather
  than worth re-testing every single session going forward — likely
  needs a broader GitHub App permission grant (tag-ref push specifically,
  branch/content pushes work fine) that only the human owner can grant.

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
