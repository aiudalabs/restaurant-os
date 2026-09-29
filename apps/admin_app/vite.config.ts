import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { assertProjectEnv, FIREBASE_KEYS } from '../../scripts/vite-env-guard'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, __dirname, 'VITE_')
    assertProjectEnv('admin_app', mode, env, [
      ...FIREBASE_KEYS,
      'VITE_CUSTOMER_APP_URL',
      'VITE_WAITER_APP_URL',
      'VITE_KDS_APP_URL',
      'VITE_BFF_URL',
    ])
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
