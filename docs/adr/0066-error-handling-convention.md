# 0066 Error Handling Convention

- Status: accepted
- Date: 2026-05-09

## Context

Phase 2 introduced actionable errors, but not all UI operations use them.

## Decision

All user-triggered import/export/persistence actions convert unknown failures into `ActionableError` with what, why, and next step. String-only component errors are allowed only inside chart rendering internals where the surrounding app remains usable.

## Consequences

The status strip and activity log can present consistent recovery guidance.

## Alternatives Considered

Throwing raw errors to React boundaries was rejected because recoverable data errors should not blank the app.
