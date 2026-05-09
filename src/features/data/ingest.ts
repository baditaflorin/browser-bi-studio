import Papa from 'papaparse'
import type { DataRow, DatasetDiagnosis, DatasetIssue } from '../../types'
import { normalizeRow } from './schema'
import { inferColumns } from './schema'
import { inferDatasetShape, recommendAnalysis } from './recommendations'
import { stableHash } from './hash'
import { DataImportError } from './errors'

export type PreparedTextDataset = {
  name: string
  canonicalCsv: string
  rows: DataRow[]
  columns: ReturnType<typeof inferColumns>
  diagnosis: DatasetDiagnosis
}

type TextFormat = 'csv' | 'tsv' | 'gzip-csv' | 'json' | 'zip' | 'sample'

const delimiters = [',', '\t', ';', '|']
const sizeBudgets = [
  { bytes: 10 * 1024 * 1024, severity: 'info' as const, label: 'smooth browser import budget' },
  { bytes: 50 * 1024 * 1024, severity: 'warning' as const, label: 'large browser import' },
  { bytes: 100 * 1024 * 1024, severity: 'error' as const, label: 'browser cliff' },
]

export async function prepareFileForImport(file: File): Promise<PreparedTextDataset> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const issues: DatasetIssue[] = sizeIssues(bytes.byteLength)
  const signature = detectSignature(file.name, bytes)

  if (signature === 'zip') {
    throw new DataImportError({
      code: 'unsupported_zip_container',
      recoverable: true,
      what: 'This looks like a ZIP download, not a table.',
      why: 'Many data portals put CSV files inside ZIP archives with metadata files.',
      nextStep: 'Extract the CSV inside the ZIP, then upload that CSV.',
    })
  }

  if (signature === 'json') {
    throw new DataImportError({
      code: 'unsupported_nested_json',
      recoverable: true,
      what: 'This is nested JSON, not a flat table.',
      why: 'Browser BI Studio needs rows and columns before it can query or chart data.',
      nextStep: 'Flatten the JSON facts into a CSV/Parquet table, then import that file.',
    })
  }

  const text =
    signature === 'gzip-csv'
      ? await decompressGzip(bytes).catch(() => {
          throw new DataImportError({
            code: 'gzip_decompression_failed',
            recoverable: true,
            what: 'The compressed CSV could not be decompressed.',
            why: 'The file may be corrupted or the browser cannot read gzip streams.',
            nextStep: 'Upload the uncompressed CSV version of the file.',
          })
        })
      : decodeBytes(bytes)

  return prepareTabularText(file.name, text, signature, issues)
}

export function prepareTabularText(
  name: string,
  text: string,
  explicitFormat: TextFormat = 'csv',
  inheritedIssues: DatasetIssue[] = [],
): PreparedTextDataset {
  const start = performance.now()
  const sourceHash = stableHash(text)
  const normalized = normalizeInputText(text)
  const truncated = trimTruncatedTail(normalized)
  const delimiter = explicitFormat === 'tsv' ? '\t' : sniffDelimiter(truncated.text)
  const headerRowIndex = findHeaderRow(truncated.text, delimiter)
  const tabularText = truncated.text.split(/\r?\n/).slice(headerRowIndex).join('\n')
  const parse = Papa.parse<Record<string, unknown>>(tabularText, {
    header: true,
    delimiter,
    dynamicTyping: false,
    skipEmptyLines: true,
  })
  const rows = parse.data.map(normalizeRow).filter((row) => Object.keys(row).length > 0)
  const columns = inferColumns(rows)
  const shape = inferDatasetShape(columns)
  const recommendedAnalysis = recommendAnalysis(columns, rows)
  const parseIssues = parse.errors.slice(0, 5).map<DatasetIssue>((error) => ({
    code: 'csv_parse_warning',
    severity: 'warning',
    what: 'A row did not match the detected table shape.',
    why: error.message,
    nextStep: 'Review the highlighted rows or re-export the source file as CSV.',
  }))
  const issues = [
    ...inheritedIssues,
    ...truncated.issues,
    ...parseIssues,
    ...columnIssues(columns),
    ...shapeIssues(shape, rows.length),
  ].sort((a, b) => `${a.severity}:${a.code}`.localeCompare(`${b.severity}:${b.code}`))
  const format =
    explicitFormat === 'sample'
      ? 'sample'
      : explicitFormat === 'gzip-csv'
        ? 'gzip-csv'
        : delimiter === '\t'
          ? 'tsv'
          : 'csv'
  const canonicalCsv = Papa.unparse(rows, {
    columns: columns.map((column) => column.name),
    newline: '\n',
  })

  return {
    name,
    canonicalCsv,
    rows,
    columns,
    diagnosis: {
      schemaVersion: 2,
      sourceId: stableId(name, sourceHash),
      sourceName: name,
      sourceHash,
      format,
      delimiter,
      encoding: 'utf-8-normalized',
      headerRowIndex,
      rowCount: rows.length,
      shape,
      confidence: recommendedAnalysis.confidence,
      issues,
      recommendedAnalysis,
      importMs: Math.round(performance.now() - start),
    },
  }
}

function detectSignature(name: string, bytes: Uint8Array): TextFormat {
  const lower = name.toLowerCase()

  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return 'gzip-csv'
  }

  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return 'zip'
  }

  const textStart = decodeBytes(bytes.slice(0, 64)).trimStart()
  if (lower.endsWith('.json') || textStart.startsWith('{') || textStart.startsWith('[')) {
    return 'json'
  }

  if (lower.endsWith('.tsv')) {
    return 'tsv'
  }

  return 'csv'
}

function decodeBytes(bytes: Uint8Array) {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  const replacementCount = (utf8.match(/\uFFFD/g) ?? []).length

  if (replacementCount > Math.max(2, utf8.length * 0.01)) {
    return new TextDecoder('windows-1252', { fatal: false }).decode(bytes)
  }

  return utf8
}

async function decompressGzip(bytes: Uint8Array) {
  if ('DecompressionStream' in globalThis) {
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    const stream = new Blob([copy.buffer as ArrayBuffer])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'))
    return new Response(stream).text()
  }

  throw new Error('gzip unavailable')
}

function normalizeInputText(text: string) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
}

function trimTruncatedTail(text: string): { text: string; issues: DatasetIssue[] } {
  const quoteCount = (text.match(/"/g) ?? []).length
  const lastLineBreak = text.lastIndexOf('\n')

  if (quoteCount % 2 === 1 && lastLineBreak > 0) {
    return {
      text: text.slice(0, lastLineBreak),
      issues: [
        {
          code: 'truncated_final_row',
          severity: 'warning',
          what: 'The final row looks incomplete.',
          why: 'The file ended while a quoted field was still open.',
          nextStep:
            'The valid rows were kept. Re-export or re-upload the full file if rows are missing.',
        },
      ],
    }
  }

  return { text, issues: [] }
}

function sniffDelimiter(text: string) {
  const sample = text.split('\n').slice(0, 20)
  const scores = delimiters.map((delimiter) => ({
    delimiter,
    score: sample.reduce((total, line) => total + countDelimiter(line, delimiter), 0),
  }))
  return scores.sort(
    (a, b) =>
      b.score - a.score || delimiters.indexOf(a.delimiter) - delimiters.indexOf(b.delimiter),
  )[0].delimiter
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0
  let quoted = false

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted
    } else if (!quoted && char === delimiter) {
      count += 1
    }
  }

  return count
}

function findHeaderRow(text: string, delimiter: string) {
  const lines = text.split('\n').slice(0, 20)
  const scored = lines.map((line, index) => {
    const delimiterCount = countDelimiter(line, delimiter)
    const alphaCount = (line.match(/[A-Za-z_]/g) ?? []).length
    return { index, score: delimiterCount * 5 + Math.min(alphaCount, 20) - index }
  })

  return scored.sort((a, b) => b.score - a.score || a.index - b.index)[0]?.index ?? 0
}

function sizeIssues(size: number): DatasetIssue[] {
  const matched = sizeBudgets.filter((budget) => size > budget.bytes).at(-1)
  if (!matched) {
    return []
  }

  return [
    {
      code: matched.severity === 'error' ? 'input_too_large' : 'large_input',
      severity: matched.severity,
      what: 'This file is large for a browser-only workflow.',
      why: `It exceeds the ${matched.label} threshold.`,
      nextStep:
        matched.severity === 'error'
          ? 'Use a smaller excerpt or Parquet file before importing.'
          : 'Keep the tab open while the browser normalizes the data.',
    },
  ]
}

function columnIssues(columns: ReturnType<typeof inferColumns>): DatasetIssue[] {
  return columns.flatMap((column) =>
    column.anomalies.map((anomaly) => ({
      code: `column_${anomaly.replaceAll(' ', '_')}`,
      severity: 'warning' as const,
      field: column.name,
      what: `${column.name} has an anomaly.`,
      why: anomaly,
      nextStep: 'Verify the inferred type before relying on this field in a chart.',
    })),
  )
}

function shapeIssues(shape: string, rowCount: number): DatasetIssue[] {
  if (rowCount === 0) {
    return [
      {
        code: 'empty_dataset',
        severity: 'error',
        what: 'No usable rows were found.',
        why: 'The file is empty or the detected header does not match the rows.',
        nextStep: 'Check the source export and try again.',
      },
    ]
  }

  if (shape === 'unknown') {
    return [
      {
        code: 'low_structure_confidence',
        severity: 'warning',
        what: 'The table shape is unclear.',
        why: 'No obvious time, measure, dimension, or location fields were detected.',
        nextStep: 'Review column roles and run a custom SQL query.',
      },
    ]
  }

  return []
}

function stableId(name: string, hash: string) {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${hash}`
}
