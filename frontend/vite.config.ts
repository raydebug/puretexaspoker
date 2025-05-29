import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'

// Custom middleware to set content-type header
const setContentTypeMiddleware = (): Connect.NextHandleFunction => {
  return (req, res, next) => {
    res.setHeader('Content-Type', 'text/html')
    next()
  }
}

// Custom plugin to add the middleware
const contentTypePlugin = (): Plugin => ({
  name: 'content-type',
  configureServer(server) {
    server.middlewares.use(setContentTypeMiddleware())
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), contentTypePlugin()],
  server: {
    port: 3000,
    strictPort: true,
    middlewareMode: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 3000,
    strictPort: true
  }
}) 