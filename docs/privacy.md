# Privacy

Browser BI Studio has no analytics.

## What Is Collected

Nothing is collected by this app. It does not send imported datasets, dashboard state, prompts, chart definitions, or query results to a project server.

## External Requests

The app may request public static assets when the user opts into a feature:

- DuckDB-WASM bundles for local SQL.
- Pyodide packages for local Python / Polars profiling.
- Public model artifacts for sentence-transformer embeddings or WebLLM.
- The public GitHub API for the latest commit on `main`.

## Local Storage

Dashboard state and settings are saved in IndexedDB on the user's device when autosave is enabled or when the user presses Save. The Reset button clears the app's saved dashboard state. The user can also clear browser site data to remove all local app storage.

Exported CSV, JSON, and `.browser-bi.json` files are created only after the user presses an export button.
