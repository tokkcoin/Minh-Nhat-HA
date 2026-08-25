# design.md — Design System Rules

> Claude must follow these design rules for ALL visual changes to this project.
> Never deviate from these tokens without explicit user instruction.
>
> ⚠️ 2026-06-18: confirmed dark-theme direction (see `.claude/memory.md`) — replaces the
> earlier light starter palette. Element accent colors were brightened so they read
> clearly on a near-black background.

---

## Color Palette (CSS Custom Properties)

Each of the five elements gets a base + tint variant (now an rgba overlay instead of a
separate pastel hex, since flat light tints don't read well on a dark background).

| Token | Value | Element / Meaning |
|-------|-------|------|
| `--metal` | `#e0b84d` | Metal — Money / Finance |
| `--metal-tint` | `rgba(224,184,77,.12)` | Metal hover/highlight backgrounds |
| `--wood` | `#5fd068` | Wood — Health |
| `--wood-tint` | `rgba(95,208,104,.12)` | Wood hover/highlight backgrounds |
| `--water` | `#4dabf7` | Water — Talent / Skills |
| `--water-tint` | `rgba(77,171,247,.12)` | Water hover/highlight backgrounds |
| `--fire` | `#ff6b5b` | Fire — Mood / Emotion |
| `--fire-tint` | `rgba(255,107,91,.12)` | Fire hover/highlight backgrounds |
| `--earth` | `#c9a079` | Earth — Situation / Circumstances |
| `--earth-tint` | `rgba(201,160,121,.12)` | Earth hover/highlight backgrounds |
| `--accent-gradient` | `linear-gradient(135deg, var(--fire), var(--metal))` | Gradient text/accents (hero highlight word, badges) |
| `--danger` | `#e74c3c` | Error messages only |
| `--success` | `#27ae60` | Success states, confirmations |
| `--text-primary` | `#f5f5f5` | Headings, important labels |
| `--text-secondary` | `#a3a3a3` | Body text, descriptions |
| `--text-muted` | `#6b6b6b` | Disabled items, placeholders |
| `--bg-page` | `#0a0a0a` | Page/body background |
| `--bg-card` | `#141414` | Cards, panels, modals |
| `--bg-card-hover` | `#1c1c1c` | Card hover state |
| `--border` | `#2a2a2a` | All borders and dividers |

> ⚠️ Never use hardcoded hex values — always reference the CSS variables above.
> When in doubt about which element a piece of UI belongs to, ask rather than guessing.

---

## Typography

- **Body font**: `'Inter', sans-serif` (loaded from Google Fonts)
- **Display/headline font**: `'Fraunces', serif` (loaded from Google Fonts) — used only for large hero/section headlines, mirroring the editorial-serif treatment from the Resend-style reference. Never use it for body copy or UI labels.
- **Base size**: `14px`
- **Scale**: 10 / 12 / 13 / 13.5 / 14 / 15 / 16 / 18 / 20 / 22 / 24 / 32 / 48 / 56px (the last three are hero-only display sizes)

---

## Spacing System

| Token | Value |
|-------|-------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `40px` |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Small badges, inner elements |
| `--radius-md` | `8px` | Buttons, dropdowns, cards |
| `--radius-lg` | `12px` | Main panels, modals |
| `--radius-xl` | `20px` | Toasts, pill badges |

---

## Shadow System

| Token | Usage |
|-------|-------|
| `--shadow-sm` | Default card resting shadow |
| `--shadow-md` | Dropdowns, floating elements |
| `--shadow-lg` | Modals, toasts |

---

## Transitions

- Default: `all .2s ease` (`--transition`)
- Spring/bounce: `cubic-bezier(.34,1.56,.64,1)` — for modals, toasts

---

## Component Rules

### Element Cards
- Each of the 5 dashboard cards uses its own element's `--<element>` color for its accent border/icon, never another element's color
- `background: var(--bg-card)`, `border: 1px solid var(--border)`, `box-shadow: var(--shadow-sm)`
- Hover background uses that element's `--<element>-tint` rgba overlay, not a flat hex

### Buttons
- Primary action button: white/near-black solid fill (`--text-primary` background, `--bg-page` text) — matches the high-contrast pill-button look of the dark reference, not a single element color
- Outline/secondary: transparent background, `border: 1.5px solid var(--border)`, `var(--text-secondary)` text
- All buttons: `font-weight: 600`, `border-radius: var(--radius-md)` (pill-shaped CTAs may use `--radius-xl`)

### Hero / Marketing Sections
- Reserve `'Fraunces'` display font strictly for the hero `h1` and major section `h2`s — everything else stays Inter
- Use `var(--accent-gradient)` (Fire → Metal) sparingly, on one highlighted word/phrase per section at most, applied via `background-clip: text`
- Badges/pills (e.g. the hero announcement pill) use `border: 1px solid var(--border)`, `background: var(--bg-card)`, `border-radius: var(--radius-xl)`

---

## Weapon Rarity Tiers (feasibility prototype, `weapon-prototype.html`)

> ⚠️ New system, added 2026-07-26 for a standalone feasibility demo — not yet wired into
> the main app. See `.claude/memory.md` (2026-07-26) for the full rationale.

Reuses `skills.js`'s existing 5 star thresholds as rarity tiers, so no new data model —
same `totalSeconds` per skill, just a different visual treatment.

| Tier | Hours | Token | Usage |
|------|-------|-------|-------|
| Chưa rèn luyện | < 5h | `var(--border)` / `var(--text-muted)` (no new token) | Dim, grayscale icon, plain border |
| Sơ cấp | 5h+ | `--tier-bronze` `#a9754f` | |
| Rèn luyện | 35h+ | `--tier-silver` `#c7ccd1` | |
| Thành thạo | 150h+ | `--tier-gold` `#e6c15c` | Soft glow via `--tier-gold-tint` |
| Tinh anh | 365h+ | `--tier-epic` `#b98cff` | Stronger glow via `--tier-epic-tint` |
| Huyền thoại | 500h+ | `--tier-legendary` `#ffd447` | Rotating conic-gradient ring + pulsing icon — **explicit exception** to the "no animation > 1.5s" rule below, same precedent as the hero orbit nodes (earned/rare state, not a default) |

These tier colors are deliberately distinct from the 5 element colors (`--metal`/`--wood`/etc.)
— a skill's rarity tier is not tied to which of the 5 elements it belongs to.

## Do NOT
- ❌ Use Tailwind utility classes
- ❌ Use hardcoded colors outside of `:root` definitions
- ❌ Mix an element's color onto a different element's card/icon
- ❌ Use `px` for font-sizes not on the approved scale
- ❌ Use the `'Fraunces'` display font for body copy, buttons, or UI labels
