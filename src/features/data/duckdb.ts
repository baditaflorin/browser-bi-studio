import duckdbEhWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import duckdbEhWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import duckdbMvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import duckdbMvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { DatasetKind, LoadedDataset, QueryResult } from '../../types'
import { inferColumns, normalizeRow } from './schema'
import { prepareFileForImport, prepareTabularText } from './ingest'

let dbPromise: Promise<AsyncDuckDB> | undefined

export async function initializeDuckDb() {
  if (!dbPromise) {
    dbPromise = createDuckDb()
  }

  return dbPromise
}

async function createDuckDb() {
  const duckdb = await import('@duckdb/duckdb-wasm')
  const bundles = {
    mvp: {
      mainModule: duckdbMvpWasm,
      mainWorker: duckdbMvpWorker,
    },
    eh: {
      mainModule: duckdbEhWasm,
      mainWorker: duckdbEhWorker,
    },
  }
  const bundle = await duckdb.selectBundle(bundles)
  const worker = new Worker(bundle.mainWorker ?? duckdbMvpWorker)
  const logger = new duckdb.ConsoleLogger()
  const db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  return db
}

export async function loadCsvIntoDuckDb(name: string, csv: string): Promise<LoadedDataset> {
  return loadTextIntoDuckDb(name, csv, 'csv')
}

export async function loadTextIntoDuckDb(
  name: string,
  text: string,
  kind: DatasetKind = 'csv',
): Promise<LoadedDataset> {
  const prepared = prepareTabularText(name, text, kind === 'sample' ? 'sample' : 'csv')
  const db = await initializeDuckDb()
  const fileName = safeFileName(name || 'dataset.csv')
  await db.registerFileText(fileName, prepared.canonicalCsv)
  await runStatement(
    `CREATE OR REPLACE TABLE current_data AS SELECT * FROM read_csv_auto(${sqlString(fileName)}, HEADER = TRUE)`,
  )

  return {
    id: prepared.diagnosis.sourceId,
    name: fileName,
    kind,
    loadedAt: new Date().toISOString(),
    rowCount: prepared.rows.length,
    columns: prepared.columns,
    previewRows: prepared.rows.slice(0, 100),
    diagnosis: prepared.diagnosis,
  }
}

export async function loadFileIntoDuckDb(file: File): Promise<LoadedDataset> {
  const prepared = await prepareFileForImport(file)
  const db = await initializeDuckDb()
  const fileName = safeFileName(prepared.name || 'dataset.csv')
  await db.registerFileText(fileName, prepared.canonicalCsv)
  await runStatement(
    `CREATE OR REPLACE TABLE current_data AS SELECT * FROM read_csv_auto(${sqlString(fileName)}, HEADER = TRUE)`,
  )

  return {
    id: prepared.diagnosis.sourceId,
    name: fileName,
    kind: prepared.diagnosis.format === 'tsv' ? 'csv' : 'csv',
    loadedAt: new Date().toISOString(),
    rowCount: prepared.rows.length,
    columns: prepared.columns,
    previewRows: prepared.rows.slice(0, 100),
    diagnosis: prepared.diagnosis,
  }
}

export async function loadParquetIntoDuckDb(file: File): Promise<LoadedDataset> {
  const db = await initializeDuckDb()
  const fileName = safeFileName(file.name || 'dataset.parquet')
  const buffer = new Uint8Array(await file.arrayBuffer())
  await db.registerFileBuffer(fileName, buffer)
  await runStatement(
    `CREATE OR REPLACE TABLE current_data AS SELECT * FROM read_parquet(${sqlString(fileName)})`,
  )

  return describeCurrentDataset(fileName, 'parquet')
}

export async function executeSql(sql: string): Promise<QueryResult> {
  const start = performance.now()
  const db = await initializeDuckDb()
  const connection = await db.connect()

  try {
    const table = await connection.query(sql)
    const rows = arrowRows(table.toArray() as unknown[]).slice(0, 500)
    return {
      sql,
      rows,
      columns: inferColumns(rows),
      rowCount: rows.length,
      elapsedMs: Math.round(performance.now() - start),
    }
  } finally {
    await connection.close()
  }
}

async function describeCurrentDataset(name: string, kind: DatasetKind): Promise<LoadedDataset> {
  const preview = await executeSql('SELECT * FROM current_data LIMIT 100')
  const countResult = await executeSql('SELECT COUNT(*) AS row_count FROM current_data')
  const rowCountValue = countResult.rows[0]?.row_count
  const rowCount = typeof rowCountValue === 'number' ? rowCountValue : preview.rows.length

  return {
    id: `${kind}-${Date.now()}`,
    name,
    kind,
    loadedAt: new Date().toISOString(),
    rowCount,
    columns: preview.columns,
    previewRows: preview.rows,
  }
}

async function runStatement(statement: string) {
  const db = await initializeDuckDb()
  const connection = await db.connect()

  try {
    await connection.query(statement)
  } finally {
    await connection.close()
  }
}

function arrowRows(rows: unknown[]) {
  return rows.map(normalizeRow)
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}
