import type { Timestamp } from 'firebase/firestore';

export type Plan = 'starter' | 'growth' | 'chain';

/** DGI tax code of an invoice line: 00 = exento, 01 = ITBMS 7 %. */
export type FiscalTaxCode = '00' | '01';

/** Electronic invoicing (Panamá) through the Digifact PAC. Credentials live server-side. */
export interface OrganizationFiscal {
  enabled: boolean;
  provider: 'digifact';
  env: 'test' | 'prod';
  ruc: string;
  dv: string;
  /** 1 = persona natural, 2 = persona jurídica. */
  taxIdType: '1' | '2';
  legalName: string;
  phone?: string;
  /** Default CPBS (Codificación Panameña de Bienes y Servicios) for products without their own. */
  defaultCpbsAbr: string;
  defaultCpbsCmp: string;
  defaultTaxCode: FiscalTaxCode;
}

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
  fiscal?: OrganizationFiscal;
}
