# Phase 3 Feature Claims Audit

Audit date: 2026-05-09

| Claim source        | Claim                                                                 | Status before Phase 3 | Decision                                                                               |
| ------------------- | --------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| README              | Fully client-side dashboard studio                                    | Shipped fully         | Keep.                                                                                  |
| README              | Local data exploration with WASM analytics                            | Shipped fully         | Keep.                                                                                  |
| README              | Load sample or import CSV / Parquet                                   | Shipped fully         | Keep and add TSV/gzip note.                                                            |
| README              | Query data with DuckDB-WASM                                           | Shipped fully         | Keep.                                                                                  |
| README              | Build dashboard tiles with Plotly and Observable Plot previews        | Shipped fully         | Keep.                                                                                  |
| README              | Persist local dashboard state in IndexedDB                            | Shipped partially     | Manual save only; README does not say autosave. Add autosave to make it more complete. |
| README              | AI helpers for semantic search, Pyodide profiling, WebLLM suggestions | Shipped partially     | Helpers exist; first-use downloads can fail. Document limitations.                     |
| README              | Version and current `main` commit on live page                        | Shipped fully         | Keep.                                                                                  |
| README architecture | IndexedDB / OPFS stores datasets, dashboards, preferences             | Shipped partially     | OPFS and preferences not present. Remove OPFS claim or add preferences.                |
| docs/data.md        | CSV, Parquet, sample supported                                        | Shipped fully         | Update to mention TSV/gzip and JSON/ZIP errors.                                        |
| docs/postmortem.md  | Export/import is next improvement                                     | True gap              | Implement now.                                                                         |

Before Phase 3: shipped fully 7, partial 3, not shipped 1.
