import { useMemo, type CSSProperties } from 'react';
import { Icon } from '@/components/ui/icon';
import { buildTheme, type Branding } from '../theme';

/** customer_web variables (--brand, --accent…) renamed so they never collide with the admin's own tokens. */
function previewVars(branding: Branding): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(buildTheme(branding).vars)) {
    vars[`--pv-${key.slice(2)}`] = value;
  }
  return vars as CSSProperties;
}

interface BrandPreviewProps {
  branding: Branding;
  /** Branch name the customer sees above the title. */
  branchName: string;
}

/**
 * A framed phone showing customer_web's entry screen (screens/EntryScreen.tsx) with the brand
 * applied through the same derivation (features/brand/theme.ts). The phone is always light:
 * the customer app has no dark mode, so it does not follow the admin's theme.
 */
export function BrandPreview({ branding, branchName }: BrandPreviewProps) {
  const style = useMemo(() => previewVars(branding), [branding]);
  const hasLogo = branding.logoUrl !== '';
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        role="img"
        aria-label={`Vista previa de la pantalla de pedido de ${branding.displayName}`}
        className="relative w-[300px] max-w-full overflow-hidden rounded-[36px] border-[7px] border-[#1c2233] bg-[#FAF8F2] text-[#141414] shadow-lg"
        style={{ ...style, fontFamily: 'var(--pv-font-sans)' }}
      >
        <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-[#1c2233]/15" aria-hidden="true" />
        <div className="flex min-h-[540px] flex-col justify-between px-5 pb-6 pt-6 text-center">
          <div />
          <div className="flex flex-col items-center">
            <div className="mb-4 flex min-h-[6.5rem] max-w-full items-center justify-center">
              {hasLogo ? (
                <img src={branding.logoUrl} alt="" className="h-24 max-w-[220px] object-contain" />
              ) : (
                <span
                  className="text-[34px] font-bold leading-tight tracking-tight text-[rgb(var(--pv-brand))]"
                  style={{ fontFamily: 'var(--pv-font-display)' }}
                >
                  {branding.displayName}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B6B66]">{branchName}</p>
            <p className="mt-1 text-[26px] font-semibold leading-tight" style={{ fontFamily: 'var(--pv-font-display)' }}>
              Haz tu pedido
            </p>
            <p className="mt-2 max-w-[230px] text-[13px] text-[#6B6B66]">
              Escribe tu nombre (opcional). Te daremos un número único para retirar tu pedido.
            </p>
            <div className="mt-5 w-full rounded-2xl border border-[#E6E2D8] bg-[#FFFFFF] px-4 py-3 text-center text-[14px] text-[#6B6B66]">
              Tu nombre (opcional)
            </div>
            <div className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-[rgb(var(--pv-accent-tint))] px-3 py-2 text-left text-[12px] text-[rgb(var(--pv-accent-ink))]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[rgb(var(--pv-accent))] text-[#141414]">
                <Icon name="star" filled size={14} />
              </span>
              <span className="font-semibold">Club: 3 de 8 sellos</span>
            </div>
          </div>
          <div className="w-full">
            <div className="grid h-[48px] w-full place-items-center rounded-xl bg-[rgb(var(--pv-brand))] text-[15px] font-semibold text-[#FFFFFF]">
              Ver el menú
            </div>
            <div className="mt-2.5 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[rgb(var(--pv-brand))] bg-[#FFFFFF] text-[15px] font-semibold text-[rgb(var(--pv-brand))]">
              <Icon name="star" size={18} />
              Mi Club
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {branding.iconUrl ? (
          <img src={branding.iconUrl} alt="" className="h-14 w-14 rounded-[14px] border border-[var(--line)] object-cover" />
        ) : (
          <span
            className="grid h-14 w-14 place-items-center rounded-[14px] bg-[rgb(var(--pv-brand))] text-[22px] font-bold text-[#FFFFFF]"
            style={{ ...style, fontFamily: 'var(--pv-font-display)' }}
            aria-hidden="true"
          >
            {branding.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <p className="t-body-small max-w-[200px] text-[var(--ink-soft)]">
          Así se ve el ícono al instalar la app en el teléfono de tu cliente.
        </p>
      </div>
    </div>
  );
}
