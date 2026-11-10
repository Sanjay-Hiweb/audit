import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { countlyApiPlugin } from './vite-api-plugin';

export default defineConfig({
  plugins: [react(), countlyApiPlugin()],
  server: {
    host: true,
    port: 5173
  }
});
