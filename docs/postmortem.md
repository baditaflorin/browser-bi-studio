# Postmortem

## What Was Built

Browser BI Studio v0.1.0 is a static GitHub Pages dashboard studio with local file import, DuckDB-WASM querying, Plotly and Observable Plot visualizations, IndexedDB persistence, and opt-in local AI helpers.

## Was Mode A Correct?

Yes. The v1 feature set did not need a runtime backend. Local files, local persistence, static hosting, browser WASM, and public model assets were enough.

## What Worked

- GitHub Pages could serve the app from `main/docs`.
- Heavy analytics and AI dependencies could stay lazy-loaded behind user actions.
- Public GitHub commit metadata solved the "show commit on page" requirement without embedding secrets.

## What Did Not Work

- The older Xenova Transformers package had critical dependency advisories, so the implementation moved to maintained Hugging Face Transformers.js.
- The final committed Pages build cannot know its own commit hash at build time, so the UI fetches the public latest `main` commit.

## Surprises

- A fully static setup still covers a meaningful subset of Tableau-like exploration.
- The asset budget depends heavily on keeping Plotly, Pyodide, DuckDB, Transformers, and WebLLM out of the initial bundle.

## Tech Debt Accepted

- No multi-dashboard library management yet.
- No full calculated-field language yet.
- No server-side sharing, governance, or collaboration.

## Next Three Improvements

1. Add dashboard export/import as a portable JSON bundle. Completed in v0.2.0 Phase 3.
2. Add calculated fields and reusable query snippets.
3. Add richer model selection for local LLM and embedding providers.

## Time Spent vs Estimate

Estimate: one focused implementation session for v0.1.0 scaffold and live Pages release.

Actual: one focused implementation session.
