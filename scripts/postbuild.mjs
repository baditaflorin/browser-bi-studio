import { copyFile, writeFile } from 'node:fs/promises'

const version = process.env.npm_package_version ?? '0.1.0'
const commit = process.env.VITE_GIT_COMMIT ?? 'live-main'
const generatedAt = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : 'deterministic-local-build'

await copyFile('docs/index.html', 'docs/404.html')
await writeFile('docs/.nojekyll', '')
await writeFile(
  'docs/version.json',
  `${JSON.stringify({ version, commit, generatedAt }, null, 2)}\n`,
)
