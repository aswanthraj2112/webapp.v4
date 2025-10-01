import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow external connections
    open: false,
    cors: true,
    origin: 'http://n11817143-videoapp.cab432.com:3000'
  }
});
