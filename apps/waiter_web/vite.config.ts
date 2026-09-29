import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { assertProjectEnv, FIREBASE_KEYS } from '../../scripts/vite-env-guard';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') assertProjectEnv('waiter_web', mode, loadEnv(mode, __dirname, 'VITE_'), [...FIREBASE_KEYS]);
  return {
    plugins: [react()],
    server: { port: 5178 },
  };
});
