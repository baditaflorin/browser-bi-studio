# 0002 - Architecture Overview And Boundaries

## Status

Accepted

## Context

The app needs to feel like a real dashboard builder while staying static-hosted.

## Decision

Use a feature-oriented frontend:

- `features/data` owns file import, schema inference, sample data, and DuckDB access.
- `features/dashboard` owns chart definitions, query state, tile rendering, and dashboard persistence.
- `features/ai` owns semantic search, Pyodide profiling, and optional local LLM suggestions.
- `lib` owns cross-cutting storage, version metadata, and utility functions.

## Consequences

Module boundaries keep heavy dependencies isolated and lazy. The application shell can load without the analytics engines.

## Alternatives Considered

- A single large UI module was rejected because it would make lazy loading and testing harder.
- A backend API boundary was rejected by ADR 0001.
