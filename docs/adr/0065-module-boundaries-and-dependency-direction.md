# 0065 Module Boundaries And Dependency Direction

- Status: accepted
- Date: 2026-05-09

## Context

`App.tsx` has become the largest module and owns too many workflow details.

## Decision

Keep dependency direction UI -> feature modules -> domain types. Add feature modules for import/export/persistence helpers where Phase 3 needs them. Do not introduce a broad framework abstraction.

## Consequences

The app remains simple, but new behavior gets colocated by responsibility.

## Alternatives Considered

A full state-machine rewrite was rejected as an architecture change outside Phase 3.
