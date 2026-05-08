export type PrimitiveValue = string | number | boolean | null

export type DataRow = Record<string, PrimitiveValue>

export type ColumnType = 'string' | 'number' | 'boolean' | 'date'

export type DatasetKind = 'csv' | 'parquet' | 'sample'

export type ColumnProfile = {
  name: string
  type: ColumnType
  nullable: boolean
  distinctCount: number
}

export type LoadedDataset = {
  id: string
  name: string
  kind: DatasetKind
  loadedAt: string
  rowCount: number
  columns: ColumnProfile[]
  previewRows: DataRow[]
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
}

export type VersionMetadata = {
  version: string
  buildCommit: string
  liveCommit: string
  commitUrl: string
}
