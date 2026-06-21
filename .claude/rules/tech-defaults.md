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
- **Scope of the exception**: originally these two payment endpoints; `api/verify-auth.js` (below) is a third, and `api/cloudinary-sign.js` (further below) a fourth, deliberately added one. Don't add further server-side features without going back to the user.

### Sign-in with Pi (`api/verify-auth.js`)

- Client (`js/piAuth.js`, wired into `index.html` only) calls `Pi.authenticate(['username'], onIncompletePaymentFound)`, then POSTs the resulting `accessToken` to `/api/verify-auth`.
- The server validates it via `GET https://api.minepi.com/v2/me` with `Authorization: Bearer <accessToken>` — this does **not** need `PI_API_KEY` (that key is only for the app-initiated payments endpoints).
- No database: a session is just a `{uid, username, iat}` payload HMAC-signed with a second secret, `SESSION_SECRET` (also a Vercel env var, same rules as `PI_API_KEY` — never committed), set as an HttpOnly cookie. There's nowhere to log out yet (not built — no logout flow exists).
- `js/common.js`'s `initPiSdk()` is memoized (`piInitPromise`) specifically so `Pi.init()` is only ever called once and is fully awaited before any `Pi.authenticate()` call, even though both `main.js` and `piAuth.js` independently call `initPiSdk()` on `index.html`.
- **Mainnet, not testnet**: this app's Pi Developer Portal entry is on Mainnet — `pi-test-payment.html` sends a real (small) amount of Pi. The user explicitly confirmed this is intentional (2026-06-21) when this was built — see `.claude/memory.md`.

---

## Media Storage — Cloudinary (deliberate exception to "no backend")

Photo/video/audio attachments (journal posts, stories) used to be stored as base64 data URIs inside `localStorage`, capped at 4MB/file by `localStorage`'s shared ~5-10MB origin quota. As of 2026-06-21 they upload to **Cloudinary** (free plan) instead — see `.claude/memory.md` for the full decision trail (why NCS/Vercel Blob/Supabase were considered and Cloudinary was picked).

- **`api/cloudinary-sign.js`**: a fourth Vercel serverless function (same zero-config pattern as the Pi payment endpoints). It issues a short-lived signed-upload signature (`timestamp` + HMAC-SHA1 signature) — the file itself is **never sent to this function**, only the tiny JSON signature is. The browser then POSTs the file directly to `https://api.cloudinary.com/v1_1/<cloud>/auto/upload`, so large videos never hit Vercel's request-body size limit.
- **Secrets**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — three Vercel project Environment Variables, same rules as `PI_API_KEY`/`SESSION_SECRET` (never hardcoded, never committed). Only `CLOUDINARY_API_SECRET` is truly sensitive (used for the HMAC); cloud name/API key are not secret but are still kept server-side for simplicity since the client never needs to know them ahead of time.
- **Client helper**: `uploadMediaToCloudinary(file)` in `js/common.js` — fetches the signature, then uploads. Throws on failure; every caller (`js/journal.js`'s composer, `js/main.js`'s unified composer, `js/storyEditor.js`'s `commitStoryFromEditor`) wraps it in try/catch, disables the Post button and shows a toast while uploading, and re-enables it with an error toast on failure (matches the `safeSetItem` fail-loud pattern already used for `localStorage`).
- **Size limits now match Cloudinary's free-plan caps, not `localStorage`'s**: `MAX_IMAGE_BYTES` = 10MB, `MAX_VIDEO_BYTES` = 100MB (covers audio too — Cloudinary's `video` resource type). See `maxBytesForFile(file)` in `common.js`. Don't raise these without checking Cloudinary's plan limits first — they'll start rejecting uploads with a 4xx, not fail gracefully on our side.
- **Stories edit the original `File` before any upload happens** (`js/storyEditor.js`): the editor previews via a plain `URL.createObjectURL(file)`, never base64. The file only gets uploaded to Cloudinary on commit (Post button), not when the editor opens — so an abandoned/cancelled edit costs zero uploads.
- **Posts/stories still persist in `localStorage`** — only the *content* of `mediaData` changed, from a multi-MB base64 string to a short `https://res.cloudinary.com/...` URL string. This incidentally also resolves most of the old quota-pressure problem from the previous section, since media no longer counts against the 5-10MB `localStorage` quota at all.
- **Old posts created before this change still have base64 data URIs in `mediaData`** — not migrated. `dataUrlToObjectUrl()` in `common.js` handles both: it only runs the base64→Blob conversion when the string starts with `data:`; a Cloudinary URL (or any other real URL) passes through unchanged.

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

## User-Generated Content (Journal) — single-device post records, Cloudinary-hosted media

The per-element journal (`journal.html`, `js/journal.js`) is **single-user, single-device** for the post *records* (still no accounts, no cross-device sync) — see `.claude/memory.md` (2026-06-18) for that original decision. Media attachments themselves are no longer local-only — see the "Media Storage — Cloudinary" section above for the 2026-06-21 change.

- Posts persist via `localStorage`, keyed `lifebalance_journal_<element>` (one array of post objects per element), **not** the `window.X_DATA` static-seed-data convention above — that pattern is for read-only shipped content, this is runtime user data.
- Photo/video/audio attachments upload to Cloudinary via `uploadMediaToCloudinary()`; only the resulting `https://res.cloudinary.com/...` URL is stored in the post's `mediaData` field — `localStorage` can only hold strings, and a URL is a far smaller string than a base64 data URI.
- `localStorage` itself still has a small total quota (~5-10MB per origin), but post records without embedded media are tiny — quota pressure is now a near-non-issue. `safeSetItem()` is still the required save path (fails loudly via toast on the rare case quota is hit from sheer post-record volume) — don't call `localStorage.setItem()` directly.
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
