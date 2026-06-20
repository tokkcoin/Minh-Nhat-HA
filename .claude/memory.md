# memory.md — Persistent Project Memory

> Claude reads this file to recall past decisions, design choices, and context
> across sessions. Append new entries at the bottom with a date.

---

## 2026-06-18 — Project Initialized

- **Concept**: Track personal balance across 5 life dimensions, mapped to the Five Elements (Wu Xing): Metal=Money, Wood=Health, Water=Talent/Skills, Fire=Mood, Earth=Situation/Circumstances.
- **Stack decision**: Pure HTML/CSS/JS, no frameworks, no build step — required by the target deployment platform, not just a simplicity preference.
- **Platform**: Pi Network App Studio — the app must run inside the Pi Browser and load the Pi SDK (`https://sdk.minepi.com/pi-sdk.js`), calling `Pi.init({ version: "2.0", sandbox: true })`. Stays in `sandbox: true` until the user explicitly says otherwise.
- **Starter color palette** (initial pick, not yet user-confirmed — revisit before treating these as final):
  - Metal `#b8860b` (dark goldenrod — money/wealth association)
  - Wood `#4caf50` (green — health/growth)
  - Water `#2196f3` (blue — calm/flow)
  - Fire `#e64a3c` (red-orange — mood/energy)
  - Earth `#8d6e4f` (brown/tan — grounded/stable)
- **Folder scaffold**: `.claude/` structure (rules/, agents/, skills/, settings.json, settings.local.json, memory.md) was scaffolded to mirror the sibling PTE project's framework, with generic/project-specific placeholder content rather than a literal copy of PTE's PTE-exam-specific content.
- **Carried-over lesson from PTE**: if/when real data files are added under `data/`, use the `window.<NAME>_DATA` script-loaded convention (not `fetch()` + raw `.json`) — Chromium blocks `fetch()` of local files when opened via `file://`, and a top-level `const`/`let` in a classic `<script>` does NOT attach to `window`, so the assignment must be `window.X = [...]` explicitly. See PTE's `.claude/memory.md` (2026-06-18 entries) for the full incident if this needs re-explaining later.

## 2026-06-18 — Dark theme + marketing-style landing sections

- **Trigger**: user shared screenshots of Resend's marketing site (resend.com) and asked to rebuild the landing page in that visual style ("follow 1-2-3" = hero → trust-logo-style row → feature/integration row).
- **Decision**: explicitly confirmed override of the light starter palette from the previous entry with a dark theme (`--bg-page: #0a0a0a`, `--bg-card: #141414`, light text). The 5 element colors were brightened (not just inverted) so they stay legible on near-black. This **resolves** the "not yet user-confirmed" flag on the original palette — dark-mode values are now the real tokens; see `.claude/rules/design.md`.
- **Typography addition**: added `'Fraunces'` (serif) as a *display-only* font for hero/section headlines, layered on top of Inter (still the body font). Approved in `.claude/rules/tech-defaults.md`.
- **New `--accent-gradient`** token (Fire → Metal) used sparingly for one highlighted word per hero/section headline, mirroring the gradient-highlight treatment in the reference screenshots.
- **New sections added to `index.html`** (all built with existing vanilla HTML/CSS/JS — no new dependencies beyond the one font):
  1. Hero — badge, serif headline, subtitle, two CTAs, and a CSS-only "orb + 5 orbiting element nodes" graphic (no images/assets used).
  2. Elements showcase — a trust-logo-row equivalent listing the 5 elements as hoverable badges (hover reveals each element's own color), instead of literal company logos since this isn't a B2B product.
  3. "How it works" — adapted from Resend's dev-integration section into a 3-step explanation (Rate / Reflect / Rebalance) plus a static visual preview panel (tabs + bars) — intentionally non-interactive, since there's no real tracking data wired up yet (see Open TODOs).
- **Heading hierarchy fix**: hero title is now the page's single `h1`; "Today's Balance" demoted to `h2`; the 5 element-card names demoted to `h3` (previously 5 sibling `h2`s with no `h1` on the page).
- Existing dashboard element cards were restyled (not restructured) to use the new dark tokens + `-tint` rgba hover backgrounds instead of the old flat pastel `-light` hex values.

## 2026-06-18 — Per-element "journal" (social-style posting), local-only demo stage

- **Trigger**: user asked for clicking an element card to open a page where they can post text/photo/video/audio and like posts, "similar to TikTok/Facebook." That's a real multi-user social-network ask, which conflicts with this project's hard "static files only, no backend" deployment constraint (Pi App Studio).
- **Resolved scope** (explicitly chosen by the user over the alternatives): build a **personal local journal per element** — single user, no accounts, nothing shared between people or devices. User's own words on the backend question: "get a demo testnet first, I will add it later" — i.e. ship the client-only version now, revisit a real backend before any production/Pi submission.
- **What was built**:
  - `journal.html` — one shared page (not 5 near-duplicate files), themed at runtime from a `?el=metal|wood|water|fire|earth` query param via `js/journal.js`.
  - Composer: text + a single file input (`accept="image/*,video/*,audio/*"`), one attachment per post, detected by MIME type.
  - Feed: newest-first, like/unlike (heart toggle + count), delete. All per-element, persisted to `localStorage` — see `.claude/rules/tech-defaults.md` ("User-Generated Content" section) for the storage key convention and the 4MB attachment guard against `localStorage`'s quota.
  - Extracted `showToast` / `initPiSdk` out of `js/main.js` into a new shared `js/common.js`, since `journal.html` needed the same two helpers — avoids duplicating them a second time.
  - Index.html element cards are now real `<a href="journal.html?el=...">` links (previously `<div>`s that just popped a "coming soon" toast).
- **Known limitation to revisit later** (per the user's "I will add it later"): no cross-device sync, no real accounts, no media hosting — everything lives in one browser's `localStorage`. Swapping this for a real backend is a deliberate future step, not an oversight.

## 2026-06-20 — Growth chart concepts (5 combo bar+line designs), comparison stage

- **Trigger**: user asked for a chart combining bar + line graphs showing growth of the Five Elements based on journal post counts, and wanted 5 different designs to compare before picking one.
- **What was built**: standalone `chart-concepts.html` + `js/chartConcepts.js`, not wired into the dashboard yet — purely a side-by-side comparison page (linked from nowhere in the nav; open the file directly).
  1. Grouped bars (per-element weekly counts) + single bold trend line for the combined weekly total.
  2. Stacked bars (weekly composition across elements) + 5 thin overlaid lines tracing each element's cumulative growth on a shared secondary scale.
  3. Small-multiples — one mini bar+sparkline combo per element, styled to drop into the existing `element-grid` card layout.
  4. Ranking bars (all-time total per element, sorted desc) + a dual-axis growth-rate line (recent vs. earlier weeks, zero baseline).
  5. Hero-style full-width "glow line" timeline (soft background bars + 5 glowing cumulative-growth lines + end-value labels), matching the dark marketing aesthetic already used in `index.html`'s hero/how-it-works sections.
- **Data source**: reads real posts straight from the same `localStorage` keys `journal.js` already uses (`lifebalance_journal_<element>`), bucketed into the last 8 weeks by `createdAt`. Falls back to a fixed demo dataset (clearly labeled via an on-page banner) when there are zero posts across all elements, so the comparison page isn't empty before any real journaling has happened.
- **No new dependencies**: all 5 charts are hand-built inline SVG (`document.createElementNS`), no chart library — `tech-defaults.md` requires CDN JS libs to be approved individually and none were, so this was the constraint-compliant path.
- **Next step (not yet decided)**: user picks a winning design, then it gets wired permanently into `index.html`'s dashboard (or wherever they want it) using real per-element totals instead of the demo fallback.

## 2026-06-20 — "How it works" preview bars now show real post counts

- **Trigger**: user wanted the Today/This Week/This Month bars in the landing page's "How it works" section (previously static mockup percentages) to count and display the real number of journal posts per element.
- **What changed**: `js/main.js` now reads the same `localStorage` keys as `journal.js`/`chartConcepts.js` (`lifebalance_journal_<element>`), counts posts per element within the selected range, and renders each bar's width relative to the largest count (plus the raw number at the end of the bar). Tabs were converted from `<span>` to real `<button>` elements with `data-range="today|week|month"` so they're keyboard-operable and wired to re-render on click.
- **Range definitions** (rolling windows, not calendar week/month, to avoid timezone/week-start ambiguity): Today = since local midnight, This Week = last 7 days, This Month = last 30 days.
- If there are zero posts everywhere, all bars correctly render at 0 width with "0" counts — no demo-data fallback here (unlike `chart-concepts.html`), since this lives on the marketing page and an all-zero state is an honest, normal first-run state.

## Open TODOs

- [ ] Decide what a single "balance entry" (mood/health/etc. *rating*, distinct from the journal posts) looks like before building the rating half of the dashboard
- [ ] Wire up real Pi SDK auth flow once a concrete feature needs it (no payment/auth feature exists yet)
- [ ] Real backend/multi-user social platform for the journal — explicitly deferred by the user, not yet scheduled
- [ ] Decide whether historical entries eventually persist via Pi Network storage, a real database, or both
- [ ] Pick a winning design from `chart-concepts.html` and wire it permanently into `index.html` (still pending, separate from the "How it works" bars above)
