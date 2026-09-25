// Public URL of the customer web app (the QR opens this, resolving the menu by
// the branch param). Override per environment with VITE_CUSTOMER_APP_URL.
export const CUSTOMER_APP_URL: string = (
  import.meta.env.VITE_CUSTOMER_APP_URL ?? 'https://restaurant-os-pedir.web.app'
).replace(/\/$/, '');

/** QR/deep-link a customer scans at a table — resolves to that branch's menu. */
export function buildCustomerQrUrl(orgId: string, branchId: string, tableId: string): string {
  return `${CUSTOMER_APP_URL}/?org=${orgId}&branch=${branchId}&table=${tableId}`;
}

// FastAPI BFF (auth, payments, and the AI build assistant). Override with VITE_BFF_URL.
export const BFF_URL: string = (
  import.meta.env.VITE_BFF_URL ?? 'https://restaurantos-bff-t454q6kiqa-uc.a.run.app'
).replace(/\/$/, '');

// Waiter web app. A device opened once with ?branch=… is set up for that branch:
// waiters then sign in by picking their name and typing their 6-digit PIN.
export const WAITER_APP_URL: string = (
  import.meta.env.VITE_WAITER_APP_URL ?? 'https://restaurant-os-mesero.web.app'
).replace(/\/$/, '');

export function buildWaiterDeviceUrl(branchId: string): string {
  return `${WAITER_APP_URL}/?branch=${branchId}`;
}
