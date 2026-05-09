import { describe, expect, it } from 'vitest'
import { makeDashboardBundle, resultToCsv, stableJson } from '../../src/features/dashboard/exports'
import { defaultSettings } from '../../src/features/dashboard/persistence'
import {
  createShareHash,
  parseDashboardBundle,
  parseShareHash,
} from '../../src/features/dashboard/stateBundle'
import type { ColumnProfile, DashboardState, QueryResult } from '../../src/types'

const columns: ColumnProfile[] = [
  {
    name: 'region',
    type: 'string',
    nullable: false,
    distinctCount: 2,
    semanticRole: 'dimension',
    confidence: 'high',
    reasons: ['test'],
    anomalies: [],
  },
  {
    name: 'revenue',
    type: 'number',
    nullable: false,
    distinctCount: 2,
    semanticRole: 'money',
    confidence: 'high',
    reasons: ['test'],
    anomalies: [],
  },
]

const result: QueryResult = {
  sql: 'SELECT region, revenue FROM current_data',
  columns,
  rows: [
    { region: 'North', revenue: 10 },
    { region: 'South', revenue: 12 },
  ],
  rowCount: 2,
  elapsedMs: 4,
}

const dashboard: DashboardState = {
  version: 1,
  queryText: result.sql,
  lastResult: result,
  tiles: [],
}

describe('dashboard exports', () => {
  it('exports result rows as stable CSV', () => {
    expect(resultToCsv(result)).toBe('region,revenue\nNorth,10\nSouth,12')
  })

  it('round-trips a dashboard state bundle', () => {
    const bundle = makeDashboardBundle(dashboard, defaultSettings, '0.2.0')
    const parsed = parseDashboardBundle(stableJson(bundle))

    expect(parsed.dashboard.lastResult?.rowCount).toBe(2)
    expect(parsed.settings?.autosave).toBe(true)
  })

  it('round-trips small dashboard state through a share hash', () => {
    const bundle = makeDashboardBundle(dashboard, defaultSettings, '0.2.0')
    const hash = createShareHash(bundle)

    expect(hash).toMatch(/^state=/)
    expect(parseShareHash(`#${hash}`)?.dashboard.queryText).toBe(result.sql)
  })
})
