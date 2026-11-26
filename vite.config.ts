import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths: works at a subpath (GitHub Pages: /Timer/) and inside the iOS app.
  base: './',
  // Support older iPhones (iOS 14+), not just recent Safari.
  build: { target: ['es2019', 'safari14'], cssTarget: ['safari14'] },
})
