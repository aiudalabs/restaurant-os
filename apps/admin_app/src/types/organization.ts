import type { Timestamp } from 'firebase/firestore';

export type Plan = 'starter' | 'growth' | 'chain';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  plan: Plan;
  planExpiresAt?: Timestamp;
  defaultCurrency: string;
  defaultTaxPercent: number;
  defaultTipOptions: number[];
  timezone: string;
  isActive: boolean;
  createdAt: Timestamp;
  ownerId: string;
}
