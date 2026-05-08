import { copyFile, writeFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'

function safeExec(command, fallback) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return fallback
  }
}

const version = process.env.npm_package_version ?? '0.1.0'
const commit = process.env.VITE_GIT_COMMIT ?? safeExec('git rev-parse --short HEAD', 'dev')
const generatedAt = new Date().toISOString()

await copyFile('docs/index.html', 'docs/404.html')
await writeFile('docs/.nojekyll', '')
await writeFile(
  'docs/version.json',
  `${JSON.stringify({ version, commit, generatedAt }, null, 2)}\n`,
)
