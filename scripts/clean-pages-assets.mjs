import { rm } from 'node:fs/promises'

const paths = [
  'docs/assets',
  'docs/index.html',
  'docs/404.html',
  'docs/.nojekyll',
  'docs/version.json',
  'docs/favicon.svg',
  'docs/icons.svg',
  'docs/manifest.webmanifest',
  'docs/sw.js',
]

await Promise.all(paths.map((path) => rm(path, { recursive: true, force: true })))
