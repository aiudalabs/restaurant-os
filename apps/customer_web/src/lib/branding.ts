// Runtime branding: applies the validated theme to the document and shares the active
// Branding with components. The pure logic lives in theme.ts; the pre-paint twin of
// applyThemeToDocument is the inline script in index.html.
import { useSyncExternalStore } from 'react';
import { loadHome } from './home';
import {
  FONT_HREF_PREFIX,
  PLATFORM_BRANDING,
  buildTheme,
  readThemeCache,
  resolveBranding,
  safeLocalStorage,
  writeThemeCache,
  type AppliedTheme,
  type Branding,
} from './theme';

export function applyThemeToDocument(doc: Document, theme: AppliedTheme): void {
  const root = doc.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  doc.title = theme.title;

  let meta = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.name = 'theme-color';
    doc.head.appendChild(meta);
  }
  meta.content = theme.themeColor;

  if (theme.iconUrl) {
    doc.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((n) => n.remove());
    for (const rel of ['icon', 'apple-touch-icon']) {
      const l = doc.createElement('link');
      l.rel = rel;
      l.href = theme.iconUrl;
      doc.head.appendChild(l);
    }
  }

  if (theme.fontHref.startsWith(FONT_HREF_PREFIX)) {
    const known = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[data-brand-font]'));
    if (!known.some((l) => l.href === theme.fontHref)) {
      known.forEach((l) => l.remove());
      const l = doc.createElement('link');
      l.rel = 'stylesheet';
      l.href = theme.fontHref;
      l.setAttribute('data-brand-font', '');
      doc.head.appendChild(l);
    }
  }
}

/** Branch the page is for, same precedence as the manifest script in index.html. */
function currentBranchId(): string {
  try {
    return new URLSearchParams(location.search).get('branch') ?? loadHome()?.branchId ?? '';
  } catch {
    return '';
  }
}

let current: Branding = readThemeCache(safeLocalStorage(), currentBranchId()) ?? PLATFORM_BRANDING;
const listeners = new Set<() => void>();

/** Validates the branch's `branding` (falls back to the platform theme), applies and caches it. */
export function applyBranding(raw: unknown, branchId: string): Branding {
  const branding = resolveBranding(raw);
  current = branding;
  if (typeof document !== 'undefined') applyThemeToDocument(document, buildTheme(branding));
  writeThemeCache(safeLocalStorage(), branchId, branding);
  listeners.forEach((l) => l());
  return branding;
}

export function useBranding(): Branding {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}
