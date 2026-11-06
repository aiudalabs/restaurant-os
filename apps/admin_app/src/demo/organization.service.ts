import type { Organization } from '@/types/organization';
import { demoOrganization } from './data';

export function watchOrganization(_orgId: string, callback: (org: Organization | null) => void): () => void {
  const timer = window.setTimeout(() => callback(demoOrganization), 60);
  return () => window.clearTimeout(timer);
}

export async function updateOrganizationFiscal(): Promise<void> {
  throw new Error('El modo demo es de solo lectura.');
}

export async function updateOrganizationDiscounts(): Promise<void> {
  throw new Error('El modo demo es de solo lectura.');
}
