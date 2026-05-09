# Phase 3 Codebase Health Audit

Audit date: 2026-05-09

## Measurements Before Phase 3

- Total TypeScript/TSX source lines: 2,882.
- Largest modules: `src/App.tsx` 783 lines, `src/features/data/ingest.ts` 325 lines, `src/features/data/schema.ts` 324 lines.
- TODO/FIXME/XXX/HACK in authored source: 0.
- `any`: 0 in authored source; generated `docs/assets` contains third-party bundled code and is excluded from cleanup.
- `@ts-ignore`: 0.
- Unsafe casts: 6 accepted boundary casts, mostly dynamic WASM library imports and persisted state parsing.

## DRY Violations

- Download/export logic is absent, so each future output would be tempted to create ad hoc Blob/clipboard code.
- `ChartTileView` and `ObservablePreview` each define similar dynamic module cast/error handling.
- App-level action guards repeat "missing dataset/result" error objects in several handlers.
- CSV preparation and DuckDB registration are tightly paired in `duckdb.ts` rather than separated by an app-level import workflow.

## SOLID Violations

- `src/App.tsx` owns import workflows, query execution, chart controls, AI actions, save/reset, activity log, debug panel, and all layout.
- `src/features/data/schema.ts` owns normalization, type inference, role inference, and anomaly detection.
- `src/features/data/ingest.ts` owns file sniffing, decompression, parsing, diagnosis, and canonical CSV output.

## Dead Code

- `loadCsvIntoDuckDb` is an unreferenced compatibility wrapper.
- `OperationState` and `InferenceExplanation` are exported but unused.
- `parseCsvRows`/`createSampleDataset` still serve sample metadata, but sample loading now also goes through the new text import path.

## Type Safety Holes

- Persisted dashboard state uses `z.unknown()` and casts to `DashboardState` after a shallow schema.
- Dynamic WASM library modules require casts because upstream packages do not expose the exact browser default shapes.
- `DataImportError` narrowing in one test uses a cast after `instanceof`.

## Inconsistent Patterns

- User-facing errors are canonical in data import paths, but chart rendering components still keep string errors.
- Save is manual, while other user-visible state changes happen immediately in React state.
- Tests cover inference fixtures but not output/export or import-from-state workflows.

## Test Coverage Holes

- No Playwright coverage for file import.
- No tests for export/download/copy/state round-trip.
- No tests for autosave restore.
- No tests for URL hash restore.

Before Phase 3 health gate: DRY violations 4, SOLID hotspots 3, dead-code candidates 3, TODO count 0, authored `any` count 0.
