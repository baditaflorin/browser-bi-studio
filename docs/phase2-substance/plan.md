# Phase 2 Substance Plan

Status: accepted by user request "continue and fully implement this".

## Ranking Principle

Items are ranked by impact on the 10 real-data audit fixtures, not by implementation novelty.

## Picklist From §2

1. A1 Fuzz parser with real fixtures and synthetic edge cases.
2. A2 Encoding and format variants: BOM, CRLF/LF, Windows-1252, NBSP, smart quotes.
3. A3 Huge inputs: explicit budgets, progress, and cliff documentation.
4. A4 Partial inputs: recover valid rows when safe and warn.
5. A5 Adversarial inputs: embedded delimiters, quotes, newlines, dates, lookalikes.
6. B6 Auto-detect structure: delimiter, header row, metadata rows, table shape.
7. B7 Auto-classify fields: time, measure, money, ID, URL, latitude/longitude, text, dimension.
8. B8 Useful first guess: automatically produce first SQL and chart draft after import.
9. B9 Format normalization: dates, numbers, money, whitespace, missing-value tokens.
10. B10 Inline corrections foundation: show inference reasons/confidence next to fields.
11. C11 Domain vocabulary: import, inference, and error text use BI/data terms.
12. C12 Domain-aware validation: price without currency, missing values, impossible dates, mixed types.
13. C13 Recognize common shapes: time series, panel data, categorical counts, geospatial tables.
14. C14 Domain-aware saved state: provenance and schema metadata in local state.
15. C15 Domain conventions: delimiter sniffing, semantic headers, whitespace normalization.
16. D16 Confidence scores on every inference.
17. D17 Suggested fixes for recoverable problems.
18. D18 Surface anomalies: mixed types, malformed rows, truncated input, high-cardinality fields.
19. D19 Explain decisions through inference reasons.
20. E22 Stable IDs for datasets, fields, queries, and tiles where deterministic.
21. F24 Enumerate reachable states.
22. F25 No stuck states: every state has a visible next step.
23. F27 Concurrency safety: one active operation wins; stale results are ignored.
24. G28 Profile real-data inputs and record import/query timing.
25. G31 Cache expensive derived inference by source hash.
26. H32 Actionable errors: what, why, now what.
27. H33 Validate at boundaries before DuckDB work.
28. H34 Recoverable vs fatal error categories.
29. I35 Deterministic inference outputs.
30. I37 Debug overlay with `?debug=1`.
31. I38 Output provenance in saved state and debug surface.

## Implementation Order

1. Fixture suite and deterministic inference tests.
2. Import boundary validation and text normalization.
3. Schema/semantic inference with confidence and anomalies.
4. Recommended query/chart engine.
5. UI state, actionable errors, progress, cancellation, and debug surface.
6. Persistence/provenance hardening.
7. Performance/pass-rate documentation and postmortem.

## Non-Goals

No backend, auth, sync, sharing, new connectors, new chart families, or visual redesign.
