import { z } from 'zod'
import type { AppSettings, DashboardBundle } from '../../types'
import { dashboardSchema, defaultSettings, settingsSchema } from './persistence'

export const dashboardBundleSchema: z.ZodType<DashboardBundle> = z.object({
  bundleVersion: z.literal(1),
  exportedAt: z.string(),
  appVersion: z.string(),
  dashboard: dashboardSchema,
  settings: settingsSchema.optional(),
})

export function parseDashboardBundle(text: string): DashboardBundle {
  return dashboardBundleSchema.parse(JSON.parse(text))
}

export function normalizeImportedSettings(settings: AppSettings | undefined): AppSettings {
  return settingsSchema.parse(settings ?? defaultSettings)
}

export function createShareHash(bundle: DashboardBundle) {
  const json = JSON.stringify(bundle)

  if (json.length > 6000) {
    throw new Error('This dashboard is too large for a share URL. Export a state file instead.')
  }

  return `state=${toUrlBase64(json)}`
}

export function parseShareHash(hash: string): DashboardBundle | undefined {
  const normalized = hash.startsWith('#') ? hash.slice(1) : hash

  if (!normalized.startsWith('state=')) {
    return undefined
  }

  return parseDashboardBundle(fromUrlBase64(normalized.slice('state='.length)))
}

function toUrlBase64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromUrlBase64(value: string) {
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
