import type { InvoiceRequest } from '../types';

export interface InvoiceForm {
  name: string;
  taxId: string;
  email: string;
}

export const EMPTY_INVOICE: InvoiceForm = { name: '', taxId: '', email: '' };

/**
 * Every field is optional: with none filled we send nothing and the server
 * issues the invoice to consumidor final. With a RUC, the server resolves the
 * DV and the company name itself (Digifact GetInfoRuc).
 */
export function buildInvoiceRequest(form: InvoiceForm): { request?: InvoiceRequest; error?: string } {
  const name = form.name.trim();
  const taxId = form.taxId.trim();
  const email = form.email.trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Revisa el correo para la factura.' };
  if (!name && !taxId && !email) return {};
  const request: InvoiceRequest = {
    receiverType: taxId ? '01' : '02',
    taxId: taxId || 'CF',
    name: name || 'Consumidor Final',
  };
  if (email) request.email = email;
  return { request };
}
