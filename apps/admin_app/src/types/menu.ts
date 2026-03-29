import type { Timestamp } from 'firebase/firestore';

export interface Menu {
  id: string;
  orgId: string;
  name: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface Category {
  id: string;
  orgId: string;
  menuId: string;
  name: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  availableFrom?: string;
  availableTo?: string;
  availableDays?: number[];
}
