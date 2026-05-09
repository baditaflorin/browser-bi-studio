# 0040 - Real-Data Audit Findings And Substance Metrics

## Status

Accepted

## Context

The v1 happy path works on the sample but does not behave intelligently on messy BI inputs.

## Decision

Use `docs/phase2-substance/realdata-audit.md` as the grading rubric. Phase 2 success requires at least 7 of 10 audit fixtures to produce a useful import, inferred query, and chart draft without manual configuration.

## Consequences

Real-data fixture tests block future changes. Low-confidence or failing inputs must be visible, not silent.

## Alternatives Considered

Synthetic-only tests were rejected because they would recreate the v1 toy problem.
