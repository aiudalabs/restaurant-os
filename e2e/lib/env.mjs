// Constantes del ambiente DEV de Pick & Eat y la guarda que impide tocar prod.
// Todos los IDs vienen de docs/ENVIRONMENTS.md, AGENTS.md y de los datos de dev
// (leídos de Firestore); ninguno es inventado.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PROJECT = 'restaurant-os-dev-49096';
export const PROD_PROJECT = 'restaurant-os-68c79';
export const GCLOUD_ACCOUNT = 'admin@aiudalabs.com';
export const REGION = 'us-central1';

export const ORG = '07OfcB2trnuJlb7XBIZn';
export const BRANCH = 'rnYMQIjihcRQYFwCmPND';
export const STATION = 'fiscal-demo-cocina';

export const URLS = {
  customer: `https://restaurant-os-dev-pedir.web.app/?org=${ORG}&branch=${BRANCH}`,
  customerBase: 'https://restaurant-os-dev-pedir.web.app',
  waiter: `https://restaurant-os-dev-mesero.web.app/?branch=${BRANCH}`,
  kitchen: `https://restaurant-os-dev-cocina.web.app/?station=${STATION}`,
  admin: 'https://restaurant-os-dev-49096.web.app',
  rtdb: 'https://restaurant-os-dev-49096-default-rtdb.firebaseio.com',
  firestore: `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`,
  identity: `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`,
  functions: `https://${REGION}-${PROJECT}.cloudfunctions.net`,
};

/** Prefijo con el que se marca todo pedido de la batería (customerName). */
export const ORDER_PREFIX = 'E2E-';
/** Marca de los documentos de usuario temporales. */
export const TAG = 'e2e-temp';

// Productos del menú de la sucursal (lectura de products/ en dev). La categoría
// fiscal-demo-pizzas es la única que enruta a la estación fiscal-demo-cocina.
export const PRODUCT = {
  margarita: { id: 'fiscal-demo-margarita', name: 'Pizza Margarita' },
  pepperoni: { id: 'fiscal-demo-pepperoni', name: 'Pizza Pepperoni' },
};

/** RUC de prueba de Digifact, el mismo que usan los tests del BFF como comprador. */
export const TEST_RUC = '155704849-2-2021';

/** Aborta si algo apunta a prod. Se llama al cargar y antes de cada setup. */
export function assertDevOnly() {
  const haystack = [
    ...Object.values(URLS),
    PROJECT,
    ...Object.values(process.env).filter((v) => typeof v === 'string'),
  ];
  if (haystack.some((v) => v.includes(PROD_PROJECT))) {
    throw new Error(`ABORTADO: algo apunta a prod (${PROD_PROJECT}). Esta batería solo corre contra dev.`);
  }
  if (PROJECT === PROD_PROJECT) throw new Error('ABORTADO: PROJECT es prod.');
}
assertDevOnly();

function readEnvFile() {
  const file = fileURLToPath(new URL('../../apps/customer_web/.env.restaurant-os-dev-49096', import.meta.url));
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

let cachedWeb;
/** Config web pública de Firebase de dev (la misma que embeben las apps). */
export function webConfig() {
  if (cachedWeb) return cachedWeb;
  const env = readEnvFile();
  if (env.VITE_FIREBASE_PROJECT_ID !== PROJECT) {
    throw new Error(`apps/customer_web/.env.restaurant-os-dev-49096 no es de ${PROJECT}`);
  }
  cachedWeb = { apiKey: env.VITE_FIREBASE_API_KEY, bucket: env.VITE_FIREBASE_STORAGE_BUCKET };
  if (!cachedWeb.apiKey || !cachedWeb.bucket) throw new Error('Falta API key o bucket en el .env de dev.');
  return cachedWeb;
}
