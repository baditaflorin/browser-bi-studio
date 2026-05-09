# 0042 - Inference Engine

## Status

Accepted

## Context

Users expect obvious fields and shapes to be detected automatically.

## Decision

Use deterministic heuristics over headers and sampled values to infer field type, semantic role, confidence, reasons, anomalies, dataset shape, first SQL, and chart draft.

## Consequences

The first guess is explainable and testable. The engine avoids random ordering and timestamp-dependent output.

## Alternatives Considered

LLM-only inference was rejected because it would be slower, less deterministic, and harder to test.
