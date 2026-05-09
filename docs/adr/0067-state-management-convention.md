# 0067 State Management Convention

- Status: accepted
- Date: 2026-05-09

## Context

The app is small enough for local React state, but persistence and share/import need discipline.

## Decision

Keep `DashboardState` as the canonical app state. UI-only preferences live in a separate persisted settings object. Long-running operations use the existing token guard. Activity events record user-visible changes.

## Consequences

State export/import has a single canonical shape. Settings do not pollute dashboard bundles unless explicitly included.

## Alternatives Considered

Adding Redux/Zustand was rejected because current state complexity does not justify a new dependency.
