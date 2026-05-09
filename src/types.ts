export type PrimitiveValue = string | number | boolean | null

export type DataRow = Record<string, PrimitiveValue>

export type ColumnType = 'string' | 'number' | 'boolean' | 'date'

export type DatasetKind = 'csv' | 'parquet' | 'sample'

export type Confidence = 'high' | 'medium' | 'low'

export type SemanticRole =
  | 'dimension'
  | 'measure'
  | 'money'
  | 'time'
  | 'id'
  | 'url'
  | 'email'
  | 'latitude'
  | 'longitude'
  | 'status'
  | 'text'

export type DatasetShape =
  | 'unknown'
  | 'time-series'
  | 'panel'
  | 'wide-year-panel'
  | 'categorical-counts'
  | 'geospatial'
  | 'nested-json'

export type IssueSeverity = 'info' | 'warning' | 'error'

export type DatasetIssue = {
  code: string
  severity: IssueSeverity
  field?: string
  what: string
  why: string
  nextStep: string
}

export type InferenceExplanation = {
  confidence: Confidence
  reasons: string[]
  anomalies: string[]
}

export type ColumnProfile = {
  name: string
  type: ColumnType
  nullable: boolean
  distinctCount: number
  semanticRole: SemanticRole
  confidence: Confidence
  reasons: string[]
  anomalies: string[]
}

export type RecommendedAnalysis = {
  sql: string
  chartType: ChartType
  xField: string
  yField: string
  confidence: Confidence
  reasons: string[]
}

export type DatasetDiagnosis = {
  schemaVersion: 2
  sourceId: string
  sourceName: string
  sourceHash: string
  format: 'csv' | 'tsv' | 'gzip-csv' | 'parquet' | 'json' | 'zip' | 'sample'
  delimiter?: string
  encoding: string
  headerRowIndex: number
  rowCount: number
  shape: DatasetShape
  confidence: Confidence
  issues: DatasetIssue[]
  recommendedAnalysis: RecommendedAnalysis
  importMs: number
}

export type LoadedDataset = {
  id: string
  name: string
  kind: DatasetKind
  loadedAt: string
  rowCount: number
  columns: ColumnProfile[]
  previewRows: DataRow[]
  diagnosis?: DatasetDiagnosis
}

export type QueryResult = {
  sql: string
  columns: ColumnProfile[]
  rows: DataRow[]
  rowCount: number
  elapsedMs: number
}

export type ChartType = 'bar' | 'line' | 'area' | 'scatter' | 'table'

export type ChartTile = {
  id: string
  title: string
  type: ChartType
  xField: string
  yField: string
  rows: DataRow[]
  createdAt: string
}

export type DashboardState = {
  version: 1
  dataset?: LoadedDataset
  queryText: string
  lastResult?: QueryResult
  tiles: ChartTile[]
  savedAt?: string
  activity?: ActivityEvent[]
}

export type ActivityEvent = {
  id: string
  at: string
  kind: 'import' | 'query' | 'chart' | 'save' | 'error' | 'cancel'
  label: string
  details?: string
}

export type OperationState =
  | {
      name:
        | 'idle-empty'
        | 'loaded-empty'
        | 'loaded-some'
        | 'loaded-many'
        | 'loaded-too-many'
        | 'charted'
        | 'saved'
    }
  | {
      name: 'importing' | 'querying' | 'saving'
      label: string
      startedAt: number
      cancellable: boolean
    }
  | { name: 'error-recoverable' | 'error-fatal'; message: ActionableError }
  | { name: 'cancelled'; label: string }

export type ActionableError = {
  code: string
  recoverable: boolean
  what: string
  why: string
  nextStep: string
}

export type VersionMetadata = {
  version: string
  buildCommit: string
  liveCommit: string
  commitUrl: string
}
