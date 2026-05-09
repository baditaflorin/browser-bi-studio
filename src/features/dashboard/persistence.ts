import { openDB } from 'idb'
import { z } from 'zod'
import type {
  ActivityEvent,
  AppSettings,
  ChartTile,
  ColumnProfile,
  DashboardState,
  DataRow,
  DatasetDiagnosis,
  LoadedDataset,
  QueryResult,
} from '../../types'

export const defaultSettings: AppSettings = {
  version: 1,
  autosave: true,
  showDebug: false,
  defaultChart: 'bar',
  maxPreviewRows: 100,
}

const primitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
const rowSchema: z.ZodType<DataRow> = z.record(z.string(), primitiveSchema)

const columnSchema: z.ZodType<ColumnProfile> = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'date']),
  nullable: z.boolean(),
  distinctCount: z.number(),
  semanticRole: z.enum([
    'dimension',
    'measure',
    'money',
    'time',
    'id',
    'url',
    'email',
    'latitude',
    'longitude',
    'status',
    'text',
  ]),
  confidence: z.enum(['high', 'medium', 'low']),
  reasons: z.array(z.string()),
  anomalies: z.array(z.string()),
})

const issueSchema = z.object({
  code: z.string(),
  severity: z.enum(['info', 'warning', 'error']),
  field: z.string().optional(),
  what: z.string(),
  why: z.string(),
  nextStep: z.string(),
})

const diagnosisSchema: z.ZodType<DatasetDiagnosis> = z.object({
  schemaVersion: z.literal(2),
  sourceId: z.string(),
  sourceName: z.string(),
  sourceHash: z.string(),
  format: z.enum(['csv', 'tsv', 'gzip-csv', 'parquet', 'json', 'zip', 'sample']),
  delimiter: z.string().optional(),
  encoding: z.string(),
  headerRowIndex: z.number(),
  rowCount: z.number(),
  shape: z.enum([
    'unknown',
    'time-series',
    'panel',
    'wide-year-panel',
    'categorical-counts',
    'geospatial',
    'nested-json',
  ]),
  confidence: z.enum(['high', 'medium', 'low']),
  issues: z.array(issueSchema),
  recommendedAnalysis: z.object({
    sql: z.string(),
    chartType: z.enum(['bar', 'line', 'area', 'scatter', 'table']),
    xField: z.string(),
    yField: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    reasons: z.array(z.string()),
  }),
  importMs: z.number(),
})

const datasetSchema: z.ZodType<LoadedDataset> = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['csv', 'parquet', 'sample']),
  loadedAt: z.string(),
  rowCount: z.number(),
  columns: z.array(columnSchema),
  previewRows: z.array(rowSchema),
  diagnosis: diagnosisSchema.optional(),
})

const queryResultSchema: z.ZodType<QueryResult> = z.object({
  sql: z.string(),
  columns: z.array(columnSchema),
  rows: z.array(rowSchema),
  rowCount: z.number(),
  elapsedMs: z.number(),
})

const chartTileSchema: z.ZodType<ChartTile> = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['bar', 'line', 'area', 'scatter', 'table']),
  xField: z.string(),
  yField: z.string(),
  rows: z.array(rowSchema),
  createdAt: z.string(),
})

const activitySchema: z.ZodType<ActivityEvent> = z.object({
  id: z.string(),
  at: z.string(),
  kind: z.enum(['import', 'query', 'chart', 'save', 'error', 'cancel']),
  label: z.string(),
  details: z.string().optional(),
})

export const dashboardSchema: z.ZodType<DashboardState> = z.object({
  version: z.literal(1),
  dataset: datasetSchema.optional(),
  queryText: z.string(),
  lastResult: queryResultSchema.optional(),
  tiles: z.array(chartTileSchema),
  activity: z.array(activitySchema).optional(),
  savedAt: z.string().optional(),
})

export const settingsSchema: z.ZodType<AppSettings> = z
  .object({
    version: z.literal(1),
    autosave: z.boolean(),
    showDebug: z.boolean(),
    defaultChart: z.enum(['bar', 'line', 'area', 'scatter', 'table']),
    maxPreviewRows: z.number().min(25).max(500),
  })
  .catch(defaultSettings)

const databaseName = 'browser-bi-studio'
const dashboardStoreName = 'dashboards'
const settingsStoreName = 'settings'
const stateKey = 'default'
const settingsKey = 'default'

export async function saveDashboard(state: DashboardState) {
  const db = await openDashboardDb()
  await db.put(dashboardStoreName, { ...state, savedAt: new Date().toISOString() }, stateKey)
}

export async function loadDashboard(): Promise<DashboardState | undefined> {
  const db = await openDashboardDb()
  const value = await db.get(dashboardStoreName, stateKey)
  const parsed = dashboardSchema.safeParse(value)

  if (!parsed.success) {
    return undefined
  }

  return parsed.data as DashboardState
}

export async function clearDashboard() {
  const db = await openDashboardDb()
  await db.delete(dashboardStoreName, stateKey)
}

export async function saveSettings(settings: AppSettings) {
  const db = await openDashboardDb()
  await db.put(settingsStoreName, settings, settingsKey)
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await openDashboardDb()
  const value = await db.get(settingsStoreName, settingsKey)
  return settingsSchema.parse(value)
}

function openDashboardDb() {
  return openDB(databaseName, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(dashboardStoreName)) {
        db.createObjectStore(dashboardStoreName)
      }
      if (!db.objectStoreNames.contains(settingsStoreName)) {
        db.createObjectStore(settingsStoreName)
      }
    },
  })
}
