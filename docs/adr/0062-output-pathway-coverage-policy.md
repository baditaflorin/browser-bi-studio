# 0062 Output Pathway Coverage Policy

- Status: accepted
- Date: 2026-05-09

## Context

A dashboard creator is not useful if users cannot take results or state out of the browser.

## Decision

Support CSV result download, JSON result download with metadata, copy SQL, copy CSV, portable state export/import, size-limited share URLs, and browser print. Screenshot, embed code, and API exports are out of scope for Mode A v2.

## Consequences

Exports are deterministic except for explicit generated-at metadata. State bundles are versioned and validated before import.

## Alternatives Considered

Embedding dashboards via hosted state was rejected because there is no server-side state store.
