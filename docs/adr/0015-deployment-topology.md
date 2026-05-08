# 0015 - Deployment Topology

## Status

Accepted

## Context

Mode C topology requirements do not apply to Mode A.

## Decision

Use GitHub Pages only. There is no Docker Compose deployment, nginx, Prometheus, or runtime host port.

## Consequences

Deployment is a push to `main` with updated `docs/`.

## Alternatives Considered

- Docker backend topology was rejected by ADR 0001.
