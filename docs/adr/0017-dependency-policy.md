# 0017 - Dependency Policy

## Status

Accepted

## Context

The stack needs serious client-side analytics without custom low-level implementations.

## Decision

Use production-ready libraries:

- Vite, React, TypeScript, Tailwind CSS.
- DuckDB-WASM for SQL.
- Pyodide for Python/Polars.
- Plotly.js and Observable Plot for visualization.
- Hugging Face Transformers.js for sentence-transformer embeddings.
- WebLLM for optional local LLM execution.
- TanStack Query, Zod, idb, Papa Parse, Comlink, Lucide.

Run `npm audit` and avoid high/critical advisories.

## Consequences

The app inherits mature behavior and larger optional dependency chunks. Lazy loading is required.

## Alternatives Considered

- Hand-rolled CSV parsers, chart engines, vector search, and SQL engines were rejected.
