import type { ChartTile, ChartType, ColumnProfile, DataRow, QueryResult } from '../../types'
import { dimensionColumns, numericColumns } from '../data/schema'

export function recommendChart(columns: ColumnProfile[]): ChartType {
  const measures = numericColumns(columns)
  const dimensions = dimensionColumns(columns)

  if (
    columns.some((column) => column.semanticRole === 'latitude') &&
    columns.some((column) => column.semanticRole === 'longitude')
  ) {
    return 'scatter'
  }

  if (columns.some((column) => column.semanticRole === 'time') && measures.length > 0) {
    return 'line'
  }

  if (columns.length <= 3 && measures.length === 0) {
    return 'table'
  }

  if (dimensions.some((column) => column.type === 'date') && measures.length > 0) {
    return 'line'
  }

  if (dimensions.length > 0 && measures.length > 0) {
    return 'bar'
  }

  return 'table'
}

export function createChartTile(
  result: QueryResult,
  type: ChartType,
  xField: string,
  yField: string,
): ChartTile {
  const fallbackTitle = type === 'table' ? 'Result table' : `${yField || 'Count'} by ${xField}`

  return {
    id: crypto.randomUUID(),
    title: fallbackTitle,
    type,
    xField,
    yField,
    rows: result.rows,
    createdAt: new Date().toISOString(),
  }
}

export function chartRows(tile: Pick<ChartTile, 'rows' | 'xField' | 'yField'>): DataRow[] {
  if (!tile.xField) {
    return tile.rows
  }

  if (tile.yField) {
    return tile.rows
  }

  const counts = new Map<string, number>()

  for (const row of tile.rows) {
    const key = String(row[tile.xField] ?? 'empty')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return Array.from(counts.entries()).map(([key, value]) => ({
    [tile.xField]: key,
    count: value,
  }))
}

export function defaultFieldSelection(result?: QueryResult) {
  const columns = result?.columns ?? []
  const longitude = columns.find((column) => column.semanticRole === 'longitude')?.name
  const latitude = columns.find((column) => column.semanticRole === 'latitude')?.name
  const firstTime = columns.find((column) => column.semanticRole === 'time')?.name
  const firstDimension =
    longitude ??
    firstTime ??
    columns.find((column) => ['dimension', 'status'].includes(column.semanticRole))?.name ??
    dimensionColumns(columns)[0]?.name ??
    columns[0]?.name ??
    ''
  const firstMeasure =
    latitude ??
    columns.find((column) => ['money', 'measure'].includes(column.semanticRole))?.name ??
    numericColumns(columns)[0]?.name ??
    ''

  return {
    xField: firstDimension,
    yField: firstMeasure,
    type: recommendChart(columns),
  }
}
