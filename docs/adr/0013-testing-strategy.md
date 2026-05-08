# 0013 - Testing Strategy

## Status

Accepted

## Context

Checks must run locally without GitHub Actions.

## Decision

Use:

- Vitest for logic tests.
- ESLint and TypeScript for static checks.
- Playwright for a Pages-like smoke test.
- `make test`, `make build`, and `make smoke` in pre-push hooks.

## Consequences

The repo can validate behavior locally before push.

## Alternatives Considered

- GitHub Actions were rejected by project constraints.
