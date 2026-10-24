// Line icons from the Pick & Eat mockup (24px grid, 2.2 stroke).
const PATHS = {
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  bag: 'M6 3h12l1 18H5zM9 7a3 3 0 0 0 6 0',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  ticket: 'M3 9V6h18v3a3 3 0 0 0 0 6v3H3v-3a3 3 0 0 0 0-6zM13 6v12',
  back: 'M15 6l-6 6 6 6',
  bowl: 'M4 12h16a8 8 0 0 1-16 0zM7 8c0-2 1-3 1-3M12 8c0-2 1-3 1-3M17 8c0-2 1-3 1-3',
} as const;

export function Icon({ name, size = 22, className }: { name: keyof typeof PATHS; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Tinted round icon used on empty / error states. */
export function IconBadge({ name }: { name: keyof typeof PATHS }) {
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-tint text-brand">
      <Icon name={name} size={28} />
    </span>
  );
}

/** 40px square back button of the mockup headers. */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Volver"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink"
    >
      <Icon name="back" size={20} />
    </button>
  );
}
