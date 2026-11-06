import type { AppUser } from '@/types/user';
import { isEmptySetup } from './data';

const READ_ONLY = 'El modo demo es de solo lectura.';

export function watchUsers(orgId: string, callback: (users: AppUser[]) => void) {
  const waiter = { id: 'u-waiter', orgId, branchIds: ['demo-branch'], email: 'mesero@demo.invalid', displayName: 'Mesero Demo', role: 'waiter', isActive: true };
  const timer = window.setTimeout(() => callback(isEmptySetup() ? [] : [waiter as unknown as AppUser]), 80);
  return () => window.clearTimeout(timer);
}

const readOnly = async () => {
  throw new Error(READ_ONLY);
};
export const updateUser = readOnly;
export const toggleUser = readOnly;
export const createOperatorUser = readOnly;
export const setWaiterPin = readOnly;
export const deleteUser = readOnly;
