# tech-defaults.md — Technology Defaults & Constraints

> These are the technology rules for this project.
> Claude must NOT add any new technology without explicit user approval.

---

## Approved Tech Stack

| Layer | Technology | Version | Source |
|-------|-----------|---------|--------|
| HTML | HTML5 semantic | — | Native browser |
| CSS | Vanilla CSS | — | Native browser |
| JavaScript | Vanilla ES6+ | — | Native browser |
| Platform SDK | Pi Network SDK | 2.0 | `https://sdk.minepi.com/pi-sdk.js` |
| Font | Inter (body) | variable | fonts.googleapis.com |
| Font | Fraunces (hero/section display headlines only) | variable | fonts.googleapis.com |
| Icons | Emoji + inline SVG | — | None (built-in) |

---

## Why No Build Step (this one is a hard requirement, not a preference)

Pi Network App Studio apps must be deployable as static files and run inside the Pi Browser's webview. A build step (bundler, framework compiler, server-side rendering) is not just unnecessary here — it would conflict with how the app gets submitted and sandboxed. If a future requirement genuinely needs a framework or bundler, that changes the deployment story and must be discussed with the user first, not assumed.

---

## Explicitly Forbidden (without user approval)

| Technology | Reason |
|-----------|--------|
| React / Vue / Angular | Adds build complexity — conflicts with Pi App Studio's static deployment model |
| Tailwind CSS | We have our own design token system |
| jQuery | ES6+ native APIs cover all use cases |
| Bootstrap | Conflicts with custom CSS |
| npm / Node.js (client-side / build step) | No build step for the site itself — static project, required by the deployment target. **Exception:** two Vercel serverless Node functions under `/api/` exist specifically for Pi U2A payment approve/complete calls — see "Pi Payments Backend" below. That exception does not extend to anything else (no bundler, no client-side npm packages). |
| TypeScript | No compiler — plain JS only |
| Webpack / Vite / Parcel | No bundler needed or wanted |
| CDN JS libraries (general) | Must be approved individually — Pi SDK is the one pre-approved exception |

---

## Pi Payments Backend (deliberate exception to "no backend")

`api/approve-payment.js` and `api/complete-payment.js` are Vercel serverless Node functions (zero-config, no `package.json`/build step needed — Vercel auto-detects `/api/*.js`). They exist because Pi's Payments API (`POST /v2/payments/{id}/approve` and `/complete`) requires the app's secret **Server API Key**, which must never be sent from client-side JS or committed to the repo.

- **Secret storage**: `PI_API_KEY` is set as a Vercel project Environment Variable (Project Settings → Environment Variables in the Vercel dashboard) — never hardcoded, never in a file the repo tracks.
- **Scope of the exception**: originally these two payment endpoints; `api/verify-auth.js` (below) is a third, deliberately added one. Don't add further server-side features without going back to the user.

### Sign-in with Pi (`api/verify-auth.js`)

- Client (`js/piAuth.js`, wired into `index.html` only) calls `Pi.authenticate(['username'], onIncompletePaymentFound)`, then POSTs the resulting `accessToken` to `/api/verify-auth`.
- The server validates it via `GET https://api.minepi.com/v2/me` with `Authorization: Bearer <accessToken>` — this does **not** need `PI_API_KEY` (that key is only for the app-initiated payments endpoints).
- No database: a session is just a `{uid, username, iat}` payload HMAC-signed with a second secret, `SESSION_SECRET` (also a Vercel env var, same rules as `PI_API_KEY` — never committed), set as an HttpOnly cookie. There's nowhere to log out yet (not built — no logout flow exists).
- `js/common.js`'s `initPiSdk()` is memoized (`piInitPromise`) specifically so `Pi.init()` is only ever called once and is fully awaited before any `Pi.authenticate()` call, even though both `main.js` and `piAuth.js` independently call `initPiSdk()` on `index.html`.
- **Mainnet, not testnet**: this app's Pi Developer Portal entry is on Mainnet — `pi-test-payment.html` sends a real (small) amount of Pi. The user explicitly confirmed this is intentional (2026-06-21) when this was built — see `.claude/memory.md`.

---

## Pi Network SDK Usage

```html
<!-- Load before js/main.js -->
<script src="https://sdk.minepi.com/pi-sdk.js"></script>
```
```js
// Init once, guarded — never assume window.Pi exists (e.g. testing in a plain browser)
if (window.Pi) {
  Pi.init({ version: "2.0", sandbox: true });
}
```
- Keep `sandbox: true` until the user explicitly approves flipping it for production submission.
- Any `Pi.authenticate()` / payment call must be wrapped so a missing `window.Pi` degrades gracefully (e.g. show a toast like "Open this app in Pi Browser to continue") rather than throwing.

---

## Data File Convention (carried over from the PTE sibling project)

If/when practice or tracking data needs to live in its own file under `data/`, follow this pattern — it avoids a real bug that shipped once on the PTE project:

```js
// data/example.js
window.EXAMPLE_DATA = [ { ... }, { ... } ];   // NOT `const EXAMPLE_DATA = [...]`
```
Loaded via `<script src="data/example.js"></script>` — **not** `fetch()`. Reason: Chromium blocks `fetch()`/XHR reads of local files when the page is opened directly via `file://` (this project's whole point is to run with no server), but `<script src>` loads are exempt. And critically: a top-level `const`/`let` in a classic script does NOT attach to `window`, so always assign directly to `window.X`, or code checking `window.X` elsewhere will see `undefined` even though the file loaded with no error.

---

## User-Generated Content (Journal) — local-only, demo/testnet stage

The per-element journal (`journal.html`, `js/journal.js`) is **single-user, single-device, client-only** for now — see `.claude/memory.md` (2026-06-18) for the decision and the planned move to a real backend before production.

- Posts persist via `localStorage`, keyed `lifebalance_journal_<element>` (one array of post objects per element), **not** the `window.X_DATA` static-seed-data convention above — that pattern is for read-only shipped content, this is runtime user data.
- Photo/video/audio attachments are read via `FileReader.readAsDataURL()` and stored as a data URI string inside the post object — `localStorage` can only hold strings, not `Blob`/`File`.
- `localStorage` has a small total quota (~5-10MB per origin). `js/journal.js` rejects any attachment over 4MB client-side (`MAX_MEDIA_BYTES`) with a toast rather than letting `setItem` throw `QuotaExceededError`. Don't remove this guard without replacing local storage with something that can actually hold media (the planned backend).
- Post text is inserted via `innerHTML`, so it is always passed through an `escapeHtml()` helper first — never interpolate raw user text into a template string that becomes `innerHTML`.
- **Stories** (the "Your Story" tray on `index.html`, `js/main.js`) follow the same pattern but live under one single key, `lifebalance_stories` (not per-element — stories aren't tied to an element). No expiry logic — a story stays until the user deletes it via the viewer overlay. Captions come from `prompt()`, not a form field, and are stored as plain trusted-by-the-app strings set via `textContent` in the viewer (never `innerHTML`), so no `escapeHtml()` is needed there either.
- **Video data URIs do not play on iOS Safari / Pi Browser** — long-standing WebKit bug ([webkit.org #232076](https://bugs.webkit.org/show_bug.cgi?id=232076)): `<video src="data:video/...;base64,...">` silently fails to load on iOS WebKit, while `<img src="data:image/...">` works fine there. Found 2026-06-21 when a video story posted fine but rendered as a blank/black box when opened on an iPhone in Pi Browser. **Fix, applied everywhere a video is rendered** (`js/common.js`'s `dataUrlToObjectUrl()`, used by `js/main.js`'s unified feed + stories viewer and `js/journal.js`'s per-element feed): keep storing the video as a data URI string in `localStorage` as before, but at render time convert it to a `Blob`/`URL.createObjectURL()` object URL and use *that* as the `<video>`'s `src` — object URLs play fine on iOS. Images still use the data URI directly (no conversion needed). If you add a new place that renders a video from `mediaData`, route it through `dataUrlToObjectUrl()` too, not a raw data URI `src`. `dataUrlToObjectUrl()` returns `null` (never throws) on malformed/corrupted data — every caller must check for `null` and show a "corrupted, can't be played" fallback rather than assuming it always succeeds.
- **Boot steps must be isolated** (`runBootStep()` in `js/common.js`, used in `main.js`'s and `journal.js`'s `DOMContentLoaded` handlers): a thrown error in one render/init call (e.g. rendering a post with corrupted media) must not silently prevent *later* boot calls in the same handler from running — found 2026-06-21 when one corrupted story's render failure looked like it broke the (unrelated) story-viewer close button, because both lived in the same un-isolated `DOMContentLoaded` callback. Wrap any new top-level boot call in `runBootStep(fn)`.

---

## JavaScript Standards

```js
// ✅ Correct
const el = document.querySelector('.my-class');
el?.addEventListener('click', () => { ... });

// ❌ Wrong — no var, no jQuery, no callbacks without arrow functions
var el = $('.my-class');
el.click(function() { ... });
```

- Use `const` for values that don't change
- Use `let` only when reassignment is needed
- Use optional chaining `?.` to guard against null elements
- Use `querySelectorAll` + `forEach` instead of loops
- No `innerHTML` with unsanitized user input
- Modular: one function per responsibility

---

## CSS Standards

```css
/* ✅ Correct */
.btn-primary {
  background: var(--wood);
  border-radius: var(--radius-md);
  transition: all var(--transition);
}

/* ❌ Wrong — hardcoded values */
.btn-primary {
  background: #4caf50;
  border-radius: 8px;
  transition: all .2s;
}
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| HTML pages | `kebab-case.html` | `entry-detail.html` |
| CSS files | `kebab-case.css` | `dashboard.css` |
| JS files | `camelCase.js` | `elementCard.js` |
| Image assets | `kebab-case.ext` | `wood-icon.svg` |
| Folders | `kebab-case/` | `data/` |

---

## Browser/Runtime Support Target

| Runtime | Requirement |
|---------|-------------|
| Pi Browser | **Primary required target** — any Pi SDK feature must work here |
| Chrome / Edge | 90+ (for plain-browser UI development/testing) |
| Firefox | 88+ |
| Safari | 14+ |

> No IE11 support required.
