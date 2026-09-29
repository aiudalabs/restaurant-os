// Build guard shared by the web apps' vite.config.ts (docs/ENVIRONMENTS.md).
//
// Every deployable build is made with `vite build --mode <firebaseProjectId>`
// (firebase.json predeploy passes $GCLOUD_PROJECT), which loads
// apps/<app>/.env.<firebaseProjectId>. This refuses to build when that file is
// missing or belongs to another project, so a dev build can never be deployed
// to prod (or the other way round).

export function assertProjectEnv(
  app: string,
  mode: string,
  env: Record<string, string>,
  required: string[],
  checkProjectId = true,
): void {
  if (mode === 'production') {
    throw new Error(
      `[${app}] Construye con --mode <proyecto>, p. ej. \`npm run build -- --mode restaurant-os-dev\`. ` +
        '`firebase deploy` y scripts/deploy.sh lo hacen solos (docs/ENVIRONMENTS.md).',
    );
  }
  if (mode === 'development') return; // `vite build --mode development` for local checks
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[${app}] Falta apps/${app}/.env.${mode} o le faltan: ${missing.join(', ')}. ` +
        'Se genera con scripts/bootstrap-env.sh (docs/ENVIRONMENTS.md).',
    );
  }
  if (checkProjectId && env.VITE_FIREBASE_PROJECT_ID !== mode) {
    throw new Error(
      `[${app}] .env.${mode} apunta a "${env.VITE_FIREBASE_PROJECT_ID}", no a "${mode}". Revisa el archivo.`,
    );
  }
}

export const FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];
