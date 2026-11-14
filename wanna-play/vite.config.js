import { defineConfig } from 'vite';

// Relative base so the build works at any path (Vercel root, a subfolder, or a static host).
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 900 } });
