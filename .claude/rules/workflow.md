# workflow.md — Development Workflow Rules

> Claude must follow these workflow steps for all code changes in this project.

---

## Before Any Change

1. **Read** `.claude/memory.md` — check past decisions relevant to the task
2. **Read** the relevant rule file (`design.md` for CSS, `tech-defaults.md` for dependencies)
3. **Understand** the existing file structure before adding new files
4. **Plan** changes — list files to modify before touching anything

## Making Changes

### HTML changes
- Preserve all `<!-- comment -->` section headers
- Keep ARIA attributes (`role`, `aria-*`, `tabindex`) intact
- New interactive elements must have unique `id` attributes
- Use semantic elements: `<nav>`, `<main>`, `<section>`, `<aside>`, `<footer>`

### CSS changes
- Add new styles at the END of the relevant section, or create a new section
- Keep the section comment headers (e.g., `/* ── 5. Element Cards ── */`)
- Never use `!important` unless overriding a third-party style
- Always use CSS custom properties (`var(--...)`) for colors and spacing

### JS changes
- Add new functions following the `// ── N. Function Name ──` comment style
- Call new functions inside `DOMContentLoaded` at the bottom
- Never use `var` — only `const` and `let`
- Log errors with `console.warn()` not `console.log()` in production code
- Guard every `Pi.*` SDK call so it doesn't throw when `window.Pi` is undefined (e.g. running in a plain browser instead of the Pi Browser)

## After Changes

1. **Test** in the browser — open `index.html` directly
2. **Check** responsiveness at 1024px, 768px, 480px widths
3. If the change touches Pi SDK features, **test** in the Pi Browser sandbox, not just a regular browser
4. **Update** `.claude/memory.md` with any new decisions made
5. **Update** `CLAUDE.md` at the root if file structure changed

## Git Workflow (when applicable)
```bash
git add .
git commit -m "type: short description of change"
# Types: feat / fix / style / docs / refactor
```
