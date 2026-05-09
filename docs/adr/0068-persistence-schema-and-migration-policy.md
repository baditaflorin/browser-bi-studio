# 0068 Persistence Schema And Migration Policy

- Status: accepted
- Date: 2026-05-09

## Context

IndexedDB currently validates state shallowly and has no explicit migration story.

## Decision

Persist dashboard state version 1 and settings version 1. Validate state bundles and IndexedDB loads with zod schemas. Future breaking changes add migrations rather than silently dropping state.

## Consequences

Old v1 state remains loadable. Bad imported state is rejected with an actionable error.

## Alternatives Considered

Blindly casting persisted JSON was rejected because import/export makes persistence a user-facing boundary.
