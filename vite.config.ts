import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Set base for GitHub Pages project site
  base: '/kanban-pwa/',
  plugins: [react()],
})
