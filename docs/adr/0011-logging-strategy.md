# 0011 - Logging Strategy

## Status

Accepted

## Context

There is no server-side runtime.

## Decision

Use minimal browser console logging in production. User-facing failures appear as inline messages or toasts. Development-only diagnostics may use `console.debug`.

## Consequences

No logs leave the user's browser.

## Alternatives Considered

- Client log collection was rejected for privacy and scope.
