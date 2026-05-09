# Phase 3 Findings

Audit date: 2026-05-09

## Top 5 Usability Gaps

1. Users can import a single file, but cannot drag/drop, paste, batch import, or resume from a portable state file.
2. Users can make a dashboard, but cannot export result CSV/JSON or take the full dashboard state to another browser.
3. Local persistence is manual; a stranger can lose recent work by closing the tab before pressing Save.
4. URL input is absent, so users may expect the app to fetch data directly and get no guidance about CORS.
5. Debug/inference information exists but is hidden behind `?debug=1`, which support users will not discover.

## Top 5 Half-Baked Features

1. Import: finish with drop, paste, batch, clipboard, and state import.
2. Save/local: finish with autosave and explicit state export/import.
3. Debug surface: finish with a setting toggle.
4. AI actions: keep, but log activity and document first-use model download limitations.
5. Parquet diagnosis: keep as partial; document that Phase 2 inference metadata is CSV/TSV/gzip focused.

## Top 5 Codebase Pain Points

1. `App.tsx` is too large and mixes UI with import/export/persistence orchestration.
2. There is no output module, so every export/copy/share action would duplicate serialization logic.
3. Persistence has only a shallow schema and no migration/export helpers.
4. Linting scans built Pages assets, making local hooks slower than needed.
5. Dead exported types/functions make the domain surface look broader than it is.

## Top 5 Documentation/Reality Mismatches

1. Architecture mentions OPFS/preferences, but app only has IndexedDB and no preferences UI.
2. README does not mention TSV/gzip support or JSON/ZIP limitations.
3. docs/data.md says schema version v1, while Phase 2 diagnosis uses schema version 2.
4. Privacy docs say clear browser site data, but app also has Reset.
5. Postmortem calls export/import next work; Phase 3 should close it and update docs.

## Fully Usable Means

- A stranger can load sample, upload, drag/drop, paste, or batch table files and get a useful first result.
- A stranger can export result CSV/JSON and a portable dashboard state file.
- A stranger can close/reopen the tab and recover work without remembering to save.
- Every visible control either works on real user data or clearly explains why the requested path is out of scope.
- README quickstart and feature claims match tested behavior.

## Success Metrics

- Input audit green/yellow/red moves from 4/6/10 to at least 13/5/2.
- Output audit green/yellow/red moves from 3/0/11 to at least 10/2/2.
- Real-data fixture tests remain 10/10 passing for tabular fixtures plus 1 recoverable JSON error.
- At least one e2e test covers paste/import, export, state import, and autosave.
- No TODO/FIXME/XXX/HACK in authored source.
- Authored `any` count remains 0.

## Out Of Scope

- Runtime backend, auth, cross-device sync, OCR/image import, ZIP extraction, server-side URL proxy, embed hosting, screenshot rendering, and new analytical engines.
