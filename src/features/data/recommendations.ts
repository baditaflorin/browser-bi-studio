import type { ColumnProfile, DataRow, DatasetShape, RecommendedAnalysis } from '../../types'

export function inferDatasetShape(columns: ColumnProfile[]): DatasetShape {
  const hasLat = columns.some((column) => column.semanticRole === 'latitude')
  const hasLon = columns.some((column) => column.semanticRole === 'longitude')
  const hasTime = columns.some((column) => column.semanticRole === 'time')
  const measures = columns.filter(
    (column) => column.semanticRole === 'measure' || column.semanticRole === 'money',
  )
  const dimensions = columns.filter((column) => column.semanticRole === 'dimension')
  const wideYears = columns.filter(
    (column) => /^\d{4}$/.test(column.name) && column.type === 'number',
  )

  if (hasLat && hasLon) {
    return 'geospatial'
  }

  if (wideYears.length >= 2) {
    return 'wide-year-panel'
  }

  if (hasTime && dimensions.length > 0 && measures.length > 0) {
    return 'panel'
  }

  if (hasTime && measures.length > 0) {
    return 'time-series'
  }

  if (dimensions.length > 0) {
    return 'categorical-counts'
  }

  return 'unknown'
}

export function recommendAnalysis(columns: ColumnProfile[], rows: DataRow[]): RecommendedAnalysis {
  const shape = inferDatasetShape(columns)
  const lat = columns.find((column) => column.semanticRole === 'latitude')
  const lon = columns.find((column) => column.semanticRole === 'longitude')
  const time = columns.find((column) => column.semanticRole === 'time')
  const money = columns.find((column) => column.semanticRole === 'money')
  const measure =
    money ??
    preferredMeasure(columns) ??
    columns.find((column) => column.semanticRole === 'measure')
  const dimension =
    preferredDimension(columns) ??
    columns.find((column) => ['dimension', 'status'].includes(column.semanticRole)) ??
    columns.find((column) => column.type === 'string')
  const wideYear = columns
    .filter((column) => /^\d{4}$/.test(column.name) && column.type === 'number')
    .sort((a, b) => b.name.localeCompare(a.name))
  const stableWideYear = wideYear[1] ?? wideYear[0]

  if (shape === 'geospatial' && lat && lon) {
    const y = measure?.name ?? ''
    return {
      sql: `SELECT ${ident(lat.name)}, ${ident(lon.name)}${y ? `, ${ident(y)}` : ''} FROM current_data WHERE ${ident(lat.name)} IS NOT NULL AND ${ident(lon.name)} IS NOT NULL LIMIT 500`,
      chartType: 'scatter',
      xField: lon.name,
      yField: y || lat.name,
      confidence: measure ? 'high' : 'medium',
      reasons: ['latitude and longitude fields were detected'],
    }
  }

  if ((shape === 'time-series' || shape === 'panel') && time && measure) {
    return {
      sql: `SELECT ${ident(time.name)}, AVG(${ident(measure.name)}) AS ${ident(measure.name)} FROM current_data WHERE ${ident(measure.name)} IS NOT NULL GROUP BY ${ident(time.name)} ORDER BY ${ident(time.name)} LIMIT 500`,
      chartType: 'line',
      xField: time.name,
      yField: measure.name,
      confidence: 'high',
      reasons: ['time field and numeric measure were detected'],
    }
  }

  if (shape === 'wide-year-panel' && dimension && stableWideYear) {
    return {
      sql: `SELECT ${ident(dimension.name)}, ${ident(stableWideYear.name)} FROM current_data WHERE ${ident(stableWideYear.name)} IS NOT NULL ORDER BY ${ident(stableWideYear.name)} DESC LIMIT 50`,
      chartType: 'bar',
      xField: dimension.name,
      yField: stableWideYear.name,
      confidence: 'medium',
      reasons: ['wide year columns look like a panel export'],
    }
  }

  if (dimension && measure) {
    return {
      sql: `SELECT ${ident(dimension.name)}, SUM(${ident(measure.name)}) AS ${ident(measure.name)} FROM current_data WHERE ${ident(measure.name)} IS NOT NULL GROUP BY ${ident(dimension.name)} ORDER BY ${ident(measure.name)} DESC LIMIT 50`,
      chartType: 'bar',
      xField: dimension.name,
      yField: measure.name,
      confidence: 'medium',
      reasons: ['dimension and numeric measure were detected'],
    }
  }

  if (dimension) {
    return {
      sql: `SELECT ${ident(dimension.name)}, COUNT(*) AS count FROM current_data GROUP BY ${ident(dimension.name)} ORDER BY count DESC LIMIT 50`,
      chartType: 'bar',
      xField: dimension.name,
      yField: 'count',
      confidence: rows.length > 0 ? 'medium' : 'low',
      reasons: ['categorical field was detected'],
    }
  }

  return {
    sql: 'SELECT * FROM current_data LIMIT 100',
    chartType: 'table',
    xField: columns[0]?.name ?? '',
    yField: '',
    confidence: 'low',
    reasons: ['no obvious dimension or measure was detected'],
  }
}

export function ident(name: string) {
  return `"${name.replaceAll('"', '""')}"`
}

function preferredMeasure(columns: ColumnProfile[]) {
  const priorities = [/^mag(nitude)?$/i, /^co2$/i, /unrate/i, /revenue/i, /amount/i, /price/i]
  return priorities
    .map((pattern) =>
      columns.find((column) => column.semanticRole === 'measure' && pattern.test(column.name)),
    )
    .find(Boolean)
}

function preferredDimension(columns: ColumnProfile[]) {
  const priorities = [
    /complaint.*type/i,
    /category/i,
    /neighbou?rhood/i,
    /country name/i,
    /^country$/i,
    /region/i,
  ]
  return priorities
    .map((pattern) =>
      columns.find(
        (column) =>
          ['dimension', 'status'].includes(column.semanticRole) && pattern.test(column.name),
      ),
    )
    .find(Boolean)
}
