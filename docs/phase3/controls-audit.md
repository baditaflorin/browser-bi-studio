# Phase 3 Controls Audit

Audit date: 2026-05-09

| Control            | Status before Phase 3       | Finding                                                           | Decision                            |
| ------------------ | --------------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| Version badge      | Works fully                 | Opens current commit or commits page.                             | Keep.                               |
| Star link          | Works fully                 | Opens repository.                                                 | Keep.                               |
| Support link       | Works fully                 | Opens PayPal.                                                     | Keep.                               |
| Sample             | Works fully                 | Loads sample and first inferred chart.                            | Keep.                               |
| Import             | Works partially             | Single-file only; no batch/drop/paste.                            | Finish surrounding pathways.        |
| Reset query        | Works fully                 | Resets to inferred/default SQL.                                   | Keep.                               |
| SQL editor         | Works fully                 | Edits current query.                                              | Keep.                               |
| Run SQL            | Works fully                 | Runs against `current_data`.                                      | Keep.                               |
| Chart type buttons | Works fully                 | Changes pending tile type.                                        | Keep.                               |
| X/Y selects        | Works fully                 | Changes pending fields.                                           | Keep.                               |
| Add tile           | Works fully                 | Adds tile from current result.                                    | Keep.                               |
| Remove tile        | Works fully                 | Removes tile.                                                     | Keep.                               |
| AI prompt          | Works fully                 | Drives Embed/LLM/Profile prompts.                                 | Keep.                               |
| Embed              | Works partially             | Falls back deterministically but no activity entry.               | Add history/logging.                |
| LLM                | Works partially             | Optional model load can be slow; progress exists.                 | Keep; add clearer errors if needed. |
| Profile            | Works partially             | Pyodide path with JS fallback; no export.                         | Keep.                               |
| Save               | Works fully                 | Manual save only.                                                 | Add autosave setting.               |
| Reset              | Works fully                 | Clears local state.                                               | Keep.                               |
| Cancel             | Works partially             | Prevents stale UI writes but cannot abort DuckDB/model internals. | Keep and describe honestly.         |
| Debug panel        | Works fully when `?debug=1` | Useful, but not discoverable.                                     | Add setting to toggle.              |

Before Phase 3: green 14, yellow 6, red 0.
