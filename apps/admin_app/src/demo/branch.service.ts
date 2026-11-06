import type { Branch } from '@/types/branch';
import { demoBranches } from './data';

export type NewBranch = Omit<Branch, 'id' | 'createdAt'>;

export async function fetchBranch(branchId: string): Promise<Branch | null> {
  return demoBranches.find((b) => b.id === branchId) ?? null;
}

export async function fetchBranches(branchIds: string[]): Promise<Branch[]> {
  return demoBranches.filter((b) => branchIds.includes(b.id));
}

export function watchBranchesByOrg(_orgId: string, callback: (branches: Branch[]) => void) {
  const timer = window.setTimeout(() => callback(demoBranches), 60);
  return () => window.clearTimeout(timer);
}

export async function createBranch(): Promise<string> {
  throw new Error('El modo demo es de solo lectura.');
}

export async function updateBranch(): Promise<void> {
  throw new Error('El modo demo es de solo lectura.');
}
