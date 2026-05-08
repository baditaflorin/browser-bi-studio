# Runbook

Browser BI Studio has no production server.

## Local Debugging

```sh
make dev
make build
make pages-preview
make smoke
```

## Common Issues

- Blank page on Pages: confirm `vite.config.ts` uses `base: "/browser-bi-studio/"`.
- Routes 404 on refresh: confirm `docs/404.html` exists after `make build`.
- DuckDB fails to initialize: retry from a browser with WebAssembly enabled and network access to public DuckDB bundles.
- AI helper is slow: model assets are downloaded on first use and can take time.

## Logs

Mode A uses minimal browser console logging in production. There are no server logs.
