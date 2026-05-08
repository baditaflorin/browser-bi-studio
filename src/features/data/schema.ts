import type { ColumnProfile, ColumnType, DataRow, PrimitiveValue } from '../../types'

export function normalizeValue(value: unknown): PrimitiveValue {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'bigint') {
    const asNumber = Number(value)
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString()
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  const text = String(value).trim()
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return Number(text)
  }

  if (text.toLowerCase() === 'true') {
    return true
  }

  if (text.toLowerCase() === 'false') {
    return false
  }

  return text
}

export function normalizeRow(row: unknown): DataRow {
  if (!row || typeof row !== 'object') {
    return {}
  }

  const maybeArrowRow = row as { toJSON?: () => unknown }
  const source = typeof maybeArrowRow.toJSON === 'function' ? maybeArrowRow.toJSON() : row

  if (!source || typeof source !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, normalizeValue(value)]),
  )
}

export function inferColumns(rows: DataRow[]): ColumnProfile[] {
  const names = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))

  return names.map((name) => {
    const values = rows.map((row) => row[name]).filter((value) => value !== null)
    return {
      name,
      type: inferType(values),
      nullable: rows.some((row) => row[name] === null || row[name] === undefined),
      distinctCount: new Set(values.map(String)).size,
    }
  })
}

export function inferType(values: PrimitiveValue[]): ColumnType {
  if (values.length === 0) {
    return 'string'
  }

  if (values.every((value) => typeof value === 'number')) {
    return 'number'
  }

  if (values.every((value) => typeof value === 'boolean')) {
    return 'boolean'
  }

  if (
    values.every(
      (value) => typeof value === 'string' && value.length >= 8 && !Number.isNaN(Date.parse(value)),
    )
  ) {
    return 'date'
  }

  return 'string'
}

export function numericColumns(columns: ColumnProfile[]) {
  return columns.filter((column) => column.type === 'number')
}

export function dimensionColumns(columns: ColumnProfile[]) {
  return columns.filter((column) => column.type !== 'number')
}
