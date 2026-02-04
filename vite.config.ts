import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - split large third-party libraries
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            // Firebase (modular imports)
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            // PDF libraries
            if (id.includes('pdfjs-dist') || id.includes('pdf-parse')) {
              return 'pdf-vendor';
            }
            // Canvas/Image libraries
            if (id.includes('html2canvas') || id.includes('jspdf')) {
              return 'canvas-vendor';
            }
            // UI libraries
            if (id.includes('lucide-react') || id.includes('react-dropzone')) {
              return 'ui-vendor';
            }
            // All other node_modules
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600, // Reasonable limit for well-split bundles
  },
});
