import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const commit = process.env.VITE_GIT_COMMIT ?? safeExec('git rev-parse --short HEAD', 'dev')
const version = process.env.npm_package_version ?? '0.1.0'

function safeExec(command: string, fallback: string) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return fallback
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/browser-bi-studio/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __GIT_COMMIT__: JSON.stringify(commit),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
