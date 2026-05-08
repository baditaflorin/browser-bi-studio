# 0014 - Error Handling Conventions

## Status

Accepted

## Context

WASM, file parsing, model loading, and IndexedDB can fail in browser-specific ways.

## Decision

Use typed result helpers where practical, React error boundaries for render failures, and user-facing error messages for failed operations. Never silently swallow import, query, storage, or model errors.

## Consequences

Errors remain understandable without server logs.

## Alternatives Considered

- Global console-only errors were rejected because users need visible recovery paths.
