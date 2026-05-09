# 0041 - Input Robustness And Normalization Policy

## Status

Accepted

## Context

Real files arrive as CSV, TSV, gzip-compressed CSV, metadata-prefixed exports, partial files, and wrong-format uploads.

## Decision

Validate at the import boundary. Sniff content before DuckDB registration. Normalize UTF-8 BOM, CRLF, Windows-1252 fallbacks, NBSP, smart quotes, missing-value tokens, money, numbers, dates, delimiter, and metadata rows.

## Consequences

DuckDB receives canonical CSV whenever possible. Unsupported containers such as ZIP receive actionable errors.

## Alternatives Considered

Passing raw files directly to DuckDB was rejected because failures are late and hard for users to understand.
