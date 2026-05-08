# Static Data Contract

Mode A has no committed production data pipeline. User datasets are imported locally at runtime.

## Supported Inputs

- CSV files via browser file input and DuckDB-WASM `read_csv_auto`.
- Parquet files via browser file input and DuckDB-WASM `read_parquet`.
- Built-in sample sales data for first-run testing.

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

Schema version: `v1`.

## Freshness

Freshness is local. The UI reports when the current dataset was loaded or restored from IndexedDB.
