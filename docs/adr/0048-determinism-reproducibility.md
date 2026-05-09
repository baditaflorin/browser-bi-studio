# 0048 - Determinism And Reproducibility Guarantees

## Status

Accepted

## Context

Inference output must be testable and reproducible.

## Decision

Sort derived lists deterministically, avoid generated timestamps in inference output, use stable hashes for dataset IDs, and save provenance metadata.

## Consequences

Fixture expected outputs can be byte-identical.

## Alternatives Considered

Random IDs and locale-dependent formatting were rejected in inference outputs.
