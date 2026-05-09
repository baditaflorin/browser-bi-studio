# Phase 2 State Taxonomy

## States

- `idle-empty`: no dataset loaded.
- `importing`: file is being read, normalized, and registered with DuckDB.
- `loaded-empty`: a dataset loaded but has zero usable rows.
- `loaded-some`: a dataset loaded with 1-999 rows.
- `loaded-many`: a dataset loaded with 1,000-100,000 rows.
- `loaded-too-many`: a dataset exceeds the browser budget and needs a narrower workflow.
- `querying`: DuckDB query is running.
- `charted`: a query result exists and chart inference has a draft.
- `saving`: local dashboard state is being written.
- `saved`: dashboard state is coherent in IndexedDB.
- `error-recoverable`: user work is intact and there is a next step.
- `error-fatal`: the current operation cannot continue, but existing saved state remains intact.
- `cancelled`: a stale operation was ignored and prior coherent state remains active.

## Exits

Every state has at least one exit:

- Import states can cancel or reset.
- Loaded states can query, save, reset, or import again.
- Error states keep the previous dataset/query where possible and show a next action.
- Cancelled returns to the last coherent state.
