# 0047 - Error Taxonomy And Messaging

## Status

Accepted

## Context

Users need domain-level recovery paths.

## Decision

Errors use what/why/now-what fields and are categorized as recoverable or fatal. Boundary validation produces errors before DuckDB when possible.

## Consequences

The UI can preserve work on recoverable errors and give a specific next action.

## Alternatives Considered

Throwing generic `Error` instances through the UI was rejected.
