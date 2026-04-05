import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/user': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/wallet': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/ramp': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/mento': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/transfer': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
})