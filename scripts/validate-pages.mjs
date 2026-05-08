import { access, readFile } from 'node:fs/promises'

await access('docs/index.html')
await access('docs/404.html')
await access('docs/.nojekyll')

const html = await readFile('docs/index.html', 'utf8')

if (!html.includes('/browser-bi-studio/assets/')) {
  throw new Error('docs/index.html does not include the expected GitHub Pages base path')
}

if (!html.includes('<div id="root">')) {
  throw new Error('docs/index.html is missing the React root')
}

console.log('Pages output is valid.')
