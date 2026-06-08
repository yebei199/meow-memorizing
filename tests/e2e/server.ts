// Minimal static server for e2e tests. Serves the test pages at `/` and the
// generated wasm glue at `/wasm/` so the bench test can import the real
// wasm-bindgen module over http. Uses node:http (typed by @types/node) so it
// runs under bun and typechecks under tsc.
import { createReadStream, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const PAGES = resolve(here, 'pages')
const WASM = resolve(here, '../../src/wasm/generated')

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.wasm': 'application/wasm',
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let path = url.pathname
  let base = PAGES
  if (path.startsWith('/wasm/')) {
    base = WASM
    path = path.slice('/wasm/'.length)
  } else {
    path = path.replace(/^\/+/, '')
  }
  if (path === '') path = 'sample.html'

  const file = resolve(base, path)
  if (!file.startsWith(base) || !existsSync(file)) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  res.writeHead(200, {
    'content-type':
      TYPES[extname(file)] ?? 'application/octet-stream',
  })
  createReadStream(file).pipe(res)
}).listen(5199, '127.0.0.1', () => {
  console.log('e2e server on http://127.0.0.1:5199')
})
