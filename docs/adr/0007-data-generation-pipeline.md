# 0007 - Data Generation Pipeline

## Status

Accepted

## Context

The mandatory ADR list includes Mode B pipeline decisions, but this project is Mode A.

## Decision

No data-generation pipeline exists in v1.

## Consequences

`make data` is a no-op that documents the Mode A choice.

## Alternatives Considered

- A build-time sample-data generator was rejected because the built-in dataset is static source code.
