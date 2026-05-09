# Phase 3 Stranger Test

Date: 2026-05-09

Tester: autonomous fallback, clean browser context. No external human was available inside this run, so this is explicitly the prompt-allowed substitute, not a true outside-user test.

## Scenario

1. Open the built Pages app in a clean Playwright browser context.
2. Load the sample dataset.
3. Run SQL, add a chart, save locally.
4. Export CSV and portable state.
5. Clear state.
6. Re-import the state file.
7. Start a second clean page and paste a small real CSV excerpt.

## Confusions Found

1. The output button named `CSV` was ambiguous with `Copy CSV`.
2. The output button named `State` was ambiguous with the input label named `State`.
3. The local `Reset` button was ambiguous with the SQL `Reset query` icon.

## Fixes Made

1. Renamed output controls to `Download CSV`, `Download JSON`, `Copy SQL`, and `Export state`.
2. Kept state import as `State`, but made export explicitly `Export state`.
3. Renamed local reset to `Clear state`.

## Result

The tested workflow now completes with no dead ends: load, query, chart, save, export, clear, restore, paste, and preview all pass in Playwright smoke.
