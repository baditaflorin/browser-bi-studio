import type {
  ColumnProfile,
  ColumnType,
  Confidence,
  DataRow,
  PrimitiveValue,
  SemanticRole,
} from '../../types'

const missingTokens = new Set(['', '.', 'na', 'n/a', 'null', 'none', 'nan', '-', '--'])

export function normalizeValue(value: unknown): PrimitiveValue {
  if (value === null || value === undefined) {
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

  const text = normalizeText(String(value))
  const lower = text.toLowerCase()

  if (missingTokens.has(lower)) {
    return null
  }

  if (lower === 'true') {
    return true
  }

  if (lower === 'false') {
    return false
  }

  const money = parseMoney(text)
  if (money !== undefined) {
    return money
  }

  const number = parseNumber(text)
  if (number !== undefined) {
    return number
  }

  const date = normalizeDate(text)
  if (date) {
    return date
  }

  return text
}

export function normalizeText(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
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
    Object.entries(source).map(([key, value]) => [normalizeText(key), normalizeValue(value)]),
  )
}

export function inferColumns(rows: DataRow[]): ColumnProfile[] {
  const names = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))

  return names.map((name) => {
    const values = rows.map((row) => row[name]).filter((value) => value !== null)
    const type = inferType(values)
    const semantic = inferSemanticRole(name, values, type)
    const anomalies = inferAnomalies(name, rows, values, type, semantic.role)
    return {
      name,
      type,
      nullable: rows.some((row) => row[name] === null || row[name] === undefined),
      distinctCount: new Set(values.map(String)).size,
      semanticRole: semantic.role,
      confidence: semantic.confidence,
      reasons: semantic.reasons,
      anomalies,
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

function inferSemanticRole(
  name: string,
  values: PrimitiveValue[],
  type: ColumnType,
): { role: SemanticRole; confidence: Confidence; reasons: string[] } {
  const header = name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  const reasons: string[] = []
  const stringValues = values.map(String)

  if (/(^|_)lat(itude)?($|_)/.test(header)) {
    reasons.push('header indicates latitude')
    return { role: 'latitude', confidence: 'high', reasons }
  }

  if (/(^|_)(lon|lng|longitude)($|_)/.test(header)) {
    reasons.push('header indicates longitude')
    return { role: 'longitude', confidence: 'high', reasons }
  }

  if (/(^|_)(id|key|code|cik)($|_)|unique_key|host_id/.test(header)) {
    reasons.push('header indicates a stable identifier')
    return { role: 'id', confidence: 'high', reasons }
  }

  if (
    (/(date|time|year|created|closed|filed|review)/.test(header) &&
      (type === 'date' || type === 'number' || header.includes('date') || header === 'time')) ||
    type === 'date'
  ) {
    reasons.push(type === 'date' ? 'values parse as dates' : 'header indicates time')
    return { role: 'time', confidence: type === 'date' ? 'high' : 'medium', reasons }
  }

  if (/(zip|postal)/.test(header)) {
    reasons.push('header indicates a postal geography code')
    return { role: 'dimension', confidence: 'high', reasons }
  }

  if (
    /(price|amount|revenue|profit|sales|cost|gdp|co2|population|unrate|mag|magnitude|depth)/.test(
      header,
    )
  ) {
    reasons.push('header indicates a numeric business measure')
    return {
      role: /price|amount|revenue|profit|sales|cost/.test(header) ? 'money' : 'measure',
      confidence: type === 'number' ? 'high' : 'medium',
      reasons,
    }
  }

  if (
    /url|link|href|website/.test(header) ||
    stringValues.some((value) => /^https?:\/\//i.test(value))
  ) {
    reasons.push('header or values indicate URL')
    return { role: 'url', confidence: 'high', reasons }
  }

  if (
    /email/.test(header) ||
    stringValues.some((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  ) {
    reasons.push('header or values indicate email')
    return { role: 'email', confidence: 'high', reasons }
  }

  if (/status|state|stage/.test(header)) {
    reasons.push('header indicates workflow status')
    return { role: 'status', confidence: 'high', reasons }
  }

  if (type === 'number') {
    reasons.push('numeric values are usable as a measure')
    return { role: 'measure', confidence: 'medium', reasons }
  }

  const averageLength =
    stringValues.reduce((total, value) => total + value.length, 0) /
    Math.max(stringValues.length, 1)
  if (averageLength > 48) {
    reasons.push('values are long free text')
    return { role: 'text', confidence: 'medium', reasons }
  }

  reasons.push('text values repeat as categories')
  return { role: 'dimension', confidence: 'medium', reasons }
}

function inferAnomalies(
  name: string,
  rows: DataRow[],
  values: PrimitiveValue[],
  type: ColumnType,
  role: SemanticRole,
) {
  const anomalies: string[] = []
  const nullCount = rows.length - values.length
  const distinctCount = new Set(values.map(String)).size

  if (rows.length > 0 && nullCount / rows.length > 0.25) {
    anomalies.push('many missing values')
  }

  if (role === 'id' && distinctCount < values.length) {
    anomalies.push('identifier has duplicate values')
  }

  if (
    type === 'date' &&
    values.some((value) => typeof value === 'string' && value.startsWith('1900-'))
  ) {
    anomalies.push('date values include likely spreadsheet defaults')
  }

  if (role === 'dimension' && distinctCount > Math.max(20, rows.length * 0.9)) {
    anomalies.push('high-cardinality dimension')
  }

  if (role === 'money' && !/price|amount|revenue|profit|sales|cost/i.test(name)) {
    anomalies.push('money-like values detected without a money header')
  }

  return anomalies
}

function parseMoney(text: string) {
  const moneyMatch = text.match(/^[-+]?[$€£]\s?([0-9][0-9,.\s]*)$/)
  if (!moneyMatch) {
    return undefined
  }

  return parseNumber(moneyMatch[1])
}

function parseNumber(text: string) {
  const cleaned = text.replace(/\s/g, '')
  if (/^0\d+$/.test(cleaned)) {
    return undefined
  }

  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return Number(cleaned)
  }

  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    return Number(cleaned.replaceAll(',', ''))
  }

  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    return Number(cleaned.replaceAll('.', '').replace(',', '.'))
  }

  if (/^-?\d+,\d+$/.test(cleaned)) {
    return Number(cleaned.replace(',', '.'))
  }

  return undefined
}

function normalizeDate(text: string) {
  if (/^\d{4}$/.test(text)) {
    return text
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text)
    return Number.isNaN(date.valueOf()) ? undefined : date.toISOString().slice(0, 10)
  }

  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const [, day, month, year] = dmy
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return undefined
}
