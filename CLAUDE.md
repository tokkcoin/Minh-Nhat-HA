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
├── index.html              # Landing page — hero/showcase/how-it-works + the 5-element dashboard
├── journal.html             # Per-element journal (shared page, themed via ?el=metal|wood|water|fire|earth)
├── chart-concepts.html      # Design-comparison page: 5 combo (bar+line) growth chart concepts
├── CLAUDE.md                # Root-level AI context
├── css/style.css            # All styles
├── js/
│   ├── common.js              # Shared helpers (showToast, initPiSdk) — loaded on every page
│   ├── main.js                 # index.html boot
│   ├── journal.js              # journal.html: composer, feed, like/delete, localStorage persistence
│   └── chartConcepts.js        # chart-concepts.html: builds weekly post-count series (real or demo) and renders the 5 chart designs
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
