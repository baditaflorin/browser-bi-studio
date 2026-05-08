# Browser BI Studio

Live app: https://baditaflorin.github.io/browser-bi-studio/

Repository: https://github.com/baditaflorin/browser-bi-studio

Browser BI Studio is a fully client-side dashboard studio for local data exploration with WASM analytics, charts, embeddings, and local AI helpers.

## Why

Tableau Creator costs corporate teams about $900/year per user. Browser BI Studio tests the opposite premise: most v1 dashboard work can run from a static GitHub Pages app with user-owned files, browser storage, DuckDB-WASM, Pyodide, Plotly, Observable Plot, sentence-transformer embeddings, and optional local LLM assistance.

## Quickstart

```sh
npm install
make install-hooks
make dev
make build
make smoke
```

## What Works

- Load the sample sales dataset or import local CSV / Parquet data.
- Query data in-browser with DuckDB-WASM.
- Build dashboard tiles with Plotly charts and Observable Plot previews.
- Persist local dashboard state in IndexedDB.
- Use lazy AI helpers for semantic search, Polars profiling through Pyodide, and optional in-browser WebLLM suggestions.
- See the app version and current `main` commit on the live page.

## Architecture

```mermaid
C4Context
  title Browser BI Studio Context
  Person(analyst, "Analyst", "Builds dashboards from local files")
  System_Boundary(pages, "GitHub Pages static site") {
    Container(app, "React/Vite app", "TypeScript", "Dashboard builder and local state")
    ContainerDb(storage, "IndexedDB / OPFS", "Browser APIs", "Datasets, dashboards, preferences")
    Container(wasm, "WASM modules", "DuckDB, Pyodide", "SQL and Python analytics")
  }
  System_Ext(github, "GitHub", "Public repo, Pages hosting, latest commit API")
  Rel(analyst, app, "Uses in browser")
  Rel(app, storage, "Persists state locally")
  Rel(app, wasm, "Lazy-loads analytics engines")
  Rel(app, github, "Fetches public commit metadata")
```

More architecture detail: docs/architecture.md

ADRs: docs/adr/

Deployment guide: docs/deploy.md

Privacy notes: docs/privacy.md

## GitHub Pages

The production build is committed to `docs/` and served by GitHub Pages from the `main` branch.

Live URL: https://baditaflorin.github.io/browser-bi-studio/

## Security

No secrets belong in this project. The frontend never stores API keys, tokens, passwords, private keys, or hidden server credentials. Local files stay in the browser unless the user exports them.

Disclosure policy: SECURITY.md
