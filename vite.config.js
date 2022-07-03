import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  esbuild: {
    jsxFactory: 'Ownact.createElement'
  },
  plugins: [
    react({
      jsxRuntime: 'classic',
    })
  ],
});
