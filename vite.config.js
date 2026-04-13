import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// build: force refresh
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 3000,
  },
})
