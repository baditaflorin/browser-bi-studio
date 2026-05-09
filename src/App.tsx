import { useEffect, useRef, useState, type DragEvent } from 'react'
import {
  BarChart3,
  Brain,
  Clipboard,
  Database,
  Download,
  FileJson,
  FileText,
  Heart,
  Link2,
  Plus,
  Play,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings,
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
import {
  copyText,
  downloadText,
  makeDashboardBundle,
  resultToCsv,
  resultToJson,
  safeExportName,
  stableJson,
} from './features/dashboard/exports'
import {
  clearDashboard,
  defaultSettings,
  loadDashboard,
  loadSettings,
  saveDashboard,
  saveSettings,
} from './features/dashboard/persistence'
import {
  createShareHash,
  normalizeImportedSettings,
  parseDashboardBundle,
  parseShareHash,
} from './features/dashboard/stateBundle'
import { actionableError, DataImportError } from './features/data/errors'
import { createSampleDataset, defaultQuery, sampleCsv } from './features/data/sampleData'
import type {
  ActionableError,
  ActivityEvent,
  AppSettings,
  BatchImportStatus,
  ChartType,
  DashboardBundle,
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
  const saveTimerRef = useRef<number | undefined>(undefined)
  const [dashboard, setDashboard] = useState<DashboardState>(initialState)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [hydrated, setHydrated] = useState(false)
  const [busy, setBusy] = useState<string>()
  const [toast, setToast] = useState<string>()
  const [error, setError] = useState<ActionableError>()
  const [aiPrompt, setAiPrompt] = useState('revenue opportunities')
  const [aiOutput, setAiOutput] = useState<string[]>([])
  const [profileOutput, setProfileOutput] = useState<string>()
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [pasteText, setPasteText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [batchStatuses, setBatchStatuses] = useState<BatchImportStatus[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [chartDraft, setChartDraft] = useState<ChartDraft>(
    defaultFieldSelection(initialState.lastResult),
  )
  const debug =
    settings.showDebug || new URLSearchParams(window.location.search).get('debug') === '1'

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const shared = parseShareHash(window.location.hash)
        const storedSettings = await loadSettings()

        if (cancelled) {
          return
        }

        if (shared) {
          applyBundle(shared)
          setToast('Shared dashboard restored')
          return
        }

        setSettings(storedSettings)
        const saved = await loadDashboard()

        if (cancelled) {
          return
        }

        if (saved) {
          setDashboard(saved)
          setActivity(saved.activity ?? [])
          setChartDraft(defaultFieldSelection(saved.lastResult))
          setToast('Dashboard restored')
        }
      } catch (reason: unknown) {
        setError(actionableError(reason))
      } finally {
        if (!cancelled) {
          setHydrated(true)
        }
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    void saveSettings(settings).catch((reason: unknown) => setError(actionableError(reason)))
  }, [hydrated, settings])

  useEffect(() => {
    if (!hydrated || !settings.autosave) {
      return
    }

    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      void saveDashboard({ ...dashboard, activity }).catch((reason: unknown) =>
        setError(actionableError(reason)),
      )
    }, 700)

    return () => window.clearTimeout(saveTimerRef.current)
  }, [activity, dashboard, hydrated, settings.autosave])

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
    await importFiles([file])
  }

  async function importFiles(files: File[]) {
    if (!files.length) {
      return
    }

    setBatchStatuses(
      files.map((file, index) => ({
        id: `${file.name}-${index}`,
        name: file.name,
        status: 'queued',
        message: 'Waiting',
      })),
    )

    await withBusy(
      `Importing ${files.length} file${files.length === 1 ? '' : 's'}`,
      async (isCurrent) => {
        let successes = 0
        let lastError: ActionableError | undefined

        for (const [index, file] of files.entries()) {
          setBatchStatus(index, { status: 'running', message: 'Reading' })

          try {
            if (isStateFile(file)) {
              await importStateText(await file.text(), file.name)
              setBatchStatus(index, { status: 'loaded', message: 'State restored' })
              successes += 1
              continue
            }

            const dataset = await loadDatasetFromFile(file)
            const result = await runRecommendedQuery(dataset)

            if (!isCurrent()) {
              return
            }

            commitDataset(dataset, result.sql, result)
            record('import', `Imported ${file.name}`, dataset.diagnosis?.shape)
            setBatchStatus(index, {
              status: 'loaded',
              message: `${dataset.rowCount.toLocaleString()} rows`,
            })
            successes += 1
          } catch (reason: unknown) {
            const detail = actionableError(reason)
            lastError = detail
            setBatchStatus(index, { status: 'failed', message: detail.what })

            if (files.length === 1) {
              throw new DataImportError(detail)
            }
          }
        }

        if (successes === 0 && lastError) {
          throw new DataImportError(lastError)
        }

        if (isCurrent()) {
          setToast(`${successes} of ${files.length} imports loaded`)
        }
      },
    )
  }

  async function importPastedText() {
    const text = pasteText.trim()

    if (!text) {
      setError({
        code: 'empty_paste',
        recoverable: true,
        what: 'There is no pasted table yet.',
        why: 'Paste import needs CSV or TSV text.',
        nextStep: 'Paste rows from a spreadsheet or CSV export, then import again.',
      })
      return
    }

    await importText('pasted-table.csv', text)
  }

  async function importClipboardText() {
    if (!navigator.clipboard?.readText) {
      setError({
        code: 'clipboard_unavailable',
        recoverable: true,
        what: 'Clipboard read is not available.',
        why: 'This browser or page permission blocks direct clipboard reads.',
        nextStep: 'Paste the table into the text box instead.',
      })
      return
    }

    const text = await navigator.clipboard.readText()
    setPasteText(text)
    await importText('clipboard-table.csv', text)
  }

  async function importText(name: string, text: string) {
    await withBusy(`Diagnosing ${name}`, async (isCurrent) => {
      const { loadTextIntoDuckDb } = await import('./features/data/duckdb')
      const dataset = await loadTextIntoDuckDb(name, text, 'csv')
      const result = await runRecommendedQuery(dataset)

      if (!isCurrent()) {
        return
      }

      commitDataset(dataset, result.sql, result)
      record('import', `Imported ${name}`, dataset.diagnosis?.shape)
      setToast('Pasted data diagnosed and first query ran')
    })
  }

  async function loadDatasetFromFile(file: File) {
    const { loadFileIntoDuckDb, loadParquetIntoDuckDb } = await import('./features/data/duckdb')
    return file.name.toLowerCase().endsWith('.parquet')
      ? loadParquetIntoDuckDb(file)
      : loadFileIntoDuckDb(file)
  }

  async function runRecommendedQuery(dataset: LoadedDataset) {
    const { executeSql } = await import('./features/data/duckdb')
    const sql = dataset.diagnosis?.recommendedAnalysis.sql ?? 'SELECT * FROM current_data LIMIT 100'
    return executeSql(sql)
  }

  async function importStateText(text: string, name: string) {
    const bundle = parseDashboardBundle(text)
    applyBundle(bundle)
    record('import', `Imported ${name}`, 'state bundle')
  }

  async function importStateFile(file: File) {
    await withBusy(`Restoring ${file.name}`, async () => {
      await importStateText(await file.text(), file.name)
      setToast('Dashboard state imported')
    })
  }

  function applyBundle(bundle: DashboardBundle) {
    setSettings(normalizeImportedSettings(bundle.settings))
    setDashboard(bundle.dashboard)
    setActivity(bundle.dashboard.activity ?? [])
    setChartDraft(defaultFieldSelection(bundle.dashboard.lastResult))
  }

  function setBatchStatus(index: number, patch: Pick<BatchImportStatus, 'status' | 'message'>) {
    setBatchStatuses((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }

  function isStateFile(file: File) {
    return file.name.toLowerCase().endsWith('.browser-bi.json')
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
      setChartDraft({ ...defaultFieldSelection(result), type: settings.defaultChart })
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

  function currentBundle() {
    return makeDashboardBundle({ ...dashboard, activity }, settings, __APP_VERSION__)
  }

  function requireResult() {
    if (!dashboard.lastResult) {
      throw new DataImportError({
        code: 'missing_result',
        recoverable: true,
        what: 'There is no result to export.',
        why: 'Exports use the current SQL result.',
        nextStep: 'Import data or run SQL first.',
      })
    }

    return dashboard.lastResult
  }

  async function downloadResultCsv() {
    try {
      const result = requireResult()
      downloadText(
        safeExportName(dashboard.dataset?.name ?? 'query-result', 'csv'),
        resultToCsv(result),
        'text/csv;charset=utf-8',
      )
      record('save', 'Exported CSV', `${result.rowCount} rows`)
      setToast('CSV exported')
    } catch (reason: unknown) {
      setError(actionableError(reason))
    }
  }

  async function downloadResultJson() {
    try {
      const result = requireResult()
      downloadText(
        safeExportName(dashboard.dataset?.name ?? 'query-result', 'json'),
        resultToJson(result, dashboard),
        'application/json;charset=utf-8',
      )
      record('save', 'Exported JSON', `${result.rowCount} rows`)
      setToast('JSON exported')
    } catch (reason: unknown) {
      setError(actionableError(reason))
    }
  }

  async function copyCurrentSql() {
    try {
      await copyText(dashboard.queryText)
      record('save', 'Copied SQL')
      setToast('SQL copied')
    } catch (reason: unknown) {
      setError(actionableError(reason))
    }
  }

  async function copyResultCsv() {
    try {
      await copyText(resultToCsv(requireResult()))
      record('save', 'Copied result CSV')
      setToast('CSV copied')
    } catch (reason: unknown) {
      setError(actionableError(reason))
    }
  }

  function exportStateFile() {
    try {
      downloadText(
        safeExportName(dashboard.dataset?.name ?? 'dashboard', 'browser-bi.json'),
        stableJson(currentBundle()),
        'application/json;charset=utf-8',
      )
      record('save', 'Exported dashboard state')
      setToast('State file exported')
    } catch (reason: unknown) {
      setError(actionableError(reason))
    }
  }

  async function shareDashboard() {
    try {
      const hash = createShareHash(currentBundle())
      const url = `${window.location.origin}${window.location.pathname}#${hash}`
      await copyText(url)
      window.history.replaceState(null, '', `#${hash}`)
      record('save', 'Copied share URL')
      setToast('Share URL copied')
    } catch (reason: unknown) {
      setError(actionableError(reason))
    }
  }

  function printDashboard() {
    record('save', 'Opened print view')
    window.print()
  }

  function showUrlGuidance() {
    setError({
      code: 'url_import_out_of_scope',
      recoverable: true,
      what: 'URL import is browser-limited.',
      why: sourceUrl
        ? 'Most data URLs block direct browser reads unless they explicitly allow CORS.'
        : 'No URL was entered.',
      nextStep: 'Download the CSV/TSV file, or paste the rendered table text into the paste box.',
    })
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

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragActive(false)
    void importFiles(Array.from(event.dataTransfer.files))
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave() {
    setDragActive(false)
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
          <section
            className={`panel drop-panel ${dragActive ? 'drag-active' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
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
                  multiple
                  accept=".csv,.tsv,.csv.gz,.gz,.parquet,.json,.zip,.browser-bi.json,text/csv,text/tab-separated-values,application/json"
                  disabled={isBusy}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? [])
                    if (files.length === 1) {
                      void importFile(files[0])
                    } else if (files.length > 1) {
                      void importFiles(files)
                    }
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <label className="file-button">
                <FileJson size={16} />
                State
                <input
                  type="file"
                  accept=".browser-bi.json,application/json"
                  disabled={isBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void importStateFile(file)
                    }
                    event.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
            <p className="drop-hint">Drop CSV, TSV, gzip CSV, Parquet, or state files here.</p>
            <BatchStatusList statuses={batchStatuses} />
            <DatasetSummary dataset={dashboard.dataset} />
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Paste</h2>
              <Clipboard size={17} />
            </div>
            <textarea
              className="paste-box"
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder="Paste CSV or TSV rows"
              aria-label="Paste CSV or TSV rows"
              disabled={isBusy}
            />
            <div className="button-row">
              <button type="button" onClick={importPastedText} disabled={isBusy}>
                <FileText size={16} />
                Import text
              </button>
              <button type="button" onClick={importClipboardText} disabled={isBusy}>
                <Clipboard size={16} />
                Clipboard
              </button>
            </div>
            <div className="url-guidance">
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://example.com/data.csv"
                aria-label="Data URL"
                disabled={isBusy}
              />
              <button type="button" onClick={showUrlGuidance} disabled={isBusy}>
                <Link2 size={16} />
                URL
              </button>
            </div>
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
            <ResultTable
              result={dashboard.lastResult}
              dataset={dashboard.dataset}
              maxRows={settings.maxPreviewRows}
            />
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

          <section className="panel">
            <div className="panel-title">
              <h2>Output</h2>
              <Download size={17} />
            </div>
            <div className="button-grid output-grid">
              <button type="button" onClick={downloadResultCsv} disabled={isBusy}>
                <Download size={16} />
                CSV
              </button>
              <button type="button" onClick={downloadResultJson} disabled={isBusy}>
                <FileJson size={16} />
                JSON
              </button>
              <button type="button" onClick={copyCurrentSql} disabled={isBusy}>
                <Clipboard size={16} />
                SQL
              </button>
              <button type="button" onClick={copyResultCsv} disabled={isBusy}>
                <Clipboard size={16} />
                Copy CSV
              </button>
              <button type="button" onClick={exportStateFile} disabled={isBusy}>
                <FileJson size={16} />
                State
              </button>
              <button type="button" onClick={shareDashboard} disabled={isBusy}>
                <Link2 size={16} />
                Share
              </button>
              <button type="button" onClick={printDashboard} disabled={isBusy}>
                <Printer size={16} />
                Print
              </button>
            </div>
          </section>

          <section className="panel settings-panel">
            <div className="panel-title">
              <h2>Settings</h2>
              <Settings size={17} />
            </div>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={settings.autosave}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, autosave: event.target.checked }))
                }
              />
              Autosave
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={settings.showDebug}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, showDebug: event.target.checked }))
                }
              />
              Debug
            </label>
            <label>
              Default chart
              <select
                value={settings.defaultChart}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    defaultChart: event.target.value as ChartType,
                  }))
                }
              >
                {(['bar', 'line', 'area', 'scatter', 'table'] satisfies ChartType[]).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preview rows
              <input
                type="number"
                min={25}
                max={500}
                step={25}
                value={settings.maxPreviewRows}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    maxPreviewRows: Number(event.target.value),
                  }))
                }
              />
            </label>
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

function BatchStatusList({ statuses }: { statuses: BatchImportStatus[] }) {
  if (!statuses.length) {
    return null
  }

  return (
    <div className="batch-status" aria-live="polite">
      {statuses.map((item) => (
        <p key={item.id} data-status={item.status}>
          <span>{item.name}</span>
          <strong>{item.message}</strong>
        </p>
      ))}
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

function ResultTable({
  result,
  dataset,
  maxRows,
}: {
  result?: QueryResult
  dataset?: LoadedDataset
  maxRows: number
}) {
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
          {rows.slice(0, maxRows).map((row, index) => (
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
