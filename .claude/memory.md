# memory.md — Persistent Project Memory

> Claude reads this file to recall past decisions, design choices, and context
> across sessions. Append new entries at the bottom with a date.

---

## 2026-06-21 — Fixed: video stories/posts showed blank on iPhone Pi Browser

- **Trigger**: user tested the new Stories feature on an actual iPhone in Pi Browser and reported the story viewer opened (✕/Delete buttons visible) but the photo/video itself never appeared — just a black box.
- **Root cause**: iOS Safari/WebKit (which Pi Browser uses on iPhone) has a long-standing bug where `<video src="data:video/...;base64,...">` simply won't load — see `.claude/rules/tech-defaults.md`. Images as data URIs are unaffected; only video. This was a real bug, not just stories-specific — the same pattern existed in the regular journal feed's video posts (`js/journal.js`, `js/main.js`) and would have silently failed there too on iPhone.
- **Fix**: added `dataUrlToObjectUrl()` to `js/common.js` — converts the stored data URI to a `Blob` + `URL.createObjectURL()` at render time, only for `<video>` elements (images keep using the data URI directly). Applied in three places: the story viewer, the story tray thumbnails, and both feed renderers' video post cards (`buildUnifiedPostCard` in `main.js`, `buildPostCard` in `journal.js`). Also added `error` listeners on story media so a genuine load failure shows a toast instead of staying silently blank.
- **Why this didn't surface earlier**: WebFetch/desktop-browser testing can't catch this — Chrome/Firefox/desktop Safari all play data-URI video fine; it's iOS WebKit specifically. Worth remembering for any future media feature: test video playback on an actual Pi Browser/iPhone, not just desktop.

## 2026-06-21 — Boot steps isolated; close button bug traced to a cascading throw

- **Trigger**: after the video data-URI fix, user still saw a blank story AND the viewer's ✕ close button stopped working entirely — clicking it did nothing.
- **Root cause**: `dataUrlToObjectUrl()` (new in the previous fix) threw on the corrupted stored video's malformed base64 (`atob()` throws on invalid input). That throw happened inside `renderUnifiedFeed()`/`renderStories()`, which ran earlier in the same un-isolated `DOMContentLoaded` callback as `initStoryViewer()` — an uncaught throw stops the rest of that synchronous callback, so `initStoryViewer()` (which wires the ✕/Delete listeners) never ran. One corrupted post's media silently broke an unrelated button.
- **Fix**: (1) `dataUrlToObjectUrl()` now returns `null` instead of throwing — every call site checks for `null` and shows a "corrupted, can't be played" message instead of assuming success. (2) Added `runBootStep(fn)` to `js/common.js`, wrapping every top-level call in both `main.js`'s and `journal.js`'s `DOMContentLoaded` handlers — each step now runs in its own try/catch so one failing step can never prevent later ones from running.
- **Lesson**: any `DOMContentLoaded` handler with multiple sequential calls is a hidden single point of failure — the first uncaught throw silently cancels everything after it, with no console-visible symptom obvious to an end user (just "stuff stopped working"). Always isolate boot steps once a page has more than one independent feature initializing in the same handler.

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

## 2026-06-21 — Pi Developer Portal setup: hosting, domain validation, privacy policy

- **Hosting**: pushed the project to GitHub (`github.com/tokkcoin/Minh-Nhat-HA`, `main` branch) and deployed it on **Vercel** at `https://minh-nhat-ha.vercel.app` (auto-deploys on push). GitHub Pages was tried first but rejected by Pi's portal — Pi's Frontend URL field requires a bare root domain with no path, and GitHub Pages project sites are `username.github.io/repo-name/` (a path). The `username.github.io` special-repo route was blocked by a pre-existing repo of that name on the account, so Vercel was used instead since its default subdomains (`project.vercel.app`) have no path.
- **Domain validation**: `validation-key.txt` (containing the exact key the portal gave) lives at the repo root and is served at `/validation-key.txt` — this is how Pi's "Validate Domain Ownership" checklist step was satisfied.
- **Privacy policy**: added `privacy-policy.html`, live at `https://minh-nhat-ha.vercel.app/privacy-policy.html`. Content is accurate to the actual code as of this date — local-only storage, no accounts/analytics/tracking, lists Google Fonts + Pi SDK as the only third-party requests. **Must be revisited and updated if the data-handling story changes** (e.g. the payments backend below, or any future real backend) — don't let this page go stale.
- **Pi app identity confirmed**: the Pi Developer Portal entry for this app is named **"Mind map"** internally (differs from the site's own "Life Balance" branding — just a naming choice, same app) and is registered on **Mainnet**, not testnet.

## 2026-06-21 — Pi U2A payment verification (Mainnet, real Pi)

- **Trigger**: the Developer Portal's final checklist item, "Process a Transaction on the App," requires one real User-to-App (U2A) payment processed through the app at its production URL. (The user initially described this as "app-to-user to 5 wallets," but the actual checklist step — confirmed via screenshot — is a single U2A payment. No 5-wallet A2U requirement actually exists in this checklist.)
- **Mainnet risk explicitly confirmed by the user**: this app is on Mainnet, so this is a real (small) Pi payment, not test currency. User was asked directly and confirmed they understand and want to proceed anyway.
- **Why this needed a backend exception**: Pi's Payments API (`/v2/payments/{id}/approve` and `/complete`) requires the app's secret Server API Key, which can never be shipped client-side. This is the first genuine, deliberate exception to the project's "static files only, no backend" rule — see `.claude/rules/tech-defaults.md` ("Pi Payments Backend" section) for the exact scope of the exception (two Vercel serverless functions, nothing more).
- **What was built**:
  - `api/approve-payment.js`, `api/complete-payment.js` — Vercel zero-config Node serverless functions, read `PI_API_KEY` from a Vercel environment variable (never committed to the repo, never pasted into chat).
  - `pi-test-payment.html` + `js/piPayment.js` — a standalone page (not linked from main nav, `<meta name="robots" content="noindex">`) with a clear Mainnet/real-money warning banner, an "authenticate → createPayment → approve → complete" flow for a fixed 0.01 π amount, and an `onIncompletePaymentFound` handler per Pi SDK requirements.
- **Not done yet / still needs the user**: add `PI_API_KEY` to Vercel's environment variables (the user must do this themselves in the Vercel dashboard — not something that can be done from here), then open `pi-test-payment.html` inside Pi Browser at the Mainnet production URL and actually tap pay once to complete the checklist step.

## 2026-06-21 — "Sign in with Pi" (username scope)

- **What was built**: `js/piAuth.js` (auto-triggers on `index.html` load, plus a manual "Sign in with Pi" button in the header) and `api/verify-auth.js` (validates the client's `accessToken` against Pi's `GET /v2/me`, then issues an HMAC-signed HttpOnly session cookie — no database). `js/common.js`'s `initPiSdk()` was made async/memoized so `Pi.init()` is awaited exactly once before any `Pi.authenticate()` call.
- **New required env var**: `SESSION_SECRET` (any long random string) — same pattern as `PI_API_KEY`, must be added in Vercel before sign-in will work, otherwise `/api/verify-auth` returns 500.
- **Not built**: sign-out, persisting users anywhere beyond the session cookie, using the session for anything yet (no protected routes/features check it). This is sign-in only, not a full account system.

## 2026-06-21 — Unified Facebook-style feed (replaces the 5-card dashboard)

- **Trigger**: user shared Facebook screenshots and asked for: a single combined feed (composer at top, all elements' posts together) instead of 5 separate cards/pages; a horizontal Stories-style row of the 5 elements that **filters the same feed in place** when clicked (no page navigation); and a mandatory 4-quadrant priority tag on every post (Emergency+Important / Emergency+Unimportant / Important+Not-Emergency / Unimportant+Not-Emergency — the Eisenhower matrix).
- **Decisions confirmed with the user** before building: (1) this replaces `index.html`'s dashboard section directly, not a new page; (2) element click = in-place filter, not navigation; (3) both element and priority level are required to post, no untagged posts.
- **What changed**:
  - `index.html`'s old `.element-grid` (5 `<a>` cards linking to `journal.html?el=...`) is gone, replaced by: a composer (text + attach + element `<select>` + priority `<select>`), a `.stories-row` of circular element icons (`role="tablist"`, click = `activeFeedFilter` + re-render, "All" included), and one `.feed` showing every element's posts merged and sorted by `createdAt` descending.
  - **Refactor**: pulled `ELEMENTS`, `PRIORITY_LEVELS`, `MAX_MEDIA_BYTES`, `journalStorageKey`/`loadElementPosts`/`saveElementPosts`, `timeAgo`, `escapeHtml`, `readFileAsDataUrl` out of `journal.js` into `common.js`, since `main.js`'s new unified feed needed the exact same post shape/storage and duplicating it again would've been the third copy. `chartConcepts.js`'s independent `ELEMENTS` array was renamed to `ELEMENTS_LIST` (now `Object.values(ELEMENTS)`) specifically to avoid a **duplicate top-level `const ELEMENTS` declaration** between it and `common.js` — both load on `chart-concepts.html`, and two `const ELEMENTS` in the same global scope would have been a hard `SyntaxError` crashing that whole page. Caught and fixed in the same pass as this change; watch for this class of bug whenever a new shared global is added to `common.js`.
  - `journal.html`/`journal.js` (the per-element pages) gained the same required priority-level `<select>` and now show a level badge too, so posts created there match the same shape the unified feed expects. These pages still work standalone but are no longer linked from `index.html`'s dashboard — reachable only by direct/bookmarked URL now.
  - Post objects now carry `element` and `level` fields explicitly (previously `element` was only implicit via which `localStorage` key a post lived under). Old posts created before this change won't have either field — `main.js` backfills `element` from the storage key when merging, and renders no level badge at all when `post.level` is missing, rather than showing a broken/blank badge.
  - Removed the now-dead `.element-grid`/`.element-card*` CSS (nothing references those classes anymore).
- **Not done**: no "sign out"/account tie-in to posts (posts are still anonymous "You", unrelated to the new Pi sign-in feature above — these two features don't talk to each other yet).

## 2026-06-21 — "Create a Story" (Facebook-style), separate from the element filter row

- **Trigger**: user asked for a Facebook-style "create a story" feature. The existing `.stories-row` (All/Metal/Wood/Water/Fire/Earth chips at the top of the unified feed) already borrowed Stories' visual language but was repurposed as a feed *filter*, not actual stories — needed to resolve that overlap before building.
- **Decisions confirmed with the user**: (1) stories are a separate "+ Create Story" bubble in a new tray above the existing filter row, not tied to any element, so the filter chips keep their current click-to-filter behavior unchanged; (2) no auto-expiry — a story stays until manually deleted, unlike real Instagram/Facebook's 24h expiry; (3) a story requires a photo or video (no text-only stories), with an optional caption.
- **What was built**: a new `.stories-tray` in `index.html` (the "+ Your Story" create bubble, plus a `#stories-list` container that JS fills with one circular thumbnail per existing story) and a full-screen `#story-viewer` overlay (close ✕, delete 🗑, click-the-backdrop-to-close). All logic lives in `js/main.js` (`loadStories`/`saveStories`/`renderStories`/`buildStoryChip`/`openStoryViewer`/`closeStoryViewer`/`deleteCurrentStory`/`initStoryCreate`/`initStoryViewer`).
- **Storage**: single key `lifebalance_stories` (not per-element, unlike journal posts) — `{ id, mediaType: 'image'|'video', mediaData, caption, createdAt }`. See `.claude/rules/tech-defaults.md`.
- **Reused rather than rebuilt**: the `.story-chip`/`.story-chip__icon` circle styling from the existing filter row (just added `--create`/`--user`/`--thumb` modifier classes), and the same `MAX_MEDIA_BYTES`/`readFileAsDataUrl`/`showToast` helpers from `common.js` already used by the journal composer.

## 2026-06-21 — Fixed: black screen covering the whole app (Pi Browser + desktop)

- **Trigger**: user reported the app showed a full black screen and was unusable, starting right after the "Create a Story" feature was added.
- **Root cause**: `.story-viewer` in `css/style.css` (the full-screen story-viewer overlay, `background: rgba(0,0,0,.9)`) is styled with `display: flex` directly on the class, with no matching `.story-viewer[hidden] { display: none; }` rule. Author stylesheet rules always beat the browser's built-in `[hidden] { display: none }` default regardless of selector specificity, so the overlay rendered full-screen and black on every page load even though `index.html` has `hidden` on the element — `hidden` was never actually doing anything.
- **Fix**: added `.story-viewer[hidden] { display: none; }` right after the `.story-viewer` rule in `css/style.css`.
- **Second factor (Pi Browser specifically)**: `css/style.css` was never cache-busted with a `?v=` query param the way `js/common.js`/`js/main.js`/`js/journal.js` already are (see the 2026-06-21 video-fix entry above — Pi Browser caches aggressively). Bumped to `css/style.css?v=4` in both `index.html` and `journal.html` so the fix actually reaches devices with a cached old CSS.
- **Lesson**: any full-screen/modal overlay toggled via the `hidden` attribute needs an explicit `[hidden] { display: none }` override the moment it also has a class rule setting `display`. And CSS needs the same cache-busting discipline as JS for Pi Browser — easy to forget since the JS fix only touched `?v=` on script tags last time.

## 2026-06-21 — CapCut-inspired Story Editor: element tags, filter/trim/layers, music picker

- **Trigger**: user asked to upgrade "Create a Story" so stories are tagged to one of the 5 elements like journal posts, get a CapCut-style editor (filter presets, video trim, draggable text/sticker layers), and a ~100-track royalty-free music picker pool.
- **Scope confirmed with the user before building** (see the plan at the time, `witty-pondering-wolf`): single media file only — no multi-clip splicing/merging ("cắt ghép" in the literal multi-clip sense was explicitly ruled out). Real NCS-style track URLs were not supplied yet; the music picker was built against an empty `data/storyMusic.js` extension point instead of fabricated/placeholder URLs.
- **Key architecture decision — live composite, not re-encoded export**: rather than `canvas.captureStream()` + `MediaRecorder` + Web Audio mixing to bake a new video file (technically possible with zero new dependencies, but MediaRecorder support on Pi Browser's mobile WebKit is unverified — the same risk class as the iOS `<video src="data:...">` bug fixed earlier today), stories keep their **original, untouched `mediaData`**. Trim/filter/layers/music are stored as small JSON metadata on the story object and applied **live, every time the story is viewed** — `openStoryViewer()` in `js/main.js` seeks/loops the video between `trimStart`/`trimEnd`, applies `filterKey` via the native CSS `filter` property, renders `layers` as absolutely-positioned DOM elements on top of the media, and plays `musicTrackId` through a separate synced `<audio>`. This satisfies every named feature as real, working, user-controlled behavior without the export-file risk; it cannot produce a single downloadable/shareable video, but nothing in scope needed that.
- **What was built, in 3 shipped phases** (see the plan file for full rationale per phase):
  1. **Element tagging + minimal editor shell**: stories now require an element (`#story-editor-element`, same validation toast pattern as the post composer). Built the full `#story-editor` overlay shell once so later phases just added panels into it. Also merged stories into the main unified feed (`loadAllPostsMerged()`/`buildStoryFeedCard()` in `main.js`) so they're filterable by element/All alongside journal posts, with a click on the media opening the existing full-screen `#story-viewer`.
  2. **Filters + trim timeline + draggable layers**: `js/storyEditor.js` added `FILTER_PRESETS` (CSS `filter` strings, exported via `window.FILTER_PRESETS` since top-level `const` doesn't auto-attach to `window` — see the `tech-defaults.md` `window.X_DATA` note), a two-handle Pointer-Events trim scrubber (`initTrimTimeline`/`applyTrimLoop`), and draggable text/sticker layers (`addTextLayer`/`addStickerLayer`/`makeLayerDraggable`, positioned in `xPct`/`yPct` so they're resolution-independent). `applyTrimLoop()` and a read-only `renderLayersReadOnly()` are shared between the editor's own preview and `openStoryViewer()` so this logic isn't written twice.
  3. **Music picker**: `data/storyMusic.js` ships `window.STORY_MUSIC_TRACKS = []` (empty, with the exact `{id, title, artist, url, durationSec}` shape documented in a comment) — paste real tracks in later, no other file changes needed. The picker panel shows a friendly "Chưa có nhạc" empty state rather than a blank panel. `openStoryViewer()` creates/syncs a looping `<audio>` element alongside the video/image, started in the same synchronous click-handler tick as the media (required for mobile autoplay-gesture policy).
- **Real bug caught during Phase 1 testing — silent localStorage quota failures**: `saveElementPosts()`/`saveStories()` called `localStorage.setItem()` directly with no error handling. Once a few video posts/stories accumulated, `setItem` started throwing `QuotaExceededError` (origin-wide quota is only ~5-10MB total, well below what a handful of 4MB video attachments add up to) — the throw happened inside an unguarded click handler, so the story/post silently failed to save while the UI still looked like it succeeded (editor closed, but nothing appeared in the feed). This presented to the user as "works sometimes, fails sometimes" with no visible cause. **Fix**: added `safeSetItem(key, value)` to `common.js` (try/catch around `setItem`, shows a toast on failure, returns a boolean), routed both save functions through it, and made every caller (`initUnifiedComposer`, `journal.js`'s post handler, `initStoryCreate`'s `onCommit`, `commitStoryFromEditor`) check the return value — on failure the editor/composer now stays open with the user's content intact instead of silently discarding it. **Lesson**: any `localStorage.setItem()` in this app must go through `safeSetItem`, not called directly — quota failures are a real, easy-to-hit condition once media attachments are involved, not just a theoretical edge case.
- **Not done yet**: real ~100-track NCS-style music list (waiting on the user to supply licensed URLs — once supplied, `privacy-policy.html` also needs a one-line update for the new third-party audio CDN network requests, per the existing discipline on that page). Pi Browser/touch-device re-test of the new Pointer-Events trim/layer dragging and simultaneous video+music playback hasn't happened yet — only desktop-browser testing so far.

## Open TODOs

- [x] `PI_API_KEY` Vercel env var — confirmed working 2026-06-20/21. Note: the dashboard showed it saved with Production checked *before* it actually took effect; a plain "Redeploy" of the existing deployment didn't pick it up, but a fresh `git push` (new deployment from scratch) did. If this env-var pattern recurs, prefer triggering a brand-new deployment over trusting the Redeploy button.
- [ ] Confirm the one-time Mainnet verification payment actually completes successfully inside Pi Browser
- [ ] Decide what a single "balance entry" (mood/health/etc. *rating*, distinct from the journal posts) looks like before building the rating half of the dashboard
- [ ] Real backend/multi-user social platform for the journal — explicitly deferred by the user, not yet scheduled
- [ ] Decide whether historical entries eventually persist via Pi Network storage, a real database, or both
- [ ] Pick a winning design from `chart-concepts.html` and wire it permanently into `index.html` (still pending, separate from the "How it works" bars above)
- [ ] Revisit `privacy-policy.html` content if the data story changes (now that a payments backend exists, double check the policy still accurately describes what little server-side processing exists)
- [ ] Paste real ~100-track NCS-style music URLs into `data/storyMusic.js` (shape documented in that file's header comment) once the user supplies them — also update `privacy-policy.html` for the new third-party audio CDN requests at that point
- [ ] Re-test the Story Editor's trim-handle/layer dragging (Pointer Events) and simultaneous video+music playback on an actual Pi Browser/touch device — only desktop-browser tested so far
