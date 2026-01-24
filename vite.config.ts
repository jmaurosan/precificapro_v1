import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/functions/v1': {
        target: 'https://yktthhpupvegkwsqhwtv.supabase.co',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
