import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { assertProjectEnv } from '../../scripts/vite-env-guard';

export default defineConfig(({ command, mode }) => {
  // The landing has no Firebase config; it only needs where the admin lives.
  if (command === 'build') assertProjectEnv('landing', mode, loadEnv(mode, __dirname, 'VITE_'), ['VITE_ADMIN_URL'], false);
  return { plugins: [react()], server: { port: 5177 } };
});
