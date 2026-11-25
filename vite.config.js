import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createApiMiddleware } from './server/api.js'

/**
 * 开发模式下由 Vite 直接挂载 /api，前后端同源，不需要额外的代理进程。
 * 生产模式见 server/index.js（构建后 node server/index.js）。
 */
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'gift-assistant-api',
      configureServer(server) {
        server.middlewares.use(createApiMiddleware())
      }
    }
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        '**/.*',
        '**/.*/**',
        '**/*.tmp',
        '**/data/**',
        '**/dist/**',
        '**/docs/**',
        '**/.tmp-*/**',
        '**/.pnpm-store/**'
      ]
    }
  }
})
