// Corre siempre al terminar (pasen o fallen los tests). Si queda algo vivo, la
// corrida falla: DEV debe quedar limpio.
import { runCleanup } from './lib/cleanup.mjs';

export default async function globalTeardown() {
  const { total, leftovers } = await runCleanup();
  if (total > 0) throw new Error(`Teardown dejó restos en DEV: ${JSON.stringify(leftovers)}. Corre: npm run cleanup`);
}
