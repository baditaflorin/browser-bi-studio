# 0045 - State Taxonomy And State Machine

## Status

Accepted

## Context

Large imports and repeated clicks can leave v1 in confusing states.

## Decision

Use explicit operation state, stale-operation guards, recoverable errors, and visible exits for import/query/save.

## Consequences

Only the latest operation can update UI state. Cancelled/stale work cannot overwrite newer results.

## Alternatives Considered

Ad hoc `busy` strings were rejected as insufficient.
