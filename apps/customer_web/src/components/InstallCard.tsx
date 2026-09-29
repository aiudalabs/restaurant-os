import { useEffect, useState } from 'react';
import { canPromptInstall, isIos, isStandalone, onInstallChange, promptInstall } from '../lib/install';

interface Props {
  orgId: string;
  branchId: string;
  branchName: string;
}

/**
 * "Instala <restaurante> para tus próximos pedidos". Android: Chrome's native
 * install dialog. iPhone: the two Safari steps. Hidden once installed.
 */
export function InstallCard({ orgId, branchId, branchName }: Props) {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const [iosSteps, setIosSteps] = useState(false);
  const ios = isIos();

  useEffect(() => onInstallChange(() => setCanPrompt(canPromptInstall())), []);

  if (isStandalone() || (!canPrompt && !ios)) return null;

  const name = branchName || 'la app';
  const openIosSteps = () => {
    // Safari saves the page being viewed: show the branch link while the steps
    // are open so the home-screen icon opens the menu, not this order.
    const back = window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, '', `/?org=${encodeURIComponent(orgId)}&branch=${encodeURIComponent(branchId)}`);
    setIosSteps(true);
    const restore = () => window.history.replaceState(window.history.state, '', back);
    window.addEventListener('pagehide', restore, { once: true });
  };

  return (
    <>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Instala {name} para tus próximos pedidos</p>
          <p className="text-xs text-hint">Sin QR ni links: pide desde tu pantalla de inicio.</p>
        </div>
        <button
          onClick={() => (ios ? openIosSteps() : void promptInstall())}
          className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
        >
          Instalar
        </button>
      </div>

      {iosSteps && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={() => setIosSteps(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center font-display text-lg font-semibold">Instala {name}</p>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">1</span>
                <span>
                  Toca <b>Compartir</b>{' '}
                  <svg viewBox="0 0 24 24" className="inline h-5 w-5 align-text-bottom text-[#007AFF]" fill="none" stroke="currentColor" strokeWidth="2" aria-label="(ícono de compartir)">
                    <path d="M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>{' '}
                  en la barra de Safari.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">2</span>
                <span>
                  Elige <b>Agregar a pantalla de inicio</b> y toca <b>Agregar</b>.
                </span>
              </li>
            </ol>
            <button onClick={() => setIosSteps(false)} className="mt-5 w-full rounded-2xl border border-black/10 py-3 text-sm font-semibold">
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
