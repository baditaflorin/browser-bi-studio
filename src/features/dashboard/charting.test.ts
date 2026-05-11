import { describe, expect, it } from 'vitest'
import { chartRows, defaultFieldSelection, recommendChart } from './charting'
import type { ColumnProfile } from '../../types'

const columns: ColumnProfile[] = [
  {
    name: 'region',
    type: 'string',
    nullable: false,
    distinctCount: 2,
    semanticRole: 'dimension',
    confidence: 'high',
    reasons: ['test fixture'],
    anomalies: [],
  },
  {
    name: 'revenue',
    type: 'number',
    nullable: false,
    distinctCount: 10,
    semanticRole: 'money',
    confidence: 'high',
    reasons: ['test fixture'],
    anomalies: [],
  },
]

describe('charting', () => {
  it('recommends a bar chart for dimensions and measures', () => {
    expect(recommendChart(columns)).toBe('bar')
    expect(
      defaultFieldSelection({
        sql: '',
        columns,
        rows: [],
        rowCount: 0,
        elapsedMs: 0,
      }),
    ).toEqual({
      type: 'bar',
      xField: 'region',
      yField: 'revenue',
      aggregation: 'sum',
    })
  })

  it('aggregates counts when no y field is selected', () => {
    expect(
      chartRows({
        xField: 'region',
        yField: '',
        type: 'bar',
        rows: [{ region: 'North' }, { region: 'North' }, { region: 'South' }],
      }),
    ).toEqual([
      { region: 'North', count: 2 },
      { region: 'South', count: 1 },
    ])
  })

  it('sums duplicate y values per x by default — the bug the previous build had', () => {
    // Before the aggregation fix this returned the raw 4-row array and Plotly
    // drew four bars stacked at two x positions.
    expect(
      chartRows({
        xField: 'region',
        yField: 'revenue',
        type: 'bar',
        rows: [
          { region: 'North', revenue: 100 },
          { region: 'North', revenue: 50 },
          { region: 'South', revenue: 80 },
          { region: 'South', revenue: 20 },
        ],
      }),
    ).toEqual([
      { region: 'North', revenue: 150 },
      { region: 'South', revenue: 100 },
    ])
  })

  it('respects an explicit average aggregation', () => {
    expect(
      chartRows({
        xField: 'region',
        yField: 'revenue',
        type: 'bar',
        aggregation: 'avg',
        rows: [
          { region: 'North', revenue: 100 },
          { region: 'North', revenue: 50 },
          { region: 'South', revenue: 80 },
        ],
      }),
    ).toEqual([
      { region: 'North', revenue: 75 },
      { region: 'South', revenue: 80 },
    ])
  })

  it('takes a min / max correctly', () => {
    const baseline = {
      xField: 'region',
      yField: 'revenue',
      type: 'bar' as const,
      rows: [
        { region: 'North', revenue: 100 },
        { region: 'North', revenue: 30 },
        { region: 'South', revenue: 80 },
      ],
    }
    expect(chartRows({ ...baseline, aggregation: 'min' })).toEqual([
      { region: 'North', revenue: 30 },
      { region: 'South', revenue: 80 },
    ])
    expect(chartRows({ ...baseline, aggregation: 'max' })).toEqual([
      { region: 'North', revenue: 100 },
      { region: 'South', revenue: 80 },
    ])
  })

  it('skips aggregation for scatter so cluster density survives', () => {
    const rows = [
      { region: 'North', revenue: 100 },
      { region: 'North', revenue: 50 },
      { region: 'South', revenue: 80 },
    ]
    expect(
      chartRows({
        xField: 'region',
        yField: 'revenue',
        type: 'scatter',
        rows,
      }),
    ).toEqual(rows)
  })

  it('ignores non-numeric y values rather than producing NaN', () => {
    expect(
      chartRows({
        xField: 'region',
        yField: 'revenue',
        type: 'bar',
        rows: [
          { region: 'North', revenue: 100 },
          { region: 'North', revenue: 'unknown' as unknown as number },
          { region: 'North', revenue: 50 },
        ],
      }),
    ).toEqual([{ region: 'North', revenue: 150 }])
  })

  it('preserves the original x value type (numbers stay numbers)', () => {
    expect(
      chartRows({
        xField: 'year',
        yField: 'revenue',
        type: 'bar',
        rows: [
          { year: 2024, revenue: 100 },
          { year: 2024, revenue: 50 },
          { year: 2025, revenue: 200 },
        ],
      }),
    ).toEqual([
      { year: 2024, revenue: 150 },
      { year: 2025, revenue: 200 },
    ])
  })
})
