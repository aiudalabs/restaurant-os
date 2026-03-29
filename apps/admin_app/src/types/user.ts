import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'manager' | 'operator';

export interface AppUser {
  id: string;
  orgId: string;
  branchIds: string[];
  email: string;
  displayName: string;
  role: UserRole;
  stationId?: string;
  isActive: boolean;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
}
