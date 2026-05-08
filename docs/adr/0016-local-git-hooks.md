# 0016 - Local Git Hooks

## Status

Accepted

## Context

The project uses local checks instead of GitHub Actions.

## Decision

Use `.githooks/` wired through `core.hooksPath` by `make install-hooks`.

Hooks:

- `pre-commit`: formatting check, lint, TypeScript build check, and secret scan.
- `commit-msg`: Conventional Commits validation.
- `pre-push`: tests, build, smoke test, and Pages output validation.
- `post-merge` and `post-checkout`: install/update dependencies when lockfile changes.

## Consequences

The local environment catches most issues before push.

## Alternatives Considered

- Lefthook was considered, but plain git hooks are easier to inspect and avoid an extra hook runtime.
