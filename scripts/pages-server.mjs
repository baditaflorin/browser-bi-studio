import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const root = join(process.cwd(), 'docs')
const basePath = '/browser-bi-studio'
const port = Number(process.env.PORT ?? 4173)
const host = '127.0.0.1'

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.wasm', 'application/wasm'],
])

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${host}:${port}`)
    let pathname = decodeURIComponent(url.pathname)

    if (pathname === '/') {
      response.writeHead(302, { Location: `${basePath}/` })
      response.end()
      return
    }

    if (!pathname.startsWith(basePath)) {
      response.writeHead(404)
      response.end('Not found')
      return
    }

    pathname = pathname.slice(basePath.length) || '/'
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const normalizedPath = normalize(relativePath)

    if (normalizedPath.startsWith('..')) {
      response.writeHead(403)
      response.end('Forbidden')
      return
    }

    const filePath = join(root, normalizedPath)
    const file = await readFile(filePath).catch(() => readFile(join(root, 'index.html')))
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(extname(filePath)) ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    response.end(file)
  } catch (error) {
    response.writeHead(500)
    response.end(error instanceof Error ? error.message : 'Server error')
  }
})

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}${basePath}/`)
})
