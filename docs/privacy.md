# Privacy

Browser BI Studio has no analytics in v1.

## What Is Collected

Nothing is collected by this app. It does not send imported datasets, dashboard state, prompts, chart definitions, or query results to a project server.

## External Requests

The app may request public static assets when the user opts into a feature:

- DuckDB-WASM bundles for local SQL.
- Pyodide packages for local Python / Polars profiling.
- Public model artifacts for sentence-transformer embeddings or WebLLM.
- The public GitHub API for the latest commit on `main`.

## Local Storage

Dashboard state is saved in IndexedDB on the user's device. The user can clear browser site data to remove it.
