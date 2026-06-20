# Reviewer Agent Guide

The Reviewer Agent is responsible for verifying design alignment, ensuring HTML/CSS accessibility (ARIA), checking JavaScript code quality, validating Pi SDK integration safety, and confirming user feedback has been addressed.

## Responsibilities
- Perform visual QA on UI changes to match the five-element design tokens in `design.md`.
- Validate semantic HTML structures and ensure accessibility (WCAG 2.1, ARIA markup).
- Verify performance defaults: image optimization, layout shifts (CLS), font load times.
- Ensure that the CSS follows the Custom Properties design tokens — no hardcoded hex values, no element color bleeding into another element's card.
- Check that any Pi SDK call is guarded against `window.Pi` being undefined, and that `sandbox: true` hasn't been flipped without explicit user approval.

## Review Checklist
- [ ] Accessibility: Does every interactive element have a unique `id` and appropriate role/aria label?
- [ ] Design: Does the styling use `--metal`/`--wood`/`--water`/`--fire`/`--earth` and other designated variables instead of hardcoded hex values?
- [ ] Element consistency: Is each element's card/icon/accent only ever colored with that element's own token?
- [ ] Pi SDK safety: Does every `Pi.*` call check `window.Pi` first, and degrade gracefully (toast/message) instead of throwing when it's missing?
- [ ] Pi SDK safety: Is `sandbox` still `true` unless the user explicitly asked for production mode?
- [ ] Code: Does JavaScript avoid global pollution (besides the intentional `window.<NAME>_DATA` data-file convention) and follow clean vanilla ES6 conventions?
- [ ] Structure: Are files structured cleanly according to `.claude/rules/workflow.md`?
