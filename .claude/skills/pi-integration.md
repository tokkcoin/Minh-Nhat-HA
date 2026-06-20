# Skill: Pi Network Integration (Placeholder Template)

This is a placeholder template skill representing integration with the Pi Network SDK — authentication and payments inside the Pi Browser.

## Purpose
Demonstrate the configuration schema for tool-use files inside the `.claude/skills/` folder, scoped to this project's actual external integration (Pi Network), rather than a generic unrelated example.

## Capabilities (not yet implemented — describes intended shape)
- Authenticate the current user via `Pi.authenticate(scopes, onIncompletePaymentFound)`.
- Request a Pi payment via `Pi.createPayment({ amount, memo, metadata }, callbacks)` for any future premium feature.
- Read back the authenticated user's Pi username/UID for personalizing the dashboard.

## Guardrails
- Every capability above must check `window.Pi` exists before calling it.
- `sandbox: true` stays on until the user explicitly says this is going to production.
- No payment flow should be built before the user has actually asked for a paid feature — this file documents the *shape* of the integration, not a commitment to build it yet.
