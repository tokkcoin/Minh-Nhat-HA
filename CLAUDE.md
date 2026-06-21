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
├── index.html              # Landing page — hero/showcase/how-it-works + the unified multi-element feed (composer + Stories-style filter row + combined feed)
├── journal.html             # Per-element journal (still works standalone via ?el=metal|wood|water|fire|earth, no longer linked from index.html)
├── chart-concepts.html      # Design-comparison page: 5 combo (bar+line) growth chart concepts
├── pi-test-payment.html     # One-off Mainnet U2A payment page for the Pi Developer Portal checklist (noindex, not linked from nav)
├── privacy-policy.html      # Public privacy policy (linked from Pi Developer Portal)
├── validation-key.txt       # Pi domain-ownership validation file (must stay at root, content from the portal)
├── CLAUDE.md                # Root-level AI context
├── css/style.css            # All styles
├── js/
│   ├── common.js              # Shared helpers (showToast, initPiSdk) + shared post model (ELEMENTS, PRIORITY_LEVELS, loadElementPosts/saveElementPosts, timeAgo, escapeHtml, readFileAsDataUrl) — loaded on every page
│   ├── main.js                 # index.html boot: How-it-works preview + unified composer/stories-row/feed
│   ├── journal.js              # journal.html: per-element composer, feed, like/delete (uses common.js's shared post model)
│   ├── chartConcepts.js        # chart-concepts.html: builds weekly post-count series (real or demo) and renders the 5 chart designs
│   ├── piPayment.js            # pi-test-payment.html: authenticate -> createPayment -> server approve/complete flow
│   └── piAuth.js               # index.html only: Pi.authenticate (username scope) -> /api/verify-auth -> session cookie
├── api/                     # Vercel serverless functions — deliberate, scoped exception to the static/no-backend rule (see tech-defaults.md)
│   ├── approve-payment.js     # POST: server-side U2A payment approval (uses PI_API_KEY env var)
│   ├── complete-payment.js    # POST: server-side U2A payment completion (uses PI_API_KEY env var)
│   └── verify-auth.js         # POST: validates a Pi accessToken via GET /v2/me, issues a signed session cookie (uses SESSION_SECRET env var)
├── data/                    # Script-loaded static data files (see .claude/agents/researcher.md) — NOT user content
└── .claude/                 # Claude Configuration Folder
    ├── CLAUDE.md           # Project identity & guidelines
    ├── CLAUDE.local.md     # Developer overrides (not in git)
    ├── settings.json       # AI preference settings
    ├── settings.local.json # Local settings (not in git)
    ├── memory.md            # Persistent log of decisions and history
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
