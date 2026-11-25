import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT_DIR } from './paths.js'
import { createApiMiddleware } from './api.js'

const PORT = Number(process.env.PORT || 4173)
const HOST = process.env.HOST || '127.0.0.1'
const DIST_DIR = path.join(ROOT_DIR, 'dist')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

const apiMiddleware = createApiMiddleware()

function serveStatic(req, res) {
  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('还没有构建产物，请先运行 npm run build。')
    return
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'

  let filePath = path.join(DIST_DIR, pathname)
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    ...(ext === '.html' ? { 'Cache-Control': 'no-cache' } : {})
  })
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer((req, res) => {
  apiMiddleware(req, res, () => serveStatic(req, res))
})

server.listen(PORT, HOST, () => {
  console.log(`礼物助手已启动：http://${HOST}:${PORT}`)
})
