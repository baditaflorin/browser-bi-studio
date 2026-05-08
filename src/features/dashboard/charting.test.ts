import { describe, expect, it } from 'vitest'
import { chartRows, defaultFieldSelection, recommendChart } from './charting'
import type { ColumnProfile } from '../../types'

const columns: ColumnProfile[] = [
  { name: 'region', type: 'string', nullable: false, distinctCount: 2 },
  { name: 'revenue', type: 'number', nullable: false, distinctCount: 10 },
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
    })
  })

  it('aggregates counts when no y field is selected', () => {
    expect(
      chartRows({
        xField: 'region',
        yField: '',
        rows: [{ region: 'North' }, { region: 'North' }, { region: 'South' }],
      }),
    ).toEqual([
      { region: 'North', count: 2 },
      { region: 'South', count: 1 },
    ])
  })
})
