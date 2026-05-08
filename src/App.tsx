import { useEffect, useState } from 'react'
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
import { createSampleDataset, defaultQuery, sampleCsv } from './features/data/sampleData'
import type { ChartType, DashboardState, LoadedDataset, QueryResult } from './types'

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
  const [dashboard, setDashboard] = useState<DashboardState>(initialState)
  const [busy, setBusy] = useState<string>()
  const [toast, setToast] = useState<string>()
  const [error, setError] = useState<string>()
  const [aiPrompt, setAiPrompt] = useState('revenue opportunities')
  const [aiOutput, setAiOutput] = useState<string[]>([])
  const [profileOutput, setProfileOutput] = useState<string>()
  const [chartDraft, setChartDraft] = useState<ChartDraft>(
    defaultFieldSelection(initialState.lastResult),
  )

  useEffect(() => {
    loadDashboard()
      .then((saved) => {
        if (saved) {
          setDashboard(saved)
          setChartDraft(defaultFieldSelection(saved.lastResult))
          setToast('Dashboard restored')
        }
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Could not restore dashboard')
      })
  }, [])

  const currentRows = dashboard.lastResult?.rows ?? dashboard.dataset?.previewRows ?? []
  const columns = dashboard.lastResult?.columns ?? dashboard.dataset?.columns ?? []
  const hasDataset = Boolean(dashboard.dataset)
  const canChart = Boolean(dashboard.lastResult?.rows.length)

  async function loadSample() {
    await withBusy('Loading DuckDB-WASM', async () => {
      const { loadCsvIntoDuckDb } = await import('./features/data/duckdb')
      const sample = createSampleDataset()
      const loaded = await loadCsvIntoDuckDb(sample.name, sampleCsv)
      setDashboard((current) => ({
        ...current,
        dataset: { ...loaded, kind: 'sample', id: sample.id },
        queryText: defaultQuery(),
        lastResult: undefined,
      }))
      setToast('Sample loaded into DuckDB-WASM')
    })
  }

  async function importFile(file: File) {
    await withBusy(`Importing ${file.name}`, async () => {
      const duckdb = await import('./features/data/duckdb')
      let dataset: LoadedDataset

      if (file.name.toLowerCase().endsWith('.parquet')) {
        dataset = await duckdb.loadParquetIntoDuckDb(file)
      } else {
        dataset = await duckdb.loadCsvIntoDuckDb(file.name, await file.text())
      }

      setDashboard((current) => ({
        ...current,
        dataset,
        queryText: 'SELECT * FROM current_data LIMIT 100',
        lastResult: undefined,
      }))
      setToast('Dataset ready')
    })
  }

  async function runQuery() {
    if (!hasDataset) {
      setError('Load a dataset first')
      return
    }

    await withBusy('Running SQL in DuckDB-WASM', async () => {
      const { executeSql } = await import('./features/data/duckdb')
      const result = await executeSql(dashboard.queryText)
      setDashboard((current) => ({ ...current, lastResult: result }))
      setChartDraft(defaultFieldSelection(result))
      setToast(`${result.rowCount} rows in ${result.elapsedMs}ms`)
    })
  }

  async function saveCurrentDashboard() {
    await withBusy('Saving dashboard', async () => {
      const next = { ...dashboard, savedAt: new Date().toISOString() }
      await saveDashboard(next)
      setDashboard(next)
      setToast('Saved locally')
    })
  }

  async function resetDashboard() {
    await clearDashboard()
    setDashboard(initialState)
    setAiOutput([])
    setProfileOutput(undefined)
    setToast('Local dashboard cleared')
  }

  function addTile() {
    if (!dashboard.lastResult) {
      setError('Run a query first')
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
      setError('Load data first')
      return
    }

    await withBusy('Embedding columns locally', async () => {
      try {
        const results = await semanticColumnSearch(columns, aiPrompt)
        setAiOutput(results.map((result) => `${result.column.name} (${result.score.toFixed(2)})`))
      } catch {
        setAiOutput(deterministicSuggestions(columns, currentRows, aiPrompt))
      }
    })
  }

  async function runLocalAssistant() {
    if (!columns.length) {
      setError('Load data first')
      return
    }

    await withBusy('Starting local LLM', async () => {
      const answer = await askLocalLlm(columns, currentRows, aiPrompt, setToast)
      setAiOutput(answer.split('\n').filter(Boolean))
    })
  }

  async function runPolarsProfile() {
    if (!columns.length) {
      setError('Load data first')
      return
    }

    await withBusy('Profiling with Pyodide', async () => {
      const output = await profileWithPolars(currentRows, columns)
      setProfileOutput(output)
    })
  }

  async function withBusy(label: string, action: () => Promise<void>) {
    setBusy(label)
    setError(undefined)
    try {
      await action()
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Something failed')
    } finally {
      setBusy(undefined)
    }
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
              <button type="button" onClick={loadSample}>
                <Database size={16} />
                Sample
              </button>
              <label className="file-button">
                <Upload size={16} />
                Import
                <input
                  type="file"
                  accept=".csv,.parquet,text/csv"
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
                    queryText: defaultQuery(),
                  }))
                }
                title="Reset query"
                aria-label="Reset query"
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
            />
            <button type="button" className="primary-action" onClick={runQuery}>
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
              disabled={!canChart}
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
            />
            <div className="button-grid">
              <button type="button" onClick={runSemanticSearch}>
                <Search size={16} />
                Embed
              </button>
              <button type="button" onClick={runLocalAssistant}>
                <Brain size={16} />
                LLM
              </button>
              <button type="button" onClick={runPolarsProfile}>
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
              <button type="button" onClick={saveCurrentDashboard}>
                <Save size={16} />
                Save
              </button>
              <button type="button" onClick={resetDashboard}>
                <RefreshCw size={16} />
                Reset
              </button>
            </div>
          </section>
        </aside>
      </main>

      <StatusStrip
        busy={busy}
        error={error}
        dataset={dashboard.dataset}
        result={dashboard.lastResult}
      />
      <Toast message={toast} onDismiss={() => setToast(undefined)} />
    </div>
  )
}

function DatasetSummary({ dataset }: { dataset?: LoadedDataset }) {
  if (!dataset) {
    return <p className="muted">No dataset loaded</p>
  }

  return (
    <div className="dataset-summary">
      <strong>{dataset.name}</strong>
      <span>
        {dataset.rowCount.toLocaleString()} rows · {dataset.columns.length} columns
      </span>
      <div className="column-list">
        {dataset.columns.map((column) => (
          <span key={column.name} title={`${column.type}, ${column.distinctCount} distinct`}>
            {column.name}
          </span>
        ))}
      </div>
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

function StatusStrip({
  busy,
  error,
  dataset,
  result,
}: {
  busy?: string
  error?: string
  dataset?: LoadedDataset
  result?: QueryResult
}) {
  return (
    <footer className="status-strip">
      <span>{busy ?? 'Ready'}</span>
      <span>{dataset ? `${dataset.name} · ${dataset.kind}` : 'No data'}</span>
      <span>{result ? `${result.rowCount} result rows` : 'No query result'}</span>
      {error ? <strong>{error}</strong> : null}
    </footer>
  )
}

export default App
