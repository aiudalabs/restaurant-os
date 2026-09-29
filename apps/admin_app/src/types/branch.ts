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
  /** Waiter app shows product photos (default off). */
  showProductImagesToWaiters?: boolean;
  /** Yappy number/handle customers pay to when ordering from the link (manual Yappy). */
  yappyHandle?: string;
  /** Customers ordering from the link may choose to pay at pickup. */
  allowPayAtPickup?: boolean;
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
