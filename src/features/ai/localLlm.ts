import type { ColumnProfile, DataRow } from '../../types'
import { deterministicSuggestions } from './semanticSearch'

type ChatMessage = {
  role: 'system' | 'user'
  content: string
}

type WebLlmModule = {
  CreateMLCEngine: (
    model: string,
    options?: {
      initProgressCallback?: (progress: { text?: string; progress?: number }) => void
    },
  ) => Promise<{
    chat: {
      completions: {
        create: (request: { messages: ChatMessage[]; temperature: number }) => Promise<{
          choices?: Array<{ message?: { content?: string } }>
        }>
      }
    }
  }>
}

export async function askLocalLlm(
  columns: ColumnProfile[],
  rows: DataRow[],
  prompt: string,
  onProgress: (message: string) => void,
) {
  try {
    const module = (await import('@mlc-ai/web-llm')) as unknown as WebLlmModule
    const engine = await module.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
      initProgressCallback: (progress) => {
        onProgress(progress.text ?? `Loading model ${Math.round((progress.progress ?? 0) * 100)}%`)
      },
    })
    const response = await engine.chat.completions.create({
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a local BI copilot. Return concise dashboard recommendations and SQL only.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt,
            columns,
            sampleRows: rows.slice(0, 8),
          }),
        },
      ],
    })

    return response.choices?.[0]?.message?.content ?? fallback(columns, rows, prompt)
  } catch {
    return fallback(columns, rows, prompt)
  }
}

function fallback(columns: ColumnProfile[], rows: DataRow[], prompt: string) {
  return deterministicSuggestions(columns, rows, prompt).join('\n')
}
