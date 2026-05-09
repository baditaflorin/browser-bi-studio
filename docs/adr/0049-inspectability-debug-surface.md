# 0049 - Inspectability And Debug Surface

## Status

Accepted

## Context

Power users and support need to see why the app guessed something.

## Decision

`?debug=1` shows current dataset diagnosis, field confidence, operation state, and recent activity. The same information is deterministic and safe to include in bug reports.

## Consequences

Debugging does not require private server logs.

## Alternatives Considered

Console-only diagnostics were rejected.
