import { Input } from '@/components/ui/input';

const HEX = /^#[0-9a-fA-F]{6}$/;

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  supporting?: string;
}

/** Hex text field (the source of truth) plus the browser's color picker as a 44px swatch. */
export function ColorField({ id, label, value, onChange, onBlur, error, supporting }: ColorFieldProps) {
  const valid = HEX.test(value);
  return (
    <div className="flex items-start gap-3">
      <input
        type="color"
        aria-label={`Elegir ${label.toLowerCase()} con el selector de color`}
        value={valid ? value.toLowerCase() : '#000000'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="mt-1.5 h-11 w-11 shrink-0 cursor-pointer rounded-[10px] border border-[var(--md-sys-color-outline)] bg-transparent p-1"
      />
      <div className="min-w-0 flex-1">
        <Input
          id={id}
          label={label}
          value={value}
          error={error}
          supporting={supporting}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          placeholder="#3B5BDB"
          className="tnum uppercase"
          onChange={(e) => onChange(e.target.value.trim())}
          onBlur={() => {
            // "3b5bdb" is accepted as "#3B5BDB".
            if (/^[0-9a-fA-F]{6}$/.test(value)) onChange(`#${value.toUpperCase()}`);
            onBlur?.();
          }}
        />
      </div>
    </div>
  );
}
