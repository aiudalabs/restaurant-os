export interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** Extra words the command bar matches on. */
  keywords?: string;
}

/** The rail (desktop) and the phone bar's first four. Order = how often they are used. */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'schedule', keywords: 'jornada hoy dashboard resumen' },
  { to: '/orders', label: 'Pedidos', icon: 'receipt_long', keywords: 'ordenes cobrar cocina' },
  { to: '/menu', label: 'Menú', icon: 'menu_book', keywords: 'carta productos categorías precios' },
  { to: '/users', label: 'Equipo', icon: 'group', keywords: 'personal meseros usuarios pin' },
  { to: '/branches', label: 'Sucursales', icon: 'storefront', keywords: 'locales horario' },
  { to: '/settings', label: 'Ajustes', icon: 'tune', keywords: 'facturación factura fiscal digifact descuentos' },
];

/** Reached from the command bar, the account menu and the phone's "Más" sheet. */
export const SECONDARY_NAV: NavItem[] = [
  { to: '/reports', label: 'Reportes', icon: 'bar_chart', keywords: 'ventas exportar csv' },
  { to: '/stations', label: 'Estaciones', icon: 'soup_kitchen', keywords: 'cocina bar kds' },
  { to: '/tables', label: 'Mesas', icon: 'table_restaurant', keywords: 'qr' },
  { to: '/assistant', label: 'Asistente', icon: 'auto_awesome', keywords: 'ia inteligencia artificial crear' },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];

export function isActive(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

/** Only letters and digits, folded: "P4F2A", "p-4f2a" and "p 4f2a" are the same pickup code. */
export function squash(text: string): string {
  return fold(text).replace(/[^a-z0-9]/g, '');
}

/** Lowercase without accents, for forgiving matches ("menu" finds "Menú"). */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
