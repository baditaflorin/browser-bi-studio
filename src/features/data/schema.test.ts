import { describe, expect, it } from 'vitest'
import { inferColumns, normalizeRow } from './schema'

describe('schema inference', () => {
  it('normalizes primitive values and infers column types', () => {
    const rows = [
      normalizeRow({
        region: 'North',
        revenue: 10,
        active: true,
        day: '2026-01-01',
      }),
      normalizeRow({
        region: 'South',
        revenue: 12,
        active: false,
        day: '2026-01-02',
      }),
    ]

    expect(inferColumns(rows)).toMatchObject([
      { name: 'region', type: 'string', distinctCount: 2 },
      { name: 'revenue', type: 'number', distinctCount: 2 },
      { name: 'active', type: 'boolean', distinctCount: 2 },
      { name: 'day', type: 'date', distinctCount: 2 },
    ])
  })
})
