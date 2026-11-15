import { Link, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { useSession } from '../store/session';

/** Bottom bar of the Club and history screens: Menú · Mi Club · Pedidos. */
export function ClubNav() {
  const { pathname } = useLocation();
  const { session } = useSession();
  const items: { to: string; label: string; icon: IconName; on: boolean }[] = [
    { to: session ? '/menu' : '/', label: 'Menú', icon: 'menu', on: false },
    { to: '/club', label: 'Mi Club', icon: 'star', on: pathname.startsWith('/club') },
    { to: '/orders', label: 'Pedidos', icon: 'bag', on: pathname === '/orders' },
  ];
  return (
    <nav aria-label="Secciones" className="sticky bottom-0 mt-4 grid grid-cols-3 gap-1 border-t border-line bg-white px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5">
      {items.map((it) => (
        <Link
          key={it.label}
          to={it.to}
          aria-current={it.on ? 'page' : undefined}
          className={`flex flex-col items-center gap-1 py-1.5 text-xs ${it.on ? 'font-bold text-brand' : 'font-medium text-hint'}`}
        >
          <Icon name={it.icon} strokeWidth={it.on ? 2.2 : 2} />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
