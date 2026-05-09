# Phase 3 Plan

Priority is ranked by real-user impact on the audited end-to-end workflow.

| Rank | Catalog item | Work                                                           | Success check                                                 |
| ---- | ------------ | -------------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | 1, 2         | Add drag/drop file import using the existing inference router. | Dropping CSV imports and runs first query.                    |
| 2    | 1, 4         | Add multi-file batch import with per-file status.              | Multiple files report success/errors; last success is loaded. |
| 3    | 6            | Add clipboard read with permission fallback.                   | Clipboard CSV imports or explains permission denial.          |
| 4    | 1            | Add paste table text import.                                   | Pasted CSV/TSV imports without file picker.                   |
| 5    | 3            | Add URL guidance.                                              | URL path explains CORS and suggests paste/download.           |
| 6    | 8, 38        | Add autosave setting and default autosave.                     | Reload restores recent work without manual Save.              |
| 7    | 11, 41       | Add downloadable dashboard state file.                         | Export then import restores state.                            |
| 8    | 9            | Add CSV result export.                                         | Current result downloads as CSV.                              |
| 9    | 9            | Add JSON result export with metadata.                          | Current result downloads as versioned JSON.                   |
| 10   | 10           | Add copy SQL and copy CSV.                                     | Clipboard contains expected content.                          |
| 11   | 12           | Add size-limited share URL.                                    | Hash URL restores state when small.                           |
| 12   | 13           | Add print action and print CSS.                                | Print removes controls and keeps result/dashboard content.    |
| 13   | 18, 39       | Add settings panel with real persisted settings.               | Settings survive reload and affect behavior.                  |
| 14   | 15, 17       | Triage half-baked unsupported inputs.                          | ZIP/JSON/URL/image paths are explicit, not silent.            |
| 15   | 19, 42       | Update README/docs to tested reality.                          | Claims match shipped controls.                                |
| 16   | 20, 21       | Add canonical export/clipboard module.                         | No duplicated Blob/clipboard code in UI.                      |
| 17   | 22, 23       | Add canonical state bundle types/schema.                       | Import validates before applying.                             |
| 18   | 24           | Extract app workflow helpers where useful.                     | `App.tsx` shrinks and has fewer reasons to change.            |
| 19   | 28, 29       | Remove dead exports and keep TODO count zero.                  | `rg` finds no authored TODO/dead candidates.                  |
| 20   | 31, 32       | Apply one error/activity convention to actions.                | Import/export/copy errors use what/why/next-step.             |
| 21   | 35, 36       | Strengthen persistence boundary validation.                    | State import/load uses zod migration.                         |
| 22   | 43           | Verify quickstart and local build.                             | `make build`, `make test`, `make smoke` pass.                 |
| 23   | 46, 47       | Run stranger test and fix top three issues.                    | `docs/phase3/stranger-test.md` records before/after.          |

Enhancements selected: 23.
