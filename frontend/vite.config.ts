import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/runnerxbt/',
  plugins: [react()],
  server: {
    proxy: {
      '/runnerxbt/api': 'http://127.0.0.1:8000',
      '/runnerxbt/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
      '/runnerxbt/media': 'http://127.0.0.1:8000',
      '/api': 'http://127.0.0.1:8000',
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
      '/media': 'http://127.0.0.1:8000',
    },
  },
})
