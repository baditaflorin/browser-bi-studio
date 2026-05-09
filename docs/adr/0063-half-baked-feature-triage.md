# 0063 Half-Baked Feature Triage Decisions

- Status: accepted
- Date: 2026-05-09

## Context

Half-built controls are worse than absent controls because they waste user trust.

## Decision

- Finish import by adding drop, paste, clipboard, batch, and state import.
- Finish local save by adding autosave and export/import state.
- Finish debug by exposing a real setting.
- Keep AI helpers, log activity, and document model-download limitations.
- Keep Parquet as supported but document that rich diagnosis is CSV/TSV/gzip focused.
- Keep URL as guidance only; do not pretend remote fetch works.

## Consequences

The production UI will not contain placeholders. Unsupported paths are explicit limitations.

## Alternatives Considered

Hiding all advanced inputs was rejected because paste and drag/drop materially improve the core workflow.
