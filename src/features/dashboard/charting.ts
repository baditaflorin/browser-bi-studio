import type {
  ChartAggregation,
  ChartTile,
  ChartType,
  ColumnProfile,
  DataRow,
  QueryResult,
} from '../../types'
import { dimensionColumns, numericColumns } from '../data/schema'

export const CHART_AGGREGATIONS: readonly ChartAggregation[] = [
  'sum',
  'avg',
  'count',
  'min',
  'max',
] as const

/**
 * Per-aggregation pretty labels used in axis titles and the picker.
 */
export const AGGREGATION_LABELS: Record<ChartAggregation, string> = {
  sum: 'Sum',
  avg: 'Average',
  count: 'Count',
  min: 'Min',
  max: 'Max',
}

function reduceAggregation(values: number[], agg: ChartAggregation): number {
  if (values.length === 0) return 0
  switch (agg) {
    case 'sum':
      return values.reduce((acc, v) => acc + v, 0)
    case 'avg':
      return values.reduce((acc, v) => acc + v, 0) / values.length
    case 'count':
      return values.length
    case 'min':
      return values.reduce((acc, v) => (v < acc ? v : acc), values[0]!)
    case 'max':
      return values.reduce((acc, v) => (v > acc ? v : acc), values[0]!)
  }
}

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
  aggregation: ChartAggregation = yField ? 'sum' : 'count',
): ChartTile {
  const yLabel = yField ? `${AGGREGATION_LABELS[aggregation]} ${yField}` : 'Count'
  const fallbackTitle = type === 'table' ? 'Result table' : `${yLabel} by ${xField}`

  return {
    id: crypto.randomUUID(),
    title: fallbackTitle,
    type,
    xField,
    yField,
    aggregation,
    rows: result.rows,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Collapse the raw query rows into the points the chart actually plots.
 *
 * The original implementation auto-counted only when yField was empty; if
 * yField was set, it returned the raw rows. That meant a grouped query
 * with repeating x-values (e.g. `SELECT category, revenue FROM orders`)
 * rendered as a forest of overlapping bars at the same x position, one per
 * row, with no visible aggregation. Real BI tools sum (or avg/min/max)
 * across duplicates. We do that here, defaulting to sum when yField is set
 * and count when it isn't, and surface the aggregation alongside the data
 * so the legend/axis can label it honestly.
 *
 * Scatter plots intentionally skip aggregation — each row is a distinct
 * point, and collapsing duplicates would hide cluster density. Tables and
 * raw exports are unaffected; only chartable types pass through here.
 */
export function chartRows(
  tile: Pick<ChartTile, 'rows' | 'xField' | 'yField' | 'type' | 'aggregation'>,
): DataRow[] {
  if (!tile.xField) {
    return tile.rows
  }

  // Scatter visualises distribution, not summary stats — keep every point.
  if (tile.type === 'scatter') {
    return tile.rows
  }

  const aggregation: ChartAggregation = tile.aggregation ?? (tile.yField ? 'sum' : 'count')
  const yKey = tile.yField || 'count'

  // Group rows by their x value, then reduce each group's y values.
  const groups = new Map<string, { key: unknown; values: number[] }>()
  for (const row of tile.rows) {
    const rawKey = row[tile.xField] ?? 'empty'
    const stringKey = String(rawKey)
    let bucket = groups.get(stringKey)
    if (!bucket) {
      bucket = { key: rawKey, values: [] }
      groups.set(stringKey, bucket)
    }
    if (tile.yField) {
      const raw = row[tile.yField]
      const numeric = typeof raw === 'number' ? raw : Number(raw)
      if (Number.isFinite(numeric)) {
        bucket.values.push(numeric)
      }
    } else {
      // No yField: each row contributes 1 toward the count.
      bucket.values.push(1)
    }
  }

  return Array.from(groups.values()).map((group) => ({
    [tile.xField]: group.key as DataRow[string],
    [yKey]: reduceAggregation(group.values, aggregation),
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
    aggregation: firstMeasure ? ('sum' as ChartAggregation) : ('count' as ChartAggregation),
  }
}
