// Registro en disco (e2e/.auth/manifest.json, ignorado por git) de todo lo que la
// corrida crea o modifica ANTES de hacerlo, para que `npm run cleanup` pueda
// deshacerlo aunque el proceso muera a la mitad. No guarda contraseñas ni PINs;
// sí guarda el respaldo crudo del kds_pins original (hash + sal), por eso vive
// en .auth/.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../.auth/manifest.json', import.meta.url));

export function loadManifest() {
  if (!existsSync(FILE)) return null;
  return JSON.parse(readFileSync(FILE, 'utf8'));
}

export function saveManifest(m) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(m, null, 2), { mode: 0o600 });
}

/** Añade un valor a una lista del manifest (relee el archivo: lo usan procesos distintos). */
export function appendToManifest(key, value) {
  const m = loadManifest();
  if (!m) throw new Error('No hay manifest: ¿corrió el global-setup?');
  m[key] = [...(m[key] ?? []), value];
  saveManifest(m);
}

export function newManifest(runId) {
  return {
    runId,
    startedAt: new Date().toISOString(),
    authUids: [], // usuarios de Auth temporales (admin, mesero)
    userDocs: [], // users/{uid} temporales
    staffPins: [], // staff_pins/{uid} que creó setWaiterPin
    anonUids: [], // sesiones anónimas que la batería sembró por REST (los pedidos de la UI se descubren por barrido)
    kdsPin: null, // { stationId, existed, fields } respaldo crudo de kds_pins/{estación}
    discounts: null, // { touched, present, value } respaldo de organizations/{org}.discounts
  };
}
