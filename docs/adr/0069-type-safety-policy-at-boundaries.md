# 0069 Type Safety Policy At Boundaries

- Status: accepted
- Date: 2026-05-09

## Context

External files, IndexedDB, URL hashes, and dynamic WASM modules are untrusted boundaries.

## Decision

Use `unknown` plus zod or explicit narrowing at data/state boundaries. Keep unavoidable dynamic import casts local to adapter modules. Do not introduce `any` in authored source.

## Consequences

Boundary code may be a little more verbose, but failures are localized.

## Alternatives Considered

Trusting parsed JSON because it came from this app was rejected; users can edit files.
