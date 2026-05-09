import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { DataImportError } from '../../src/features/data/errors'
import { prepareFileForImport, prepareTabularText } from '../../src/features/data/ingest'
import type { SemanticRole } from '../../src/types'

type ExpectedFixture = {
  outcome: 'pass' | 'pass-with-warning' | 'recoverable-error'
  format: 'csv' | 'tsv' | 'gzip-csv' | 'json'
  delimiter?: string
  shape?: string
  headerRowIndex?: number
  requiredRoles?: Record<string, SemanticRole>
  chart?: string
  queryContains?: string[]
  requiredIssueCodes?: string[]
  maxIssues?: number
  errorCode?: string
  nextStepIncludes?: string
}

const fixturesDir = fileURLToPath(new URL('../fixtures/realdata/', import.meta.url))
const tabularFixtures = [
  'usgs-earthquakes.csv',
  'fred-unrate.csv',
  'owid-co2.csv',
  'nyc-311.csv',
  'inside-airbnb-listings.csv',
  'inside-airbnb-listings.csv.gz',
  'worldbank-population-metadata.csv',
  'eurostat-population.tsv',
  'partial-nyc-311.csv',
  'excel-cp1252-export.csv',
]

describe('real-data import inference', () => {
  it.each(tabularFixtures)('diagnoses %s deterministically', (fileName) => {
    const expected = readExpected(fileName)
    const prepared = prepareTabularFixture(fileName)
    const repeated = prepareTabularFixture(fileName)
    const diagnosis = prepared.diagnosis

    expect(snapshot(prepared)).toEqual(snapshot(repeated))
    expect(diagnosis.format).toBe(expected.format)
    expect(diagnosis.shape).toBe(expected.shape)
    expect(['high', 'medium', 'low']).toContain(diagnosis.confidence)

    if (expected.delimiter) {
      expect(diagnosis.delimiter).toBe(expected.delimiter)
    }

    if (expected.headerRowIndex !== undefined) {
      expect(diagnosis.headerRowIndex).toBe(expected.headerRowIndex)
    }

    for (const [name, role] of Object.entries(expected.requiredRoles ?? {})) {
      expect(prepared.columns.find((column) => column.name === name)?.semanticRole).toBe(role)
    }

    if (expected.chart) {
      expect(diagnosis.recommendedAnalysis.chartType).toBe(expected.chart)
    }

    for (const token of expected.queryContains ?? []) {
      expect(diagnosis.recommendedAnalysis.sql.toLowerCase()).toContain(token.toLowerCase())
    }

    for (const code of expected.requiredIssueCodes ?? []) {
      expect(diagnosis.issues.map((issue) => issue.code)).toContain(code)
    }

    if (expected.maxIssues !== undefined) {
      expect(diagnosis.issues.length).toBeLessThanOrEqual(expected.maxIssues)
    }
  })

  it('turns nested JSON into a recoverable import error', async () => {
    const fileName = 'sec-companyfacts.json'
    const expected = readExpected(fileName)
    const bytes = readFileSync(join(fixturesDir, fileName))
    const file = new File([bytes], fileName, { type: 'application/json' })

    await expect(prepareFileForImport(file)).rejects.toMatchObject({
      detail: {
        code: expected.errorCode,
        recoverable: true,
      },
    })

    try {
      await prepareFileForImport(file)
    } catch (error) {
      expect(error).toBeInstanceOf(DataImportError)
      const detail = error instanceof DataImportError ? error.detail : undefined
      expect(detail?.nextStep.toLowerCase()).toContain(expected.nextStepIncludes ?? '')
    }
  })
})

function prepareTabularFixture(fileName: string) {
  const sourcePath = join(fixturesDir, fileName)

  if (fileName.endsWith('.csv.gz')) {
    const text = gunzipSync(readFileSync(sourcePath)).toString('utf8')
    return prepareTabularText(fileName, text, 'gzip-csv')
  }

  const format = fileName.endsWith('.tsv') ? 'tsv' : 'csv'
  return prepareTabularText(fileName, readFileSync(sourcePath, 'utf8'), format)
}

function readExpected(fileName: string): ExpectedFixture {
  const expectedName = fileName.endsWith('.csv.gz')
    ? `${fileName}.expected.json`
    : `${basename(fileName, fileName.slice(fileName.lastIndexOf('.')))}.expected.json`
  return JSON.parse(readFileSync(join(fixturesDir, expectedName), 'utf8')) as ExpectedFixture
}

function snapshot(prepared: ReturnType<typeof prepareTabularFixture>) {
  return {
    columns: prepared.columns.map((column) => ({
      name: column.name,
      type: column.type,
      semanticRole: column.semanticRole,
      confidence: column.confidence,
      anomalies: column.anomalies,
    })),
    diagnosis: {
      sourceId: prepared.diagnosis.sourceId,
      sourceHash: prepared.diagnosis.sourceHash,
      format: prepared.diagnosis.format,
      delimiter: prepared.diagnosis.delimiter,
      headerRowIndex: prepared.diagnosis.headerRowIndex,
      rowCount: prepared.diagnosis.rowCount,
      shape: prepared.diagnosis.shape,
      confidence: prepared.diagnosis.confidence,
      issues: prepared.diagnosis.issues,
      recommendedAnalysis: prepared.diagnosis.recommendedAnalysis,
    },
  }
}
