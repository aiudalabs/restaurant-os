import type { FiscalTaxCode } from './organization';

export interface ModifierOption {
  id: string;
  name: string;
  extraPrice: number;
  isDefault: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

/** Per-product invoicing overrides; empty keys fall back to the organization defaults. */
export interface ProductFiscal {
  cpbsAbr?: string;
  cpbsCmp?: string;
  taxCode?: FiscalTaxCode;
}

export interface Product {
  id: string;
  orgId: string;
  menuId: string;
  categoryId: string;
  name: string;
  description?: string;
  /** Internal note shown to waiters under the product name (not in the customer app). */
  waiterNote?: string;
  imageUrl?: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  tags: string[];
  modifierGroups: ModifierGroup[];
  preparationMinutes?: number;
  fiscal?: ProductFiscal;
}
