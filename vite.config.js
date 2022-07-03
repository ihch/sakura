import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsxFactory: 'Ownact.createElement'
  },
});
