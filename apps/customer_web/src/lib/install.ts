// "Instalar para tus próximos pedidos" (issue #49).
// - Android/Chrome fires `beforeinstallprompt` when the page is installable
//   (manifest from /manifest.webmanifest, served per branch by customerManifest).
//   We keep the event and fire the native install dialog from our own button.
// - iPhone/Safari has no install API: we show "Compartir → Agregar a pantalla de inicio".

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Call once at startup, before React renders, so an early event is not lost. */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it for our button instead of Chrome's mini-infobar
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function onInstallChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const canPromptInstall = () => deferred !== null;

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  notify();
  return outcome === 'accepted';
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Names the page after the restaurant (tab title, iOS home-screen title) and
 * points the manifest at this branch, so installing uses its name and opens its menu.
 */
export function setAppIdentity(orgId: string, branchId: string, branchName: string): void {
  if (branchName) {
    document.title = branchName;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-title';
      document.head.appendChild(meta);
    }
    meta.content = branchName;
  }
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const href = `/manifest.webmanifest?org=${encodeURIComponent(orgId)}&branch=${encodeURIComponent(branchId)}`;
  if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
}
