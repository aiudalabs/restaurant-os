// Line icons from the Pick & Eat mockup (24px grid, 2.2 stroke).
const PATHS = {
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  bag: 'M6 3h12l1 18H5zM9 7a3 3 0 0 0 6 0',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  ticket: 'M3 9V6h18v3a3 3 0 0 0 0 6v3H3v-3a3 3 0 0 0 0-6zM13 6v12',
  back: 'M15 6l-6 6 6 6',
  star: 'M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8z',
  check: 'M5 12l5 5L20 7',
  gift: 'M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7c-2-3-6-3-6 0 0 2 6 0 6 0zm0 0c2-3 6-3 6 0 0 2-6 0-6 0z',
  flame: 'M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .3-2 1-3 0 2 1 3 2 3 0-3-1-5 1-8z',
  chevron: 'M9 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h10',
  juice: 'M8 3h8l-1 7H9zM9 10v9a3 3 0 0 0 6 0v-9',
  cup: 'M3 10h18v2a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7zM8 10V7m4 3V6m4 4V7',
  box: 'M4 8h16v12H4zM4 8l2-4h12l2 4M12 4v16',
  user: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0',
  bowl: 'M4 12h16a8 8 0 0 1-16 0zM7 8c0-2 1-3 1-3M12 8c0-2 1-3 1-3M17 8c0-2 1-3 1-3',
} as const;

export function Icon({ name, size = 22, className, strokeWidth = 2.2 }: { name: keyof typeof PATHS; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Tinted round icon used on empty / error states. */
export type IconName = keyof typeof PATHS;

export function IconBadge({ name }: { name: IconName }) {
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
