import type { Timestamp } from 'firebase/firestore';

export interface BusinessHoursEntry {
  open: string;
  close: string;
}

export interface Branch {
  id: string;
  orgId: string;
  name: string;
  address: string;
  phone?: string;
  menuId: string;
  taxPercent?: number;
  tipOptions?: number[];
  isActive: boolean;
  businessHours: {
    monday?: BusinessHoursEntry;
    tuesday?: BusinessHoursEntry;
    wednesday?: BusinessHoursEntry;
    thursday?: BusinessHoursEntry;
    friday?: BusinessHoursEntry;
    saturday?: BusinessHoursEntry;
    sunday?: BusinessHoursEntry;
  };
  createdAt: Timestamp;
}
