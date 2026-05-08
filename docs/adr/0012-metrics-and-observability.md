# 0012 - Metrics And Observability

## Status

Accepted

## Context

Mode A has no server metrics endpoint.

## Decision

Ship no analytics in v1. Use local smoke tests and public Pages availability as operational checks.

## Consequences

No PII or usage events are collected.

## Alternatives Considered

- Plausible was considered but rejected for v1 because usage insight is less important than privacy.
