import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { attachMember } from '../lib/api';

type State = { kind: 'scanning' } | { kind: 'saving' } | { kind: 'done'; name: string; points: number; awarded: boolean } | { kind: 'error'; message: string };

/** Camera scan of the customer's Club QR (the member id) to tie it to this order. */
export function MemberScanSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>({ kind: 'scanning' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (state.kind !== 'scanning') return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let alive = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      const v = video.current;
      if (!alive || !v || !ctx) return;
      if (v.readyState === v.HAVE_ENOUGH_DATA) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (hit?.data) {
          alive = false;
          setState({ kind: 'saving' });
          attachMember(orderId, hit.data.trim())
            .then((r) => setState({ kind: 'done', name: r.name, points: r.points, awarded: r.awarded }))
            .catch((e) => setState({ kind: 'error', message: e instanceof Error ? e.message : 'No se pudo enlazar el socio.' }));
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (!alive || !video.current) return s.getTracks().forEach((t) => t.stop());
        video.current.srcObject = s;
        void video.current.play();
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setState({ kind: 'error', message: 'No pudimos abrir la cámara. Permite el acceso a la cámara e intenta de nuevo.' }));

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [state.kind, orderId, attempt]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-panel p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-lg font-extrabold">Socio del Club</p>
        {state.kind === 'scanning' && (
          <>
            <p className="mt-1 text-center text-sm text-muted">Apunta al QR de «Mi Club» en el teléfono del cliente.</p>
            <video ref={video} playsInline muted className="mt-4 aspect-square w-full rounded-2xl bg-black object-cover" />
          </>
        )}
        {state.kind === 'saving' && <p className="mt-6 text-center text-sm text-muted">Enlazando socio…</p>}
        {state.kind === 'done' && (
          <p className="mt-4 rounded-2xl bg-bg px-4 py-3 text-center font-semibold">
            {state.name ? `${state.name} · ` : ''}
            {state.points} puntos
            <span className="block text-sm font-normal text-muted">
              {state.awarded ? 'Puntos de este pedido sumados.' : 'Los puntos se suman al cobrar el pedido.'}
            </span>
          </p>
        )}
        {state.kind === 'error' && <p className="mt-4 text-center text-sm font-medium text-brand">{state.message}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-outlined flex-1">
            {state.kind === 'done' ? 'Listo' : 'Cerrar'}
          </button>
          {state.kind === 'error' && (
            <button
              onClick={() => {
                setState({ kind: 'scanning' });
                setAttempt((n) => n + 1);
              }}
              className="btn btn-filled flex-1"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
