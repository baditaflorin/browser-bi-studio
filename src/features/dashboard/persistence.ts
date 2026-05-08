import { openDB } from 'idb'
import { z } from 'zod'
import type { DashboardState } from '../../types'

const dashboardSchema = z.object({
  version: z.literal(1),
  dataset: z.unknown().optional(),
  queryText: z.string(),
  lastResult: z.unknown().optional(),
  tiles: z.array(z.unknown()),
  savedAt: z.string().optional(),
})

const databaseName = 'browser-bi-studio'
const storeName = 'dashboards'
const stateKey = 'default'

export async function saveDashboard(state: DashboardState) {
  const db = await openDashboardDb()
  await db.put(storeName, { ...state, savedAt: new Date().toISOString() }, stateKey)
}

export async function loadDashboard(): Promise<DashboardState | undefined> {
  const db = await openDashboardDb()
  const value = await db.get(storeName, stateKey)
  const parsed = dashboardSchema.safeParse(value)

  if (!parsed.success) {
    return undefined
  }

  return parsed.data as DashboardState
}

export async function clearDashboard() {
  const db = await openDashboardDb()
  await db.delete(storeName, stateKey)
}

function openDashboardDb() {
  return openDB(databaseName, 1, {
    upgrade(db) {
      db.createObjectStore(storeName)
    },
  })
}
