// Public URL of the customer web app (the QR opens this, resolving the menu by
// the branch param). Per environment: VITE_CUSTOMER_APP_URL in .env.<projectId>.
export const CUSTOMER_APP_URL: string = (
  import.meta.env.VITE_CUSTOMER_APP_URL as string
).replace(/\/$/, '');

/** QR/deep-link a customer scans at a table — resolves to that branch's menu. */
export function buildCustomerQrUrl(orgId: string, branchId: string, tableId: string): string {
  return `${CUSTOMER_APP_URL}/?org=${orgId}&branch=${branchId}&table=${tableId}`;
}

/** Link to order for pickup from anywhere (offices, WhatsApp, a lobby poster) — no table. */
export function buildCustomerOrderUrl(orgId: string, branchId: string): string {
  return `${CUSTOMER_APP_URL}/?org=${orgId}&branch=${branchId}`;
}

// FastAPI BFF (auth, payments, and the AI build assistant): VITE_BFF_URL in .env.<projectId>.
export const BFF_URL: string = (
  import.meta.env.VITE_BFF_URL as string
).replace(/\/$/, '');

// Waiter web app. A device opened once with ?branch=… is set up for that branch:
// waiters then sign in by picking their name and typing their 6-digit PIN.
export const WAITER_APP_URL: string = (
  import.meta.env.VITE_WAITER_APP_URL as string
).replace(/\/$/, '');

// KDS web app: each station's tablet is set up once with ?station=….
export const KDS_APP_URL: string = (import.meta.env.VITE_KDS_APP_URL as string).replace(/\/$/, '');

export function buildWaiterDeviceUrl(branchId: string): string {
  return `${WAITER_APP_URL}/?branch=${branchId}`;
}
