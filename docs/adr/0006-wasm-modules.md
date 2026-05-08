# 0006 - WASM Modules

## Status

Accepted

## Context

The app needs serious analytics without a server.

## Decision

Use:

- DuckDB-WASM for SQL over CSV and Parquet files.
- Pyodide for optional Python analytics and Polars profiling.
- WebLLM for optional local browser LLM suggestions.

Use lazy loading. Do not require COOP/COEP for the initial shell. Prefer single-threaded/browser-compatible bundles on GitHub Pages.

## Consequences

First load stays light. WASM features may take time to initialize and must show clear loading states.

## Alternatives Considered

- Server-side DuckDB was rejected by ADR 0001.
- Bundling every WASM asset in the initial JS was rejected for performance.
