import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    {
      name: 'rename-html',
      enforce: 'post',
      generateBundle(options, bundle) {
        if (bundle['index.html']) {
          bundle['output.html'] = bundle['index.html']
          bundle['output.html'].fileName = 'output.html'
          delete bundle['index.html']
        }
      }
    }
  ],
  build: {
    outDir: 'dist'
  }
})
