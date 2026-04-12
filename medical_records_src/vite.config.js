import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/medical_records/',
  build: {
    outDir: '../medical_records',
    emptyOutDir: true,
  },
});
