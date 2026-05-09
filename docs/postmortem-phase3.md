# Phase 3 Postmortem

## Audit Grids

| Audit          | Before                         | After                           |
| -------------- | ------------------------------ | ------------------------------- |
| Inputs         | 4 green / 6 yellow / 10 red    | 14 green / 5 yellow / 3 red     |
| Outputs        | 3 green / 0 yellow / 11 red    | 11 green / 1 yellow / 3 red     |
| Controls       | 14 green / 6 yellow / 0 red    | 27 green / 2 yellow / 0 red     |
| Feature claims | 7 full / 3 partial / 1 missing | 11 full / 2 partial / 0 missing |

## Half-Baked Triage

- Finished: drag/drop import, batch import, paste import, clipboard import, autosave, state import/export, result exports, share URL, print, settings.
- Kept with limitation: Parquet import, because DuckDB handles it but CSV-style delimiter/header diagnosis does not apply.
- Kept as guidance: URL import, because Mode A has no backend proxy and browser CORS rules apply.
- Explicitly out of scope: OCR/image import, ZIP extraction, hosted embeds, screenshot export, runtime API.

## Codebase Health

| Metric                              | Before               | After                                       |
| ----------------------------------- | -------------------- | ------------------------------------------- |
| DRY violations in core output logic | No output module     | Canonical export/state modules              |
| TODO/FIXME/XXX/HACK                 | 0                    | 0                                           |
| Authored `any`                      | 0                    | 0                                           |
| Dead exported surfaces              | 3 candidates         | Removed                                     |
| Persistence boundary                | Shallow unknown cast | Typed zod schemas for dashboard/settings    |
| Real-user path tests                | Sample only          | Sample, paste import, export, state restore |

Remaining debt: `src/App.tsx` is still large. Phase 3 avoided a full state-management rewrite to stay focused on usability.

## Stranger Test

The fallback stranger test found three ambiguity issues: `CSV`, `State`, and `Reset` labels were too broad. They were renamed to `Download CSV`, `Export state`, and `Clear state`, and the smoke test now exercises the corrected workflow.

## Documentation Mismatches Fixed

- Removed OPFS from the README architecture claim.
- Added TSV/gzip, paste, state, export, share, print, and limitations to README/data/privacy docs.
- Updated docs/data.md from dataset schema v1 to diagnosis schema v2 plus state bundle version 1.
- Marked the v0.1 export/import postmortem item as completed in v0.2.0.

## Surprises

- The biggest usability win was not another chart feature; it was making state portable and inputs less file-picker-bound.
- Accessible names exposed confusing control labels faster than visual testing did.
- Keeping generated Pages assets out of ESLint made hooks much faster and more focused.

## Still Open

1. True external-human stranger test.
2. A smaller `App.tsx` split into import/output/settings panels.
3. Rich Parquet diagnosis parity with CSV/TSV.
4. Optional calculated fields and reusable query snippets.
5. Better chart date formatting for DuckDB-normalized timestamps.

## Honest Take

Yes, a stranger can now use the app for their own real tabular work end-to-end: load data, get an inferred query/chart, adjust SQL, save, export results, export state, restore state, and clear local data. It still is not a governed Tableau replacement: there is no collaboration, auth, hosted sharing, calculated-field language, or server-side data refresh. But it no longer feels like a toy for one canned demo.
