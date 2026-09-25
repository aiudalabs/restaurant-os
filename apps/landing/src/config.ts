// Where the paid signup continues. The landing hands off to the admin's
// register flow with the chosen plan; account creation happens on the admin
// domain so the session lands the owner straight in the dashboard.
export const ADMIN_URL = 'https://restaurant-os-68c79.web.app';

export interface Plan {
  id: 'starter' | 'growth' | 'chain';
  name: string;
  price: number; // USD / month — proposed pricing, easy to adjust
  tagline: string;
  features: string[];
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    tagline: 'Para un local que empieza a vender por QR.',
    features: [
      '1 sucursal',
      'Pedidos por QR ilimitados',
      'Pantalla de cocina (KDS) web',
      'Panel de administración',
      'Menú y productos con fotos',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 49,
    tagline: 'Para restaurantes que quieren cobrar y crecer.',
    featured: true,
    features: [
      'Hasta 3 sucursales',
      'Todo lo de Starter',
      'Pagos en línea (PagueloFácil)',
      'Múltiples estaciones (cocina + bar)',
      'Reportes de ventas',
      'Login por PIN para estaciones',
    ],
  },
  {
    id: 'chain',
    name: 'Chain',
    price: 99,
    tagline: 'Para cadenas con varias sucursales y menús.',
    features: [
      'Sucursales ilimitadas',
      'Todo lo de Growth',
      'Multi-menú por sucursal',
      'Roles y permisos avanzados',
      'Backoffice contable (Odoo) — próximamente',
      'Soporte prioritario',
    ],
  },
];

// Hosted checkout is simulated for now — the real PagueloFácil subscription
// charge gets wired here later. See docs/PAYMENTS.md.
export function checkoutHandoffUrl(planId: string, email: string): string {
  const params = new URLSearchParams({ register: '1', plan: planId });
  if (email) params.set('email', email);
  return `${ADMIN_URL}/login?${params.toString()}`;
}
