import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/lib/firebase';
import { BFF_URL } from '@/lib/config';
import type { OrderFiscal } from '@/types/order';

export interface FiscalCredentialsStatus {
  configured: boolean;
  username?: string;
}

/** Stores the org's Digifact API user server-side (organizations/{orgId}/private/digifact). Admin only. */
export async function setFiscalCredentials(input: { username: string; password: string }): Promise<void> {
  const call = httpsCallable<{ username: string; password: string }, { ok: boolean }>(functions, 'setFiscalCredentials');
  await call(input);
}

/** Whether the org has Digifact credentials, and which user. The password is never returned. */
export async function getFiscalStatus(): Promise<FiscalCredentialsStatus> {
  const call = httpsCallable<void, FiscalCredentialsStatus>(functions, 'getFiscalStatus');
  const res = await call();
  return res.data;
}

/** FastAPI sends `detail` as a string (HTTPException) or a list of issues (422). */
function errorDetail(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d as { msg?: string }).msg ?? JSON.stringify(d)).join('; ');
  }
  return `Error ${status}`;
}

/**
 * Asks the BFF to issue (again) the electronic invoice of a paid order.
 * The response is the BFF's fiscal block: it carries Storage paths rather than
 * download URLs and `issuedAt` as an ISO string, so the UI reads the final
 * state from the live order doc and uses this only for status / lastError.
 */
export async function retryInvoice(orderId: string): Promise<OrderFiscal> {
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado.');
  const token = await user.getIdToken();
  const res = await fetch(`${BFF_URL}/fiscal/orders/${encodeURIComponent(orderId)}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorDetail(body, res.status));
  return body as OrderFiscal;
}
