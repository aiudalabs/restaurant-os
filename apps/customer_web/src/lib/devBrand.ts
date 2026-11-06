// DEV ONLY (imported behind `import.meta.env.DEV`, so it is not part of production builds).
// `?brand=3F6B2A,C9A24A,classic,Nombre` renders the app with that branding and a fake
// branch, without reading Firestore. Used for the branding screenshots.
import type { Branch } from '../types';

export function devFixture(): { branch: Branch; branding: unknown } | null {
  const raw = new URLSearchParams(location.search).get('brand');
  if (!raw) return null;
  const [primary, accent, fontPreset, displayName] = raw.split(',');
  return {
    branch: { id: 'dev-fixture', orgId: 'dev-org', name: 'Sucursal Centro', menuId: 'dev-menu' },
    branding: {
      displayName: displayName || 'Demo',
      primary: `#${primary}`,
      accent: `#${accent}`,
      fontPreset,
      logoUrl: '',
      iconUrl: '',
    },
  };
}
