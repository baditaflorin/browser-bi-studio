import type { ColumnProfile, DataRow } from '../../types'

type PipelineRunner = (
  input: string | string[],
  options?: Record<string, unknown>,
) => Promise<unknown>

type TransformersModule = {
  pipeline: (task: string, model: string) => Promise<PipelineRunner>
  env?: {
    allowLocalModels?: boolean
  }
}

let extractorPromise: Promise<PipelineRunner> | undefined

export async function semanticColumnSearch(columns: ColumnProfile[], query: string) {
  const extractor = await getExtractor()
  const labels = columns.map((column) => `${column.name} ${column.type}`)
  const vectors = await embed(extractor, [query, ...labels])
  const queryVector = vectors[0] ?? []

  return labels
    .map((label, index) => ({
      label,
      column: columns[index],
      score: cosineSimilarity(queryVector, vectors[index + 1] ?? []),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

export function deterministicSuggestions(
  columns: ColumnProfile[],
  rows: DataRow[],
  prompt: string,
) {
  const measures = columns.filter((column) => column.type === 'number')
  const dimensions = columns.filter((column) => column.type !== 'number')
  const topMeasure = measures[0]?.name ?? 'orders'
  const topDimension = dimensions[0]?.name ?? 'segment'
  const sampleSize = rows.length
  const ask = prompt.trim() || 'dashboard'

  return [
    `Use a bar chart for ${topMeasure} by ${topDimension}.`,
    `Add a table tile filtered to the top ${Math.min(sampleSize, 10)} rows for auditability.`,
    `For "${ask}", start with: SELECT ${topDimension}, SUM(${topMeasure}) AS ${topMeasure} FROM current_data GROUP BY ${topDimension} ORDER BY ${topMeasure} DESC.`,
  ]
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers').then(async (module) => {
      const transformers = module as unknown as TransformersModule
      if (transformers.env) {
        transformers.env.allowLocalModels = false
      }
      return transformers.pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2')
    })
  }

  return extractorPromise
}

async function embed(extractor: PipelineRunner, texts: string[]) {
  const output = await extractor(texts, { pooling: 'mean', normalize: true })
  return vectorsFromUnknown(output)
}

function vectorsFromUnknown(value: unknown): number[][] {
  if (Array.isArray(value)) {
    return value.map((item) => toNumberArray(item))
  }

  const maybeTensor = value as { tolist?: () => unknown }
  if (typeof maybeTensor?.tolist === 'function') {
    return vectorsFromUnknown(maybeTensor.tolist())
  }

  return []
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  if (Array.isArray(value[0])) {
    return toNumberArray(value[0])
  }

  return value.filter((item): item is number => typeof item === 'number')
}

function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index]
    normA += a[index] * a[index]
    normB += b[index] * b[index]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
