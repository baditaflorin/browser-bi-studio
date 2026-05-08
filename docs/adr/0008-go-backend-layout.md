# 0008 - Go Backend Layout

## Status

Accepted

## Context

The bootstrap prompt defines Go backend requirements for Mode B/C.

## Decision

Skip Go backend layout for Mode A.

## Consequences

There is no `cmd/`, `internal/`, `pkg/`, `api/`, `configs/`, or Docker backend in v1.

## Alternatives Considered

- Adding an empty Go module was rejected because it would create fake surface area.
