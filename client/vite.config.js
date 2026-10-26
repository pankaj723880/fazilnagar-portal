import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api/google-drive/media': {
        target: 'https://fazilnagar-portal-l95o.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-leaflet': ['leaflet'],
          'vendor-icons': ['lucide-react'],
          'vendor-network': ['axios', 'socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})