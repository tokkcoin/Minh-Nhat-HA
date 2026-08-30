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

- [ ] **A1 — Core render/camera/movement.** Tile-grid renderer, camera
      viewport following the player sprite, keyboard (arrow/WASD)
      movement, on one small placeholder test map (doesn't need real
      content yet — just prove the engine works).
- [ ] **A2 — Mobile touch controls.** Virtual joystick or tap-to-move,
      tested at a real mobile viewport width (390px class).
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

### 2026-08-31 — Roadmap created
Owner set the standing direction: concentrate all daily-dev effort on
game-wulin's world map (VLTK2-style, real free-roam movement, not a
card/menu-based area picker) instead of spreading across all 4 games.
This file created as the cross-session progress tracker since
`.claude/memory.md` can't be edited by automated runs. No engine code
written yet — next session should start Phase A1.
