// Runtime config from Vite env vars (baked at build time).
//
// Payments are OFF by default so the demo deploy keeps working without a BFF.
// To turn on prepayment: deploy the FastAPI BFF publicly (with PagueloFácil
// credentials + a reachable /payments/callback), then build customer_web with:
//   VITE_PAYMENTS_ENABLED=true
//   VITE_BFF_URL=https://bff.tu-dominio.com
export const bffUrl: string = (import.meta.env.VITE_BFF_URL ?? '').replace(/\/$/, '');

export const paymentsEnabled: boolean =
  import.meta.env.VITE_PAYMENTS_ENABLED === 'true' && bffUrl.length > 0;
