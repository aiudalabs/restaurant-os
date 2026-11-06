import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { ACCEPT_ATTR, type BrandImageKind } from '../services/image';

interface ImageFieldProps {
  kind: BrandImageKind;
  label: string;
  hint: string;
  value: string;
  busy: boolean;
  error?: string;
  onPick: (file: File) => void;
}

/** Thumbnail + "Subir/Cambiar" button. The file is resized and uploaded by the parent. */
export function ImageField({ kind, label, hint, value, busy, error, onPick }: ImageFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const noun = kind === 'logo' ? 'logo' : 'ícono';
  const errorId = `${kind}-error`;
  return (
    <div className="flex items-start gap-4">
      <div
        className={cn(
          'grid shrink-0 place-items-center overflow-hidden border border-[var(--md-sys-color-outline-variant)] bg-[#FAF8F2]',
          kind === 'icon' ? 'h-20 w-20 rounded-2xl' : 'h-20 w-32 rounded-[10px]',
        )}
      >
        {value ? (
          <img src={value} alt={`${label} actual`} className="h-full w-full object-contain" />
        ) : (
          <Icon name="image" size={28} className="text-[#6B6B66]" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="t-title-small text-[var(--ink)]">{label}</p>
        <p className="t-body-small text-[var(--ink-soft)]">{hint}</p>
        <input
          ref={input}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // picking the same file again must fire onChange
            if (file) onPick(file);
          }}
        />
        <Button
          type="button"
          variant="outlined"
          icon={busy ? 'progress_activity' : 'upload'}
          disabled={busy}
          aria-describedby={error ? errorId : undefined}
          onClick={() => input.current?.click()}
        >
          {busy ? 'Subiendo…' : value ? `Cambiar ${noun}` : `Subir ${noun}`}
        </Button>
        {error && (
          <p id={errorId} role="alert" className="t-body-small text-[var(--md-sys-color-error)]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
