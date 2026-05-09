import Papa from 'papaparse'
import type { AppSettings, DashboardBundle, DashboardState, QueryResult } from '../../types'

export function resultToCsv(result: QueryResult) {
  return Papa.unparse(result.rows, {
    columns: result.columns.map((column) => column.name),
    newline: '\n',
  })
}

export function resultToJson(result: QueryResult, dashboard: DashboardState) {
  return stableJson({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: dashboard.dataset
      ? {
          id: dashboard.dataset.id,
          name: dashboard.dataset.name,
          kind: dashboard.dataset.kind,
          sourceHash: dashboard.dataset.diagnosis?.sourceHash,
        }
      : undefined,
    query: result.sql,
    columns: result.columns,
    rows: result.rows,
  })
}

export function makeDashboardBundle(
  dashboard: DashboardState,
  settings: AppSettings,
  appVersion: string,
): DashboardBundle {
  return {
    bundleVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion,
    dashboard,
    settings,
  }
}

export function downloadText(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function copyText(text: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard write is blocked by this browser.')
  }

  await navigator.clipboard.writeText(text)
}

export function safeExportName(name: string, extension: string) {
  const base = name
    .toLowerCase()
    .replace(/\.[a-z0-9.]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${base || 'browser-bi'}-${new Date().toISOString().slice(0, 10)}.${extension}`
}

export function stableJson(value: unknown) {
  return `${JSON.stringify(value, stableReplacer, 2)}\n`
}

function stableReplacer(_key: string, value: unknown) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  )
}
