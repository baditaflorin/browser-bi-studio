import Papa from 'papaparse'
import type { DataRow, LoadedDataset } from '../../types'
import { inferColumns, normalizeRow } from './schema'

export const sampleCsv = `date,region,segment,product,revenue,profit,orders
2026-01-02,North,Enterprise,Atlas,18420,5210,42
2026-01-03,South,SMB,Beacon,8420,1980,31
2026-01-04,West,Enterprise,Compass,22110,7340,53
2026-01-05,East,Midmarket,Atlas,13120,3420,38
2026-01-06,North,SMB,Delta,6120,1210,22
2026-01-07,South,Enterprise,Compass,17640,5840,47
2026-01-08,West,Midmarket,Beacon,11980,2660,35
2026-01-09,East,SMB,Delta,7340,1510,25
2026-01-10,North,Midmarket,Atlas,15300,4290,39
2026-01-11,South,SMB,Compass,9650,2210,29
2026-01-12,West,Enterprise,Atlas,24580,8110,58
2026-01-13,East,Midmarket,Beacon,12840,3160,36
2026-01-14,North,Enterprise,Delta,16820,4740,44
2026-01-15,South,Midmarket,Atlas,13780,3510,37
2026-01-16,West,SMB,Beacon,10420,2330,33
2026-01-17,East,Enterprise,Compass,20960,6920,51`

export function parseCsvRows(csv: string): DataRow[] {
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })

  return parsed.data.map(normalizeRow)
}

export function createSampleDataset(): LoadedDataset {
  const rows = parseCsvRows(sampleCsv)

  return {
    id: 'sample-sales',
    name: 'sample_sales.csv',
    kind: 'sample',
    loadedAt: new Date().toISOString(),
    rowCount: rows.length,
    columns: inferColumns(rows),
    previewRows: rows,
  }
}

export function defaultQuery() {
  return `SELECT
  region,
  segment,
  product,
  SUM(revenue) AS revenue,
  SUM(profit) AS profit,
  SUM(orders) AS orders
FROM current_data
GROUP BY region, segment, product
ORDER BY revenue DESC`
}
