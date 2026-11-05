// `npm run cleanup`: deshace a mano lo que dejó una corrida interrumpida.
import { runCleanup } from './lib/cleanup.mjs';

const { total } = await runCleanup();
process.exit(total === 0 ? 0 : 1);
