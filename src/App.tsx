import { useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  Brain,
  Database,
  Heart,
  Plus,
  Play,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Star,
  Upload,
} from 'lucide-react'
import { ChartTileView } from './components/ChartTileView'
import { ObservablePreview } from './components/ObservablePreview'
import { Toast } from './components/Toast'
import { VersionBadge } from './components/VersionBadge'
import { askLocalLlm } from './features/ai/localLlm'
import { profileWithPolars } from './features/ai/polarsProfile'
import { deterministicSuggestions, semanticColumnSearch } from './features/ai/semanticSearch'
import { defaultFieldSelection, createChartTile } from './features/dashboard/charting'
import { clearDashboard, loadDashboard, saveDashboard } from './features/dashboard/persistence'
import { actionableError } from './features/data/errors'
import { createSampleDataset, defaultQuery, sampleCsv } from './features/data/sampleData'
import type {
  ActionableError,
  ActivityEvent,
  ChartType,
  DashboardState,
  LoadedDataset,
  QueryResult,
} from './types'

const initialState: DashboardState = {
  version: 1,
  queryText: defaultQuery(),
  tiles: [],
}

type ChartDraft = {
  type: ChartType
  xField: string
  yField: string
}

function App() {
  const operationRef = useRef(0)
  const [dashboard, setDashboard] = useState<DashboardState>(initialState)
  const [busy, setBusy] = useState<string>()
  const [toast, setToast] = useState<string>()
  const [error, setError] = useState<ActionableError>()
  const [aiPrompt, setAiPrompt] = useState('revenue opportunities')
  const [aiOutput, setAiOutput] = useState<string[]>([])
  const [profileOutput, setProfileOutput] = useState<string>()
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [chartDraft, setChartDraft] = useState<ChartDraft>(
    defaultFieldSelection(initialState.lastResult),
  )
  const debug = new URLSearchParams(window.location.search).get('debug') === '1'

  useEffect(() => {
    loadDashboard()
      .then((saved) => {
        if (saved) {
          setDashboard(saved)
          setActivity(saved.activity ?? [])
          setChartDraft(defaultFieldSelection(saved.lastResult))
          setToast('Dashboard restored')
        }
      })
      .catch((reason: unknown) => setError(actionableError(reason)))
  }, [])

  const currentRows = dashboard.lastResult?.rows ?? dashboard.dataset?.previewRows ?? []
  const columns = dashboard.lastResult?.columns ?? dashboard.dataset?.columns ?? []
  const hasDataset = Boolean(dashboard.dataset)
  const canChart = Boolean(dashboard.lastResult?.rows.length)
  const isBusy = Boolean(busy)

  async function loadSample() {
    await withBusy('Loading sample into DuckDB-WASM', async (isCurrent) => {
      const { executeSql, loadTextIntoDuckDb } = await import('./features/data/duckdb')
      const sample = createSampleDataset()
      const loaded = await loadTextIntoDuckDb(sample.name, sampleCsv, 'sample')
      const sql = loaded.diagnosis?.recommendedAnalysis.sql ?? defaultQuery()
      const result = await executeSql(sql)
      if (!isCurrent()) {
        return
      }
      commitDataset({ ...loaded, kind: 'sample', id: sample.id }, sql, result)
      record('import', 'Sample data inferred', loaded.diagnosis?.shape)
      setToast('Sample loaded with an inferred first chart')
    })
  }

  async function importFile(file: File) {
    await withBusy(`Diagnosing ${file.name}`, async (isCurrent) => {
      const { executeSql, loadFileIntoDuckDb, loadParquetIntoDuckDb } =
        await import('./features/data/duckdb')
      const dataset = file.name.toLowerCase().endsWith('.parquet')
        ? await loadParquetIntoDuckDb(file)
        : await loadFileIntoDuckDb(file)
      const sql =
        dataset.diagnosis?.recommendedAnalysis.sql ?? 'SELECT * FROM current_data LIMIT 100'
      const result = await executeSql(sql)
      if (!isCurrent()) {
        return
      }
      commitDataset(dataset, sql, result)
      record('import', `Imported ${file.name}`, dataset.diagnosis?.shape)
      setToast('Dataset diagnosed and first query ran')
    })
  }

  function commitDataset(dataset: LoadedDataset, queryText: string, result: QueryResult) {
    setDashboard((current) => ({
      ...current,
      dataset,
      queryText,
      lastResult: result,
    }))
    const recommendation = dataset.diagnosis?.recommendedAnalysis
    setChartDraft(
      recommendation
        ? {
            type: recommendation.chartType,
            xField: recommendation.xField,
            yField: recommendation.yField,
          }
        : defaultFieldSelection(result),
    )
  }

  async function runQuery() {
    if (!hasDataset) {
      setError({
        code: 'missing_dataset',
        recoverable: true,
        what: 'No dataset is loaded.',
        why: 'SQL needs a current table named current_data.',
        nextStep: 'Load the sample data or import a CSV, TSV, gzip CSV, or Parquet file.',
      })
      return
    }

    await withBusy('Running SQL in DuckDB-WASM', async (isCurrent) => {
      const { executeSql } = await import('./features/data/duckdb')
      const result = await executeSql(dashboard.queryText)
      if (!isCurrent()) {
        return
      }
      setDashboard((current) => ({ ...current, lastResult: result }))
      setChartDraft(defaultFieldSelection(result))
      record('query', 'SQL query completed', `${result.rowCount} rows in ${result.elapsedMs}ms`)
      setToast(`${result.rowCount} rows in ${result.elapsedMs}ms`)
    })
  }

  async function saveCurrentDashboard() {
    await withBusy('Saving dashboard', async (isCurrent) => {
      const next = { ...dashboard, activity, savedAt: new Date().toISOString() }
      await saveDashboard(next)
      if (!isCurrent()) {
        return
      }
      setDashboard(next)
      record('save', 'Dashboard saved locally')
      setToast('Saved locally')
    })
  }

  async function resetDashboard() {
    await clearDashboard()
    operationRef.current += 1
    setDashboard(initialState)
    setError(undefined)
    setAiOutput([])
    setProfileOutput(undefined)
    setActivity([])
    setBusy(undefined)
    setToast('Local dashboard cleared')
  }

  function addTile() {
    if (!dashboard.lastResult) {
      setError({
        code: 'missing_query_result',
        recoverable: true,
        what: 'There is no query result to chart.',
        why: 'Chart tiles are built from the current SQL result.',
        nextStep: 'Run SQL or import a dataset and let the app infer a first query.',
      })
      return
    }

    const tile = createChartTile(
      dashboard.lastResult,
      chartDraft.type,
      chartDraft.xField,
      chartDraft.yField,
    )
    setDashboard((current) => ({
      ...current,
      tiles: [tile, ...current.tiles],
    }))
    record('chart', `Added ${tile.title}`, tile.type)
    setToast('Tile added')
  }

  function removeTile(id: string) {
    setDashboard((current) => ({
      ...current,
      tiles: current.tiles.filter((tile) => tile.id !== id),
    }))
  }

  async function runSemanticSearch() {
    if (!columns.length) {
      setError({
        code: 'missing_dataset',
        recoverable: true,
        what: 'No dataset is loaded.',
        why: 'Column embeddings need fields to compare.',
        nextStep: 'Load data first, then run Embed.',
      })
      return
    }

    await withBusy('Embedding columns locally', async (isCurrent) => {
      try {
        const results = await semanticColumnSearch(columns, aiPrompt)
        if (isCurrent()) {
          setAiOutput(results.map((result) => `${result.column.name} (${result.score.toFixed(2)})`))
        }
      } catch {
        if (isCurrent()) {
          setAiOutput(deterministicSuggestions(columns, currentRows, aiPrompt))
        }
      }
    })
  }

  async function runLocalAssistant() {
    if (!columns.length) {
      setError({
        code: 'missing_dataset',
        recoverable: true,
        what: 'No dataset is loaded.',
        why: 'The local assistant needs a schema and sample rows.',
        nextStep: 'Load data first, then ask the assistant.',
      })
      return
    }

    await withBusy('Starting local LLM', async (isCurrent) => {
      const answer = await askLocalLlm(columns, currentRows, aiPrompt, setToast)
      if (isCurrent()) {
        setAiOutput(answer.split('\n').filter(Boolean))
      }
    })
  }

  async function runPolarsProfile() {
    if (!columns.length) {
      setError({
        code: 'missing_dataset',
        recoverable: true,
        what: 'No dataset is loaded.',
        why: 'Profiling needs rows and columns.',
        nextStep: 'Load data first, then run Profile.',
      })
      return
    }

    await withBusy('Profiling with Pyodide', async (isCurrent) => {
      const output = await profileWithPolars(currentRows, columns)
      if (isCurrent()) {
        setProfileOutput(output)
      }
    })
  }

  function cancelOperation() {
    if (!busy) {
      return
    }
    operationRef.current += 1
    record('cancel', `Cancelled ${busy}`)
    setBusy(undefined)
    setToast('Operation cancelled')
  }

  async function withBusy(label: string, action: (isCurrent: () => boolean) => Promise<void>) {
    const token = operationRef.current + 1
    operationRef.current = token
    setBusy(label)
    setError(undefined)
    try {
      await action(() => token === operationRef.current)
    } catch (reason: unknown) {
      const detail = actionableError(reason)
      setError(detail)
      record('error', detail.what, detail.why)
    } finally {
      if (token === operationRef.current) {
        setBusy(undefined)
      }
    }
  }

  function record(kind: ActivityEvent['kind'], label: string, details?: string) {
    setActivity((current) =>
      [
        {
          id: `${kind}-${current.length + 1}`,
          at: new Date().toISOString(),
          kind,
          label,
          details,
        },
        ...current,
      ].slice(0, 12),
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1>Browser BI Studio</h1>
            <span>WASM dashboard creator</span>
          </div>
        </div>
        <nav className="top-actions" aria-label="Project links">
          <VersionBadge />
          <a
            className="action-link"
            href="https://github.com/baditaflorin/browser-bi-studio"
            target="_blank"
            rel="noreferrer"
          >
            <Star size={16} />
            Star
          </a>
          <a
            className="action-link support"
            href="https://www.paypal.com/paypalme/florinbadita"
            target="_blank"
            rel="noreferrer"
          >
            <Heart size={16} />
            Support
          </a>
        </nav>
      </header>

      <main className="workspace">
        <aside className="left-rail">
          <section className="panel">
            <div className="panel-title">
              <h2>Data</h2>
              <Database size={17} />
            </div>
            <div className="button-row">
              <button type="button" onClick={loadSample} disabled={isBusy}>
                <Database size={16} />
                Sample
              </button>
              <label className="file-button">
                <Upload size={16} />
                Import
                <input
                  type="file"
                  accept=".csv,.tsv,.csv.gz,.gz,.parquet,.json,.zip,text/csv,text/tab-separated-values"
                  disabled={isBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void importFile(file)
                    }
                    event.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
            <DatasetSummary dataset={dashboard.dataset} />
          </section>

          <section className="panel grow">
            <div className="panel-title">
              <h2>SQL</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() =>
                  setDashboard((current) => ({
                    ...current,
                    queryText:
                      current.dataset?.diagnosis?.recommendedAnalysis.sql ?? defaultQuery(),
                  }))
                }
                title="Reset query"
                aria-label="Reset query"
                disabled={isBusy}
              >
                <RefreshCw size={15} />
              </button>
            </div>
            <textarea
              value={dashboard.queryText}
              onChange={(event) =>
                setDashboard((current) => ({
                  ...current,
                  queryText: event.target.value,
                }))
              }
              spellCheck={false}
              aria-label="SQL query"
              disabled={isBusy}
            />
            <button type="button" className="primary-action" onClick={runQuery} disabled={isBusy}>
              <Play size={16} />
              Run SQL
            </button>
          </section>
        </aside>

        <section className="canvas">
          <section className="panel chart-builder">
            <div className="panel-title">
              <h2>Chart</h2>
              <span>{dashboard.lastResult ? `${dashboard.lastResult.rowCount} rows` : 'idle'}</span>
            </div>
            <ChartControls
              draft={chartDraft}
              result={dashboard.lastResult}
              onChange={setChartDraft}
              onAdd={addTile}
              disabled={!canChart || isBusy}
            />
          </section>

          <ObservablePreview result={dashboard.lastResult} />

          <section className="panel">
            <div className="panel-title">
              <h2>Results</h2>
              <span>
                {dashboard.lastResult?.elapsedMs ? `${dashboard.lastResult.elapsedMs}ms` : ''}
              </span>
            </div>
            <ResultTable result={dashboard.lastResult} dataset={dashboard.dataset} />
          </section>

          <section className="dashboard-grid" aria-label="Dashboard tiles">
            {dashboard.tiles.map((tile) => (
              <ChartTileView key={tile.id} tile={tile} onRemove={removeTile} />
            ))}
          </section>
        </section>

        <aside className="right-rail">
          <section className="panel">
            <div className="panel-title">
              <h2>AI</h2>
              <Sparkles size={17} />
            </div>
            <input
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              aria-label="AI prompt"
              disabled={isBusy}
            />
            <div className="button-grid">
              <button type="button" onClick={runSemanticSearch} disabled={isBusy}>
                <Search size={16} />
                Embed
              </button>
              <button type="button" onClick={runLocalAssistant} disabled={isBusy}>
                <Brain size={16} />
                LLM
              </button>
              <button type="button" onClick={runPolarsProfile} disabled={isBusy}>
                <Sparkles size={16} />
                Profile
              </button>
            </div>
            <AiOutput lines={aiOutput} profile={profileOutput} />
          </section>

          <section className="panel save-panel">
            <div className="panel-title">
              <h2>Local</h2>
              <span>
                {dashboard.savedAt ? new Date(dashboard.savedAt).toLocaleTimeString() : ''}
              </span>
            </div>
            <div className="button-row">
              <button type="button" onClick={saveCurrentDashboard} disabled={isBusy}>
                <Save size={16} />
                Save
              </button>
              <button type="button" onClick={resetDashboard} disabled={isBusy}>
                <RefreshCw size={16} />
                Reset
              </button>
            </div>
          </section>

          <ActivityLog activity={activity} />
          {debug ? (
            <DebugPanel dashboard={dashboard} activity={activity} busy={busy} error={error} />
          ) : null}
        </aside>
      </main>

      <StatusStrip
        busy={busy}
        error={error}
        dataset={dashboard.dataset}
        result={dashboard.lastResult}
        onCancel={cancelOperation}
      />
      <Toast message={toast} onDismiss={() => setToast(undefined)} />
    </div>
  )
}

function DatasetSummary({ dataset }: { dataset?: LoadedDataset }) {
  if (!dataset) {
    return <p className="muted">No dataset loaded</p>
  }

  const diagnosis = dataset.diagnosis

  return (
    <div className="dataset-summary">
      <strong>{dataset.name}</strong>
      <span>
        {dataset.rowCount.toLocaleString()} rows · {dataset.columns.length} columns
      </span>
      {diagnosis ? (
        <div className="diagnosis-strip">
          <span>{diagnosis.shape}</span>
          <span>{diagnosis.format}</span>
          <span>{diagnosis.confidence} confidence</span>
        </div>
      ) : null}
      <div className="column-list">
        {dataset.columns.map((column) => (
          <span
            key={column.name}
            title={`${column.type}, ${column.semanticRole}, ${column.confidence}: ${column.reasons.join('; ')}`}
          >
            {column.name}
            <small>{column.semanticRole}</small>
          </span>
        ))}
      </div>
      {diagnosis?.issues.length ? (
        <div className="issue-list">
          {diagnosis.issues.slice(0, 4).map((issue) => (
            <p key={`${issue.code}-${issue.field ?? ''}`}>
              <strong>{issue.what}</strong> {issue.nextStep}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ChartControls({
  draft,
  result,
  onChange,
  onAdd,
  disabled,
}: {
  draft: ChartDraft
  result?: QueryResult
  onChange: (draft: ChartDraft) => void
  onAdd: () => void
  disabled: boolean
}) {
  const fields = result?.columns ?? []
  const chartTypes: ChartType[] = ['bar', 'line', 'area', 'scatter', 'table']

  return (
    <div className="chart-controls">
      <div className="segmented" role="group" aria-label="Chart type">
        {chartTypes.map((type) => (
          <button
            key={type}
            type="button"
            className={draft.type === type ? 'active' : ''}
            onClick={() => onChange({ ...draft, type })}
            disabled={disabled}
          >
            {type}
          </button>
        ))}
      </div>
      <label>
        X
        <select
          value={draft.xField}
          onChange={(event) => onChange({ ...draft, xField: event.target.value })}
          disabled={disabled}
        >
          {fields.map((field) => (
            <option key={field.name} value={field.name}>
              {field.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Y
        <select
          value={draft.yField}
          onChange={(event) => onChange({ ...draft, yField: event.target.value })}
          disabled={disabled}
        >
          <option value="">count</option>
          {fields.map((field) => (
            <option key={field.name} value={field.name}>
              {field.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="primary-action" onClick={onAdd} disabled={disabled}>
        <Plus size={16} />
        Add tile
      </button>
    </div>
  )
}

function ResultTable({ result, dataset }: { result?: QueryResult; dataset?: LoadedDataset }) {
  const rows = result?.rows ?? dataset?.previewRows ?? []
  const columns = Object.keys(rows[0] ?? {}).slice(0, 10)

  if (!rows.length) {
    return <p className="muted">No rows</p>
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, index) => (
            <tr key={`${index}-${columns.join('-')}`}>
              {columns.map((column) => (
                <td key={column}>{String(row[column] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AiOutput({ lines, profile }: { lines: string[]; profile?: string }) {
  if (!lines.length && !profile) {
    return <p className="muted">Ready</p>
  }

  return (
    <div className="ai-output">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {profile ? <pre>{profile}</pre> : null}
    </div>
  )
}

function ActivityLog({ activity }: { activity: ActivityEvent[] }) {
  if (!activity.length) {
    return null
  }

  return (
    <section className="panel activity-log">
      <div className="panel-title">
        <h2>History</h2>
        <span>{activity.length}</span>
      </div>
      {activity.slice(0, 6).map((item) => (
        <p key={item.id}>
          <strong>{item.label}</strong>
          {item.details ? <span>{item.details}</span> : null}
        </p>
      ))}
    </section>
  )
}

function DebugPanel({
  dashboard,
  activity,
  busy,
  error,
}: {
  dashboard: DashboardState
  activity: ActivityEvent[]
  busy?: string
  error?: ActionableError
}) {
  return (
    <section className="panel debug-panel">
      <div className="panel-title">
        <h2>Debug</h2>
        <span>inspect</span>
      </div>
      <pre>
        {JSON.stringify(
          {
            busy,
            error,
            dataset: dashboard.dataset?.diagnosis,
            columns: dashboard.dataset?.columns,
            activity,
          },
          null,
          2,
        )}
      </pre>
    </section>
  )
}

function StatusStrip({
  busy,
  error,
  dataset,
  result,
  onCancel,
}: {
  busy?: string
  error?: ActionableError
  dataset?: LoadedDataset
  result?: QueryResult
  onCancel: () => void
}) {
  return (
    <footer className="status-strip">
      <span>{busy ?? 'Ready'}</span>
      <span>
        {dataset ? `${dataset.name} · ${dataset.diagnosis?.shape ?? dataset.kind}` : 'No data'}
      </span>
      <span>{result ? `${result.rowCount} result rows` : 'No query result'}</span>
      {busy ? (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
      {error ? (
        <strong title={`${error.why} ${error.nextStep}`}>
          {error.what} {error.nextStep}
        </strong>
      ) : null}
    </footer>
  )
}

export default App
