# Phase 3 Output Pathway Audit

Audit date: 2026-05-09

| Output pathway        | Status before Phase 3 | Evidence                                             | Decision                                     |
| --------------------- | --------------------- | ---------------------------------------------------- | -------------------------------------------- |
| Local dashboard save  | Works fully           | `Save` writes to IndexedDB and restore runs on load. | Keep and test.                               |
| Clear local state     | Works fully           | `Reset` clears IndexedDB and in-memory state.        | Keep and test.                               |
| Dashboard tiles       | Works fully           | Add/remove tile works on query results.              | Keep and test.                               |
| CSV result export     | Not built             | No download control.                                 | Add export for current result.               |
| JSON result export    | Not built             | No download control.                                 | Add export for current result with metadata. |
| Copy SQL              | Not built             | No clipboard action.                                 | Add.                                         |
| Copy result CSV       | Not built             | No clipboard action.                                 | Add.                                         |
| Download state file   | Not built             | No portable dashboard bundle.                        | Add versioned `.browser-bi.json`.            |
| Import state file     | Not built             | See input audit.                                     | Add.                                         |
| Shareable URL         | Not built             | URL hash ignored.                                    | Add size-limited hash state.                 |
| Print-friendly output | Not built             | Browser print includes full chrome.                  | Add print stylesheet and print action.       |
| Screenshot export     | Not built             | No canvas/page screenshot.                           | Out of scope; browser print is enough.       |
| Embed code            | Not built             | No hosted immutable dashboard state.                 | Out of scope for static/local v2.            |
| API/curl-ready output | Not built             | No backend API by design.                            | Provide SQL/CSV/JSON exports instead.        |

Before Phase 3: green 3, yellow 0, red 11.
