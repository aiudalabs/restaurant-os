import type { OrderFiscal } from '@/types/order';
import type { FiscalCredentialsStatus } from '@/services/fiscal.service';

export async function setFiscalCredentials(): Promise<void> {
  throw new Error('El modo demo es de solo lectura.');
}

export async function getFiscalStatus(): Promise<FiscalCredentialsStatus> {
  return { configured: false };
}

export async function retryInvoice(): Promise<OrderFiscal> {
  await new Promise((resolve) => window.setTimeout(resolve, 600));
  throw new Error('El modo demo no habla con Digifact. Así se ve un reintento que falla.');
}
