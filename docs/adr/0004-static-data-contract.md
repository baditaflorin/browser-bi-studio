# 0004 - Static Data Contract

## Status

Accepted

## Context

Mode A has no scheduled data pipeline. Data is user-provided.

## Decision

Use a local v1 dataset contract:

- `name`: display name.
- `kind`: `csv`, `parquet`, or `sample`.
- `columns`: ordered column metadata with inferred primitive type.
- `rows`: preview/query rows represented as JSON-compatible records.
- `loadedAt`: ISO timestamp.

## Consequences

The frontend can persist, restore, query, and chart datasets without a server contract.

## Alternatives Considered

- Committed sample Parquet artifacts were rejected because the sample dataset is tiny.
- Runtime API contract was rejected by ADR 0001.
