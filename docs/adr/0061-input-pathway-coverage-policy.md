# 0061 Input Pathway Coverage Policy

- Status: accepted
- Date: 2026-05-09

## Context

Users bring data through files, drag/drop, paste, clipboard, saved state, and sometimes URLs.

## Decision

Support sample, single file, batch file, drag/drop, paste text, clipboard read, state import, and share URL restore. URL import will not fetch remote data in v2; it will explain CORS and offer paste/download guidance. Image, folder, ZIP extraction, and OCR remain out of scope.

## Consequences

Every supported pathway uses the same table inference router. Unsupported pathways fail with domain-language guidance.

## Alternatives Considered

Adding a CORS proxy was rejected because Mode A forbids a runtime backend and public proxies are unreliable.
