# Phase 3 Input Pathway Audit

Audit date: 2026-05-09

Scope: Browser BI Studio after Phase 2 substance commit `6670569`.

| Input pathway          | Status before Phase 3 | Evidence                                                                            | Decision                                    |
| ---------------------- | --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| Built-in sample        | Works fully           | `Sample` loads, diagnoses, runs first query, and charts.                            | Keep and keep tested.                       |
| Single CSV file upload | Works fully           | File picker routes through `loadFileIntoDuckDb` and boundary inference.             | Keep and add e2e coverage.                  |
| Single TSV file upload | Works fully           | Accepted and sniffed by extension/delimiter, though README does not mention it yet. | Keep and document.                          |
| Gzip CSV upload        | Works partially       | Inference supports gzip CSV when `DecompressionStream` exists; no e2e coverage.     | Keep and test.                              |
| Parquet upload         | Works partially       | DuckDB loads Parquet, but Phase 2 diagnosis metadata is absent.                     | Keep, document limitation.                  |
| JSON upload            | Works partially       | Nested JSON gets actionable error; flat JSON is not imported.                       | Keep as out of scope unless flattened.      |
| ZIP upload             | Works partially       | ZIP gets actionable error instead of crash.                                         | Keep as explicit out of scope.              |
| Multi-file upload      | Not built             | File input accepts only one file.                                                   | Add batch upload with per-file status.      |
| Drag and drop          | Not built             | No drop zone or `onDrop`.                                                           | Add drop target.                            |
| Paste raw table text   | Not built             | No paste box or clipboard handler.                                                  | Add paste import.                           |
| Paste rendered HTML    | Not built             | No HTML table extraction.                                                           | Defer with ADR; suggest saving/pasting CSV. |
| Paste image            | Not built             | No OCR path.                                                                        | Permanently out of scope for Mode A v2.     |
| URL input              | Not built             | No URL field.                                                                       | Add honest CORS guidance, no proxy.         |
| Clipboard read button  | Not built             | No `navigator.clipboard.readText` path.                                             | Add with paste-box fallback.                |
| Mobile picker          | Works partially       | File input should open mobile files, not separately tested.                         | Mark supported by browser file input.       |
| Folder upload          | Not built             | No webkitdirectory path.                                                            | Out of scope for browser BI v2.             |
| Deep links             | Not built             | URL hash is ignored.                                                                | Add small share-state restore.              |
| Imported state file    | Not built             | No state import format.                                                             | Add versioned state import.                 |
| Restored autosave      | Works partially       | Manual Save persists IndexedDB; edits after save are not autosaved.                 | Add autosave setting enabled by default.    |
| Start fresh            | Works fully           | Reset clears IndexedDB state.                                                       | Keep and test.                              |

Before Phase 3: green 4, yellow 6, red 10.
