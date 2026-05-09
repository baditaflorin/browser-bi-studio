# 0046 - Performance Budgets

## Status

Accepted

## Context

Browser-only BI must be honest about scale.

## Decision

Budgets:

- <=10 MB: expected smooth import.
- 10-50 MB: progress required.
- 50-100 MB: warn that the browser may slow down.
- > 100 MB: classify as too large for v2 substance path unless Parquet/DuckDB can stream it.

## Consequences

Operations over 300 ms show progress text. Operations over 5 seconds expose cancellation semantics.

## Alternatives Considered

Pretending all local files are equally cheap was rejected.
