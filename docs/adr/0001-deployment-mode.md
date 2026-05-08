# 0001 - Deployment Mode

## Status

Accepted

## Context

The project should default to GitHub Pages and only use a backend if browser or build-time execution is insufficient. V1 needs local file import, dashboard creation, SQL analytics, charts, local persistence, embeddings, and optional local AI.

## Decision

Use Mode A: Pure GitHub Pages.

The app is a static React/Vite build committed to `docs/` and served from:

https://baditaflorin.github.io/browser-bi-studio/

Computation runs in the browser through DuckDB-WASM, Pyodide, browser JavaScript, Transformers.js, and optional WebLLM. Persistence uses IndexedDB. The frontend can call unauthenticated public URLs only.

## Consequences

- No backend, Docker, nginx, server metrics, or runtime secrets are needed.
- Heavy modules must be lazy-loaded to preserve first-load performance.
- Cross-device sync, private sharing, and enterprise auth are not v1 features.

## Alternatives Considered

- Mode B: unnecessary because v1 data is user-imported, not prebuilt.
- Mode C: rejected because no v1 feature requires server-side secrets, shared state, or privileged mutations.
