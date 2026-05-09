# 0044 - Confidence Model

## Status

Accepted

## Context

No silent wrongness is allowed.

## Decision

Every inferred column and dataset recommendation carries `high`, `medium`, or `low` confidence plus short reasons. Low-confidence recommendations remain usable but are visually flagged.

## Consequences

Users can correct rather than configure. Saved state and debug output preserve confidence.

## Alternatives Considered

Hiding uncertainty was rejected as wrong-but-confident behavior.
