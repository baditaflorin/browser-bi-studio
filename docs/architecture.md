# Architecture

Browser BI Studio is Mode A: Pure GitHub Pages. The public surface is a static site hosted at:

https://baditaflorin.github.io/browser-bi-studio/

The repository is:

https://github.com/baditaflorin/browser-bi-studio

## Context

```mermaid
C4Context
  title Context
  Person(user, "Analyst", "Imports local data and builds dashboards")
  System(app, "Browser BI Studio", "Static GitHub Pages app")
  System_Ext(github, "GitHub", "Repository, Pages, public commit API")
  Rel(user, app, "Uses")
  Rel(app, github, "Loads static assets and commit metadata")
```

## Containers

```mermaid
C4Container
  title Containers
  Person(user, "Analyst")
  System_Boundary(browser, "User Browser") {
    Container(shell, "React shell", "TypeScript + Vite", "Dashboard UI")
    Container(worker, "Analytics modules", "DuckDB-WASM, Pyodide, Transformers.js, WebLLM", "Lazy-loaded compute")
    ContainerDb(indexeddb, "IndexedDB", "Browser storage", "Saved datasets and dashboards")
  }
  System_Ext(pages, "GitHub Pages", "Static hosting from main/docs")
  System_Ext(repo, "GitHub API", "Public commit metadata")
  Rel(user, shell, "Interacts with")
  Rel(shell, worker, "Runs SQL, profiling, embeddings, local AI")
  Rel(shell, indexeddb, "Persists local state")
  Rel(shell, pages, "Loads app assets")
  Rel(shell, repo, "Fetches latest commit")
```

## Boundaries

- No runtime backend exists.
- No authentication is required.
- Local user files remain in browser memory or IndexedDB unless exported by the user.
- Optional model downloads happen from public model CDNs only after the user starts an AI action.
