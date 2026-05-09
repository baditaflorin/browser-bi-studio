# Static Data Contract

Mode A has no committed production data pipeline. User datasets are imported locally at runtime.

## Supported Inputs

- CSV files via browser file input and DuckDB-WASM `read_csv_auto`.
- TSV and gzip CSV files normalized to canonical CSV before DuckDB registration.
- Parquet files via browser file input and DuckDB-WASM `read_parquet`.
- Pasted CSV/TSV text and clipboard text.
- Portable `.browser-bi.json` state bundles exported by the app.
- Built-in sample sales data for first-run testing.

Unsupported inputs fail with actionable guidance:

- Nested JSON should be flattened to CSV/Parquet first.
- ZIP archives should be extracted before import.
- URL import is guidance-only because GitHub Pages has no backend proxy and browser CORS rules apply.

## Local Dataset Contract

Each loaded dataset is normalized to:

```json
{
  "name": "sample_sales.csv",
  "kind": "csv",
  "columns": [
    { "name": "region", "type": "string" },
    { "name": "revenue", "type": "number" }
  ],
  "rows": []
}
```

Dataset diagnosis schema version: `v2`.

Portable dashboard state bundles use:

```json
{
  "bundleVersion": 1,
  "appVersion": "0.2.0",
  "dashboard": { "version": 1 },
  "settings": { "version": 1 }
}
```

## Freshness

Freshness is local. The UI reports when the current dataset was loaded or restored from IndexedDB. Exported JSON results include generation metadata.
