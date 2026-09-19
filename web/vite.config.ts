import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: /api/* is proxied to the local Hono server (phase 2+).
// Prod: CloudFront routes /api/* to API Gateway (phase 4).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
