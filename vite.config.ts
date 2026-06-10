import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/agents': 'http://187.124.66.30:50348',
      '/memory': 'http://187.124.66.30:50348',
      '/workflows': 'http://187.124.66.30:50348',
      '/documents': 'http://187.124.66.30:50348',
      '/metrics': 'http://187.124.66.30:50348',
      '/chat': 'http://187.124.66.30:50348',
      '/org': 'http://187.124.66.30:50348',
      '/settings': 'http://187.124.66.30:50348',
      '/terminal': 'http://187.124.66.30:50348',
      '/health': 'http://187.124.66.30:50348',
      '/status': 'http://187.124.66.30:50348',
      '/api': 'http://187.124.66.30:50348',
      '/ws': {
        target: 'ws://187.124.66.30:50348',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-reactflow': ['reactflow'],
          'vendor-zustand': ['zustand'],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
})
