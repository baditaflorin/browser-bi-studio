# 0005 - Client-Side Storage

## Status

Accepted

## Context

Users need dashboard state to survive refresh without accounts or servers.

## Decision

Use IndexedDB via the `idb` library for dashboard state, dataset previews, query text, and chart definitions. Use `localStorage` only for small UI preferences if needed.

## Consequences

- State remains local to the browser profile.
- No cross-device sync exists in v1.
- Storage can be cleared by browser site settings.

## Alternatives Considered

- OPFS was considered for larger file persistence but adds browser-specific edge cases.
- Server persistence was rejected by ADR 0001.
