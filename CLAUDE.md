# Life Balance — CLAUDE.md

Welcome to the **Life Balance** project context file.

## 🚀 Quick Start
To run the app locally:
```bash
# Open in default browser (no build server needed)
start index.html
```

To test inside the Pi Browser sandbox, see [.claude/rules/tech-defaults.md](file:///.claude/rules/tech-defaults.md).

---

## 📁 Project Directory Structure
All guidelines and configuration systems are managed under the `.claude/` directory to avoid duplicating information.

```
life-balance/
├── index.html              # Landing page — hero (orbiting element nodes, each links out to its own element page) + showcase/how-it-works + the unified multi-element feed (composer + Stories-style filter row + combined feed)
├── finance.html             # Metal element page — 4-pool allocation engine + "Thực tế" comparison panel + expense sheet overlay (extracted out of index.html)
├── health.html              # Wood element page — wuxia-MMO-style quest system (Main/Side/Daily/Weekly/Monthly quests, XP + levels)
├── mood.html                # Fire element page — "Tu Tâm" daily mind-cultivation checklist (shared js/dailyTasks.js widget, same pattern as the other 4 elements' daily quests)
├── skills.html              # Water element page — talent/skill building: icon-based skill badges with a 1-5 star proficiency level + per-skill notes/image "folder"
├── situation.html           # Earth element page — strategic "battle formation" board: goals/priorities placed in Thiên thời/Địa lợi/Nhân hoà zones
├── journal.html             # Per-element journal (still works standalone via ?el=metal|wood|water|fire|earth, no longer linked from index.html)
├── chart-concepts.html      # Design-comparison page: 5 combo (bar+line) growth chart concepts
├── pi-test-payment.html     # One-off Mainnet U2A payment page for the Pi Developer Portal checklist (noindex, not linked from nav)
├── privacy-policy.html      # Public privacy policy (linked from Pi Developer Portal)
├── validation-key.txt       # Pi domain-ownership validation file (must stay at root, content from the portal)
├── manifest.json            # PWA manifest — lets Pi Browser install the app
├── CLAUDE.md                # Root-level AI context
├── css/style.css            # All styles
├── js/
│   ├── common.js              # Shared helpers (showToast, initPiSdk, safeSetItem) + shared post model (ELEMENTS, PRIORITY_LEVELS, loadElementPosts/saveElementPosts, timeAgo, escapeHtml, uploadMediaToCloudinary, maxBytesForFile) — loaded on every page
│   ├── main.js                 # index.html boot: How-it-works preview + unified composer/feed + Stories tray (create/view/delete) + "Nhiệm vụ hôm nay" panel aggregating all 5 elements' daily quests
│   ├── characterPanel.js       # index.html only: home-page "character sheet" — Phân bổ values + 5 Ngũ Hành tab chips read real per-element data (finance pools/quest XP/skills/situation units); the abstract stat-grid/Sinh-Khắc block above it is still an interface-only mockup, clearly labeled as such
│   ├── storyEditor.js          # index.html only: CapCut-style Story editor overlay — filters, trim timeline, draggable text/sticker layers, music picker
│   ├── journal.js              # journal.html: per-element composer, feed, like/delete (uses common.js's shared post model)
│   ├── chartConcepts.js        # chart-concepts.html: builds weekly post-count series (real or demo) and renders the 5 chart designs
│   ├── financeRebalance.js     # finance.html: Metal/Money 4-pool allocation engine (invest/savings/selfDev/emergency), live Pi Network price via CoinGecko, ±5% rebalance warnings, "Thực tế" comparison panel + pie charts
│   ├── expenseSheet.js         # finance.html: full-screen monthly expense spreadsheet overlay (category/amount rows, auto-sum, feeds finance-expense input)
│   ├── health.js               # health.html: wuxia-MMO-style quest system — Main/Side/Daily/Weekly/Monthly quests with XP + levels (replaced an earlier "Kỷ luật thép" target/streak tracker)
│   ├── skills.js               # skills.html: icon-based skill badges (name + emoji icon picker + 1-5 star level), add/edit/delete; click a skill's icon to open a per-skill "folder" (notes + Cloudinary-uploaded images)
│   ├── situation.js             # situation.html: 3-zone strategic formation board (Thiên thời/Địa lợi/Nhân hoà), units moved between zones via ▲/▼, add/edit/delete
│   ├── mood.js                   # mood.html: "Tu Tâm" daily mind-cultivation checklist (thin wrapper around dailyTasks.js with seed tasks)
│   ├── dailyTasks.js            # Shared daily-quest checklist widget (initDailyChecklist) used by finance/skills/situation/mood.html — each page passes its own storageKey/seedTasks; health.html has its own richer quest system in health.js instead
│   ├── backupSync.js            # Loaded on every page (renamed from backup.js to defeat a stubborn Pi Browser cache): automatic cloud backup/restore of all localStorage data, keyed by Pi username, via Cloudinary
│   ├── piPayment.js            # pi-test-payment.html: authenticate -> createPayment -> server approve/complete flow
│   └── piAuth.js               # Loaded on every page: Pi.authenticate (username scope) -> /api/verify-auth -> session cookie; also re-establishes the username for backupSync.js on pages other than index.html
├── api/                     # Vercel serverless functions — deliberate, scoped exception to the static/no-backend rule (see tech-defaults.md)
│   ├── approve-payment.js     # POST: server-side U2A payment approval (uses PI_API_KEY env var)
│   ├── complete-payment.js    # POST: server-side U2A payment completion (uses PI_API_KEY env var)
│   ├── verify-auth.js         # POST: validates a Pi accessToken via GET /v2/me, issues a signed session cookie (uses SESSION_SECRET env var)
│   ├── cloudinary-sign.js     # POST: issues a signed upload signature for direct browser->Cloudinary uploads (uses CLOUDINARY_API_KEY/_SECRET/_CLOUD_NAME env vars)
│   └── cloudinary-sign-backup.js # POST: signed upload signature dedicated to the automatic backup flow in js/backupSync.js
├── data/                    # Script-loaded static data files (see .claude/agents/researcher.md) — NOT user content
├── audio/NCS/                # Self-hosted royalty-free music tracks used by the Story music picker (data/storyMusic.js)
└── .claude/                 # Claude Configuration Folder
    ├── CLAUDE.md           # Project identity & guidelines
    ├── CLAUDE.local.md     # Developer overrides (not in git)
    ├── settings.json       # AI preference settings
    ├── settings.local.json # Local settings (not in git)
    ├── memory.md            # Persistent log of decisions and history (summarized/interpreted)
    ├── ideas-raw.md         # Verbatim log of the user's own messages, unedited, chronological
    ├── rules/
    │   ├── workflow.md      # Rules for adding code & testing changes
    │   ├── design.md        # Full design system (colors, typography, styles)
    │   └── tech-defaults.md # Allowed tech stack & coding standards
    ├── agents/
    │   ├── researcher.md    # Guide for gathering balance/Pi SDK reference material
    │   └── reviewer.md      # Guide for reviewing code & design QA
    └── skills/
        └── pi-integration.md  # Skill configuration template for Pi Network features
```

---

## 🛠️ Development & Rules Reference
Please consult the specific files inside `.claude/rules/` for guidance:
- To style elements or check color tokens: see [.claude/rules/design.md](file:///.claude/rules/design.md)
- To check code conventions or dependencies: see [.claude/rules/tech-defaults.md](file:///.claude/rules/tech-defaults.md)
- Before making code changes or testing: see [.claude/rules/workflow.md](file:///.claude/rules/workflow.md)
- To see past design history and decisions: see [.claude/memory.md](file:///.claude/memory.md)
- To see the user's original wording behind any decision above: see [.claude/ideas-raw.md](file:///.claude/ideas-raw.md)
