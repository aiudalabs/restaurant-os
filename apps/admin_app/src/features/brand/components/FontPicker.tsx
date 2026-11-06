import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { FONT_PRESETS, type FontPreset } from '../theme';

const OPTIONS: { value: FontPreset; label: string; hint: string }[] = [
  { value: 'classic', label: 'Clásica', hint: 'Elegante' },
  { value: 'modern', label: 'Moderna', hint: 'Sobria' },
  { value: 'rounded', label: 'Redondeada', hint: 'Amable' },
];

interface FontPickerProps {
  value: FontPreset;
  onChange: (value: FontPreset) => void;
  name: string;
  sample: string;
}

/** Three real samples (the restaurant name set in each preset) as a radio group. */
export function FontPicker({ value, onChange, name, sample }: FontPickerProps) {
  return (
    <div role="radiogroup" aria-label="Tipografía" className="grid gap-2 sm:grid-cols-3">
      {OPTIONS.map((o) => {
        const on = o.value === value;
        const font = FONT_PRESETS[o.value];
        return (
          <label
            key={o.value}
            className={cn(
              'm3-state relative flex min-h-[88px] cursor-pointer flex-col justify-between gap-1 rounded-[10px] border px-4 py-3',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--brand)]',
              on
                ? 'border-2 border-[var(--md-sys-color-primary)] bg-[var(--brand-wash)] px-[15px] py-[11px]'
                : 'border-[var(--md-sys-color-outline-variant)]',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={on}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span
              className="truncate text-[22px] font-semibold leading-tight text-[var(--ink)]"
              style={{ fontFamily: font.display }}
            >
              {sample}
            </span>
            <span className="t-body-small flex items-center gap-1 text-[var(--ink-soft)]" style={{ fontFamily: font.sans }}>
              {on && <Icon name="check" size={16} className="text-[var(--brand-ink)]" />}
              <span className={cn(on && 'font-semibold text-[var(--ink)]')}>{o.label}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{o.hint}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
