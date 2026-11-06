import { useEffect, useState } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useTheme } from '@/hooks/use-theme';
import { Icon } from '@/components/ui/icon';
import { CommandBar } from './command-bar';
import { ALL_NAV, PRIMARY_NAV, SECONDARY_NAV, isActive, type NavItem } from './nav-items';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const SHORTCUT = IS_MAC ? '⌘K' : 'Ctrl K';
// Phone bar: the four used during service, the rest behind "Más".
const PHONE_BAR = PRIMARY_NAV.slice(0, 4);
const MORE = [...PRIMARY_NAV.slice(4), ...SECONDARY_NAV];

/** The brand mark: a clock face whose single hand is the "ahora" line. */
function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--action)" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="var(--on-action)" strokeWidth="2" />
      <path d="M16 9.5V16" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function RailLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.to);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Link
          to={item.to}
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'm3-state grid h-11 w-11 place-items-center rounded-[10px]',
            active ? 'bg-[var(--action)] text-[var(--on-action)]' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]',
          )}
        >
          <Icon name={item.icon} filled={active} size={24} />
        </Link>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="t-label-large z-[80] rounded-md bg-[var(--ink)] px-2.5 py-1.5 text-[var(--ground)]"
        >
          {item.label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function PhoneBarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.to);
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        't-label-medium flex h-14 flex-col items-center justify-center gap-0.5 rounded-[10px]',
        active ? 'bg-[var(--action)] text-[var(--on-action)]' : 'text-[var(--ink-soft)]',
      )}
    >
      <Icon name={item.icon} filled={active} size={22} />
      {item.label}
    </Link>
  );
}

export default function AdminLayout() {
  const { appUser, logout } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchContext();
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [commandOpen, setCommandOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the "Más" sheet when navigating (derived from the path it opened on).
  const [moreOpenedAt, setMoreOpenedAt] = useState('');
  const sheetOpen = moreOpen && moreOpenedAt === pathname;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const current = ALL_NAV.find((i) => isActive(pathname, i.to)) ?? PRIMARY_NAV[0];
  const onHome = current.to === '/';
  const onOrders = current.to === '/orders';
  const initial = appUser?.displayName?.charAt(0).toUpperCase() ?? '?';
  const themeLabel = theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro';
  const themeIcon = theme === 'dark' ? 'light_mode' : 'dark_mode';

  const branchSelect = (
    <div className="relative min-w-0 flex-1 md:w-60 md:flex-none">
      <label htmlFor="branch-select" className="sr-only">
        Sucursal
      </label>
      <select
        id="branch-select"
        value={selectedBranchId}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        disabled={branches.length <= 1}
        className="t-label-large h-11 w-full appearance-none truncate rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface)] pl-3 pr-9 text-[var(--ink)] disabled:opacity-100"
      >
        {branches.length === 0 && <option value="">Sin sucursal</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      {branches.length > 1 && (
        <Icon name="expand_more" size={20} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
      )}
    </div>
  );

  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="flex h-dvh bg-[var(--ground)] text-[var(--ink)]">
        <a
          href="#contenido"
          className="t-label-large sr-only z-[90] rounded-md bg-[var(--action)] px-3 py-2 text-[var(--on-action)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Saltar al contenido
        </a>

        {/* Rail — tablet and desktop */}
        <nav aria-label="Secciones" className="hidden w-16 shrink-0 flex-col items-center gap-1.5 border-r border-[var(--line)] bg-[var(--surface)] py-4 md:flex">
          <Mark className="mb-4 h-9 w-9" />
          {PRIMARY_NAV.map((item) => (
            <RailLink key={item.to} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-3 px-4 py-3 md:px-8">
            <Mark className="h-9 w-9 shrink-0 md:hidden" />
            {branchSelect}

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="m3-state t-body-medium hidden h-11 min-w-0 flex-1 items-center gap-3 rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-left text-[var(--ink-soft)] md:mx-auto md:flex md:max-w-xl"
            >
              <Icon name="search" size={20} />
              <span className="min-w-0 flex-1 truncate">Pregunta o busca</span>
              <kbd className="t-label-medium shrink-0 rounded-md border border-[var(--line)] px-1.5 py-0.5">{SHORTCUT}</kbd>
            </button>
            <button
              type="button"
              aria-label="Abrir la barra de comandos"
              onClick={() => setCommandOpen(true)}
              className="m3-state grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] md:hidden"
            >
              <Icon name="search" size={22} />
            </button>

            <button
              type="button"
              aria-label={themeLabel}
              title={themeLabel}
              onClick={toggle}
              className="m3-state hidden h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--ink)] md:grid"
            >
              <Icon name={themeIcon} />
            </button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                aria-label={`Cuenta de ${appUser?.displayName ?? 'usuario'}`}
                className="t-title-small grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--tint)] text-[var(--ink)] data-[state=open]:bg-[var(--action)] data-[state=open]:text-[var(--on-action)]"
              >
                {initial}
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-[80] w-64 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--ink)] shadow-xl [animation:m3-dialog-in_120ms_var(--ease-out)]"
                >
                  <div className="px-3 py-2">
                    <p className="t-title-small truncate">{appUser?.displayName}</p>
                    <p className="t-body-small truncate text-[var(--ink-soft)]">{appUser?.email}</p>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--line)]" />
                  {SECONDARY_NAV.map((item) => (
                    <DropdownMenu.Item key={item.to} asChild>
                      <Link to={item.to} className="t-body-medium flex min-h-11 items-center gap-3 rounded-[10px] px-3 outline-none data-[highlighted]:bg-[var(--tint)]">
                        <Icon name={item.icon} size={20} className="text-[var(--ink-soft)]" />
                        {item.label}
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--line)]" />
                  <DropdownMenu.Item
                    onSelect={toggle}
                    className="t-body-medium flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 outline-none data-[highlighted]:bg-[var(--tint)]"
                  >
                    <Icon name={themeIcon} size={20} className="text-[var(--ink-soft)]" />
                    {themeLabel}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => void logout()}
                    className="t-body-medium flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 outline-none data-[highlighted]:bg-[var(--tint)]"
                  >
                    <Icon name="logout" size={20} className="text-[var(--ink-soft)]" />
                    Cerrar sesión
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </header>

          <main id="contenido" className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 md:px-8 md:pb-10">
            <div className={cn('mx-auto', onOrders ? 'max-w-[1400px]' : 'max-w-[1240px]')}>
              {!onHome && !onOrders && (
                <h1 className="t-headline-medium pb-5 pt-2 text-[var(--ink)]">{current.label}</h1>
              )}
              <Outlet />
            </div>
          </main>
        </div>

        {/* Bottom bar — phones */}
        <nav
          aria-label="Secciones"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-[var(--line)] bg-[var(--surface)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden"
        >
          {PHONE_BAR.map((item) => (
            <PhoneBarLink key={item.to} item={item} pathname={pathname} />
          ))}
          <button
            type="button"
            onClick={() => {
              setMoreOpenedAt(pathname);
              setMoreOpen(true);
            }}
            aria-current={PHONE_BAR.some((i) => i.to === current.to) ? undefined : 'page'}
            className={cn(
              't-label-medium flex h-14 flex-col items-center justify-center gap-0.5 rounded-[10px]',
              PHONE_BAR.some((i) => i.to === current.to) ? 'text-[var(--ink-soft)]' : 'bg-[var(--action)] text-[var(--on-action)]',
            )}
          >
            <Icon name="more_horiz" size={22} />
            Más
          </button>
        </nav>

        <Dialog.Root open={sheetOpen} onOpenChange={setMoreOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 [animation:m3-fade-in_120ms_linear] md:hidden" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-[var(--line)] bg-[var(--surface)] px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 text-[var(--ink)] [animation:m3-sheet-up_240ms_var(--ease-out)] md:hidden"
            >
              <div className="mb-2 flex items-center justify-between">
                <Dialog.Title className="t-title-large">Más secciones</Dialog.Title>
                <Dialog.Close
                  aria-label="Cerrar"
                  className="m3-state grid h-11 w-11 place-items-center rounded-[10px] text-[var(--ink)]"
                >
                  <Icon name="close" />
                </Dialog.Close>
              </div>
              <ul>
                {MORE.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="m3-state t-body-large flex min-h-12 items-center gap-3 rounded-[10px] px-2 text-[var(--ink)]"
                    >
                      <Icon name={item.icon} className="text-[var(--ink-soft)]" />
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={toggle}
                    className="m3-state t-body-large flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2 text-left text-[var(--ink)]"
                  >
                    <Icon name={themeIcon} className="text-[var(--ink-soft)]" />
                    {themeLabel}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="m3-state t-body-large flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2 text-left text-[var(--ink)]"
                  >
                    <Icon name="logout" className="text-[var(--ink-soft)]" />
                    Cerrar sesión
                  </button>
                </li>
              </ul>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <CommandBar open={commandOpen} onOpenChange={setCommandOpen} />
      </div>
    </Tooltip.Provider>
  );
}
