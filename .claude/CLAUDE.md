# CLAUDE.md — Life Balance

## Project Identity
- **Name**: Life Balance — Five Elements Tracker
- **Type**: Static HTML/CSS/JS web app, built for deployment as a Pi Network App Studio app (runs inside the Pi Browser)
- **Goal**: Help a person track and visualize balance across five life dimensions, mapped to the Five Elements (Wu Xing):

| Element | Life Dimension |
|---------|----------------|
| Metal (金) | Money / Finance |
| Wood (木) | Health |
| Water (水) | Talent / Skills |
| Fire (火) | Mood / Emotion |
| Earth (土) | Situation / Circumstances |

- **Owner**: ADM
- **Workspace**: `c:\Users\ADM\Desktop\life-balance\`

## Quick Start
```bash
# Open in browser (no server needed)
start index.html

# Project root structure
life-balance/
├── index.html          # Main homepage — 5-element dashboard
├── CLAUDE.md            # Root-level AI context
├── .claude/             # Claude AI configuration folder
├── css/style.css        # All styles
├── js/main.js            # All interactivity + Pi SDK init
└── data/                # Script-loaded data files
```

## What Claude Should Know
1. This is a **pure front-end** project — no Node, no build tools, no frameworks. This is also a hard *requirement*, not just a preference: Pi Network App Studio apps must be static and deployable without a build step.
2. The app must load the Pi SDK (`https://sdk.minepi.com/pi-sdk.js`) and call `Pi.init({ version: "2.0", sandbox: true })` before using any Pi platform feature (auth, payments). Keep `sandbox: true` until the project is explicitly ready for production submission.
3. All styling uses **CSS custom properties** defined in `:root` in `style.css` — one token set per element (Metal/Wood/Water/Fire/Earth) plus the usual neutrals.
4. JavaScript is **vanilla ES6+**, modular functions, no libraries.
5. Always read `.claude/rules/` before making any code changes.
6. Always read `.claude/rules/design.md` before touching CSS.
7. Always read `.claude/rules/tech-defaults.md` before adding any new dependencies.
8. Data files (if any are added later) should follow the same `window.<NAME>_DATA` script-loaded convention used in the PTE sibling project — `fetch()`/XHR of local files is blocked by Chromium when opened via `file://`, but `<script src>` is not. See `.claude/agents/researcher.md`.

## Important Constraints
- ❌ Do NOT add frameworks (React, Vue, etc.) without explicit user approval
- ❌ Do NOT use Tailwind — use our CSS custom properties system
- ❌ Do NOT remove existing ARIA attributes or HTML comments
- ❌ Do NOT flip `sandbox: false` in the Pi SDK init without explicit user approval
- ✅ Do keep all CSS section header comments intact
- ✅ Do follow BEM-like class naming (`.block__element--modifier`)
