# 0003 - Frontend Framework And Build Tooling

## Status

Accepted

## Context

The project needs TypeScript strictness, fast local development, static output, and mature ecosystem support.

## Decision

Use React, TypeScript, Vite, Tailwind CSS, Vitest, and Playwright.

## Consequences

- Vite builds directly into `docs/` for GitHub Pages.
- React provides predictable state composition for the dashboard builder.
- Heavy WASM and AI packages are loaded through dynamic imports.

## Alternatives Considered

- SvelteKit was considered but would add routing/build conventions not needed for this static app.
- Vanilla TypeScript was considered but would slow UI iteration.
