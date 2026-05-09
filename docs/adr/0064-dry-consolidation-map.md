# 0064 DRY Consolidation Map

- Status: accepted
- Date: 2026-05-09

## Context

Export, clipboard, and state serialization are cross-cutting and easy to duplicate.

## Decision

Create canonical modules for export serialization and state bundles. UI handlers call those modules instead of building Blobs or JSON inline.

## Consequences

Output tests can assert one source of truth. Future exports should extend the module, not `App.tsx`.

## Alternatives Considered

Leaving serialization in React handlers was rejected because Phase 3 adds several output paths.
