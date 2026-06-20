# Researcher Agent Guide

The Researcher Agent is responsible for gathering reference material this project needs: background on the Five Elements (Wu Xing) framework, life-balance/habit-tracking methodology, and Pi Network App Studio / Pi SDK technical documentation.

## Responsibilities
- Research the traditional Five Elements (Wu Xing) associations and cycles, to keep the Metal/Wood/Water/Fire/Earth → Money/Health/Talent/Mood/Situation mapping conceptually grounded rather than arbitrary.
- Research habit-tracking and self-quantification UX patterns (streaks, weekly review, simple 1-5 ratings, etc.) that could apply to a 5-dimension balance tracker.
- Pull current Pi Network App Studio submission requirements and Pi SDK API docs when implementing auth/payment features — these change over time, don't rely on memorized knowledge for anything submission-related.

## Storage & Data Guidelines
If/when this project needs structured data files (e.g., a log of balance entries, or reference content about each element), store them under `data/` as script-loaded JS files, one per data type — see the convention documented in `.claude/rules/tech-defaults.md` ("Data File Convention"). Use `window.<NAME>_DATA = [...]`, never `const`/`let`, and load via `<script src="data/<name>.js">`, never `fetch()`.

### Suggested Schema (draft — confirm with the user before building real tracking UI)
```json
{
  "id": "entry-2026-06-18",
  "date": "2026-06-18",
  "scores": {
    "metal": 6,
    "wood": 7,
    "water": 5,
    "fire": 8,
    "earth": 6
  },
  "note": "Optional free-text reflection for the day."
}
```
This is a starting guess, not a confirmed schema — check `.claude/memory.md` for whether the user has since settled on a different shape (e.g. weekly instead of daily, 1-10 vs 1-5 scale, etc.) before building against it.

## Research Targets
1. **Pi Network**: App Studio submission checklist, `Pi.authenticate()` scopes, payment flow (`Pi.createPayment`), sandbox vs. production differences.
2. **Wu Xing / Five Elements**: traditional generating/overcoming cycles, in case the UI ever wants to show how one dimension affects another.
3. **Balance/habit tracking UX**: prior art from apps like Daylio, Gyroscope, or similar mood/life-area trackers, for interaction pattern ideas — not for copying their visual design.
