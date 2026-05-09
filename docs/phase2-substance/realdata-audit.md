# Phase 2 Substance Real-Data Audit

Status: draft for confirmation. No ADRs or code have been generated for Phase 2.

## Scope

The v1 happy path is: upload/load data, inspect preview, run SQL, choose chart fields, add a tile, save locally, reload.

The audit focuses on the existing surface area only. The question is whether the current engine makes useful first guesses on real user data.

## The 10 Inputs

| #   | Input                                       | Reality class                                        | Source                                                                                           |
| --- | ------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | USGS all-month earthquakes CSV              | clean public CSV                                     | https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv                          |
| 2   | FRED UNRATE CSV                             | clean-ish time series with missing-value conventions | https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE                                        |
| 3   | Our World in Data CO2 CSV                   | large, wide analytical CSV                           | https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv                         |
| 4   | NYC 311 Service Requests CSV, 5k-row export | messy operational text data                          | https://data.cityofnewyork.us/resource/erm2-nwe9.csv?$limit=5000                                 |
| 5   | Inside Airbnb listings CSV                  | messy domain CSV with prices, IDs, URLs, text, nulls | https://data.insideairbnb.com/united-states/ny/new-york-city/latest/visualisations/listings.csv  |
| 6   | Inside Airbnb full listings CSV.GZ          | compressed real CSV                                  | https://data.insideairbnb.com/united-states/ny/new-york-city/latest/data/listings.csv.gz         |
| 7   | World Bank population CSV download          | ZIP containing metadata rows and CSV files           | https://api.worldbank.org/v2/en/indicator/SP.POP.TOTL?downloadformat=csv                         |
| 8   | Eurostat population TSV/API download        | TSV/statistical cube shape                           | https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan?format=TSV&lang=en |
| 9   | SEC Apple companyfacts JSON                 | nested JSON facts, not tabular CSV                   | https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json                                    |
| 10  | Partial/truncated NYC 311 CSV               | interrupted transfer ending mid-row                  | derived from input #4                                                                            |

## Walkthrough Notes

### 1. USGS all-month earthquakes CSV

- What v1 did: Imported and DuckDB could query it. Preview appeared after manual load. User still had to choose a query and chart fields.
- What it should have done: Detect `time`, `latitude`, `longitude`, `mag`, and show an immediate first guess such as magnitude over time or count by place/type.
- Why it fell short: Field classification is primitive and there is no first-chart inference.
- Failure mode: Not a hard failure, but it feels underpowered.
- Manual work the app should do: Choose date/time and primary numeric measure automatically.

### 2. FRED UNRATE CSV

- What v1 did: Imported the file, but missing-value conventions such as `.` risk turning the measure column into text. The useful chart is not inferred.
- What it should have done: Normalize `.` as missing, infer `DATE` as date and `UNRATE` as numeric, and default to a line chart.
- Why it failed: No domain-aware missing-value or time-series inference.
- Failure mode: Wrong-but-confident risk if `UNRATE` becomes text and the UI defaults to counts.
- Manual work the app should do: Normalize missing values and choose line chart.

### 3. Our World in Data CO2 CSV

- What v1 did: Can load/query, but the dataset is wide and large enough that the user gets a generic table and no analytical path.
- What it should have done: Detect country/year panel data, suggest filtering to a country or grouping by year, and identify likely measures such as `co2`, `co2_per_capita`, and `population`.
- Why it failed: No common-shape recognition for panel/time-series data.
- Failure mode: Silent lack of help; the app makes the user do schema discovery.
- Manual work the app should do: Identify dimensions/measures and propose a starting query.

### 4. NYC 311 Service Requests CSV

- What v1 did: Loads a limited export, but large text columns and many fields make the table hard to interpret. There is no progress/cancel behavior for larger exports.
- What it should have done: Detect created/closed dates, complaint type, borough, status, and first chart count by complaint type or borough.
- Why it failed: No operational-data vocabulary, no large-input budget, no progress model.
- Failure mode: Potential stuck-feeling UI on large files; otherwise under-inference.
- Manual work the app should do: Pick obvious categorical dimensions and count metric.

### 5. Inside Airbnb listings CSV

- What v1 did: Imports the CSV, but does not classify price, room type, neighborhood, coordinates, IDs, URLs, or text fields with confidence.
- What it should have done: Detect listing records, classify `price` as money, `neighbourhood` and `room_type` as dimensions, and default to price by room type/neighborhood.
- Why it failed: No semantic field classification or currency/price normalization.
- Failure mode: Wrong-but-confident risk if price-like values remain strings.
- Manual work the app should do: Parse money and choose useful grouping fields.

### 6. Inside Airbnb full listings CSV.GZ

- What v1 did: The file is not accepted by the input filter. If forced/renamed, it is not decompressed and fails as CSV.
- What it should have done: Detect gzip compression, explain it, and either decompress client-side or tell the user to upload the uncompressed CSV.
- Why it failed: Extension-based import and no content sniffing.
- Failure mode: Obvious failure, but not domain-actionable.
- Manual work the app should do: Detect compression and offer the next step.

### 7. World Bank population CSV download

- What v1 did: The download is a ZIP, not a direct CSV. The app cannot inspect it. If a CSV inside is manually extracted, metadata rows can confuse header detection.
- What it should have done: Detect ZIP container, identify CSV candidates inside, skip metadata rows, infer country/year panel structure.
- Why it failed: No container handling, no metadata-row sniffing, no wide-year normalization guidance.
- Failure mode: Obvious import failure first; wrong-header risk after manual extraction.
- Manual work the app should do: Find the tabular file and true header.

### 8. Eurostat population TSV/API download

- What v1 did: TSV/statistical cube data is outside the accepted file types. If forced as CSV, delimiter and shape can be misread.
- What it should have done: Sniff tab delimiter/statistical dimensions and explain that it is a cube-style table with dimensions and observations.
- Why it failed: No delimiter/shape policy beyond DuckDB CSV auto-detect and no domain explanation.
- Failure mode: Obvious or wrong-but-confident depending on how the file is forced in.
- Manual work the app should do: Detect TSV and map dimensions/measures.

### 9. SEC Apple companyfacts JSON

- What v1 did: JSON is not accepted as a first-class input; if forced through CSV import, it fails with a technical parse error.
- What it should have done: Say this is nested JSON, not tabular CSV/Parquet, and identify that a flattening step is required.
- Why it failed: No boundary validation before DuckDB CSV parsing.
- Failure mode: Obvious but technical; user gets no useful next step.
- Manual work the app should do: Validate format at the boundary and explain.

### 10. Partial/truncated NYC 311 CSV

- What v1 did: A partial file can produce a raw parser error or an incomplete table with no confidence/anomaly warning.
- What it should have done: Detect truncation/malformed final row, keep valid rows if safe, and warn that the file looks incomplete.
- Why it failed: No partial-input recovery policy and no anomaly surface.
- Failure mode: Raw error or silent incomplete output. Silent incomplete output is worst.
- Manual work the app should do: Identify the malformed tail and propose retry/skip/keep-valid-rows.

## Top 5 Logic Gaps

1. Import intelligence is extension-first, not content-first. The app does not sniff compression, delimiter, encoding, metadata rows, TSV/cube shape, or JSON-before-CSV mistakes.
2. Schema inference is syntactic, not semantic. It misses money, time series, IDs, URLs, coordinates, missing-value conventions, and domain dimensions/measures.
3. There is no useful first guess after upload. The app shows rows but does not auto-run a safe starting query or produce a first chart the user can correct.
4. Errors are technical and late. Many failures happen inside DuckDB parsing instead of at the input boundary with a what/why/now-what message.
5. State and scale are not honest. Large imports lack progress/cancel, saved imported dashboards cannot reliably rerun SQL after reload because original file bytes/table state are not restored, and low-confidence results are not marked.

## Top 3 Intuition Failures

1. Uploading a real dataset does not produce an immediate insight. The user sees a table and must configure the app before it feels useful.
2. A saved imported dashboard looks restored after refresh, but the underlying DuckDB table may not exist, so rerunning SQL can fail unexpectedly.
3. The app treats common data packaging as alien: `.csv.gz`, `.zip`, TSV, metadata-prefixed CSV, and JSON all fail without a domain-level explanation.

## Top 3 "Feels Stupid" Moments

1. The user has to tell the app that `DATE` is time and `UNRATE` is the measure.
2. The user has to manually clean prices, missing values, semicolon/TSV delimiters, and metadata rows.
3. The user has to diagnose whether a failure was caused by compression, encoding, truncation, or wrong format.

## What "Smart" Means For Browser BI Studio

1. Uploading a real file should immediately yield a best-effort dataset diagnosis: format, encoding, delimiter/container, row count estimate, field types, semantic roles, and confidence.
2. The app should auto-produce a safe first query and first chart for common tabular shapes: time series, categorical counts, measure by dimension, panel data, and geospatial latitude/longitude tables.
3. Low-confidence inferences should be visible and correctable inline; confidence must flow into saved state/provenance.
4. Messy-but-common inputs should degrade in domain terms: "compressed CSV," "metadata rows before header," "truncated final row," "price parsed as text," not raw parser strings.
5. Reloading should be coherent: either the app can rerun the analysis from stored/provenanced input, or it clearly says what original input is needed.

## Phase 2 Substance Success Metrics

- Real-data pass rate: at least 7 of the 10 audit inputs complete import → useful preview/query/chart with no manual intervention beyond choosing the file.
- First-guess quality: at least 7 of 10 inputs get a useful inferred query and chart with confidence shown.
- Determinism: each fixture produces byte-identical inference output on 3 consecutive runs.
- Failure quality: 100% of failing fixtures show what failed, why in domain terms, and the next action.
- No silent wrongness: 0 low-confidence type/field/chart guesses are displayed without a confidence marker.
- Performance honesty: operations over 300ms show progress; operations over 5s are cancellable or explicitly marked as not yet cancellable with preserved state.
- State coherence: save → reload → rerun either works or gives a clear recoverable prompt for the missing original file.

## Explicitly Out Of Scope

- No new backend, auth, sharing, collaboration, or sync.
- No new chart families or visual polish.
- No redesign, dark mode, command palette, or landing-page work.
- No new external data connectors.
- No Phase 3 polish work.
- No architecture mode escalation; Phase 2 remains Mode A.
- No broad LLM feature expansion. AI can help explain/infer existing data behavior only where it supports the same current workflow.
