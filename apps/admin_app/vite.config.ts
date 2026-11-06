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

  const src = path.resolve(__dirname, './src')
  const alias: { find: string | RegExp; replacement: string }[] = [{ find: '@', replacement: src }]

  // Demo mode (`npm run demo`): the dev server only. Firebase is swapped for in-memory
  // Pick & Eat fixtures (src/demo) so the UI can be seen, tested and photographed without
  // credentials. `build` never takes this branch, so nothing from src/demo ships.
  const demo = command === 'serve' && mode === 'demo'
  const define: Record<string, string> = {}
  if (demo) {
    const demoDir = path.join(src, 'demo')
    alias.unshift(
      { find: /^@\/lib\/firebase$/, replacement: path.join(demoDir, 'firebase.ts') },
      { find: /^@\/services\/auth\.service$/, replacement: path.join(demoDir, 'auth.service.ts') },
      { find: /^@\/services\/branch\.service$/, replacement: path.join(demoDir, 'branch.service.ts') },
      { find: /^@\/services\/fiscal\.service$/, replacement: path.join(demoDir, 'fiscal.service.ts') },
      { find: /^@\/services\/order\.service$/, replacement: path.join(demoDir, 'order.service.ts') },
      { find: /^@\/services\/organization\.service$/, replacement: path.join(demoDir, 'organization.service.ts') },
      { find: /^@\/services\/report\.service$/, replacement: path.join(demoDir, 'report.service.ts') },
      { find: /^@\/services\/station\.service$/, replacement: path.join(demoDir, 'station.service.ts') },
    )
    // Reserved ".invalid" hosts: they never resolve, so a demo click cannot reach a real service.
    for (const key of ['VITE_CUSTOMER_APP_URL', 'VITE_WAITER_APP_URL', 'VITE_KDS_APP_URL', 'VITE_BFF_URL']) {
      define[`import.meta.env.${key}`] = JSON.stringify('https://demo.invalid')
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias },
    define,
  }
})
