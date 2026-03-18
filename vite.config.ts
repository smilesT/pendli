import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/pendli/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw-custom.ts',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'pendli — ÖV-Tagesplaner',
        short_name: 'pendli',
        description: 'Dein smarter ÖV-Tagesplaner für die Schweiz',
        theme_color: '#1A1A2E',
        background_color: '#FAFAF8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/pendli/',
        scope: '/pendli/',
        icons: [
          { src: '/pendli/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pendli/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pendli/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        share_target: {
          action: '/pendli/import',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
        file_handlers: [{
          action: '/pendli/import',
          accept: {
            'text/calendar': ['.ics']
          }
        }]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      }
    })
  ]
});
