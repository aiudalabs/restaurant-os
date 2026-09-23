import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  /** Material Symbols ligature name, e.g. "receipt_long". */
  name: string;
  /** Filled variant (M3 uses it for the active destination). */
  filled?: boolean;
  /** Size in px (default 24). */
  size?: number;
  className?: string;
  /** Accessible name. Omit for decorative icons next to a text label. */
  label?: string;
  style?: CSSProperties;
}

/** Material Symbols Outlined icon (font loaded in index.html). */
export function Icon({ name, filled, size = 24, className, label, style }: IconProps) {
  return (
    <span
      className={cn('ms', filled && 'ms-fill', className)}
      style={{ fontSize: size, ...style }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}
