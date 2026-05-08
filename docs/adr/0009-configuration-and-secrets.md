# 0009 - Configuration And Secrets

## Status

Accepted

## Context

Mode A must not hold secrets in the frontend.

## Decision

Use build-time public configuration only. `.env.example` documents placeholders. `.env*`, private keys, and certificates are gitignored.

## Consequences

Features requiring secrets are out of scope unless they use user-supplied keys or public unauthenticated APIs.

## Alternatives Considered

- Encrypted frontend secrets were rejected because they are still secrets in the frontend.
