import { describe, expect, it } from 'vitest';
import { buildInvoiceRequest, EMPTY_INVOICE } from './invoice';

describe('buildInvoiceRequest', () => {
  it('sends nothing when the form is empty (server issues consumidor final)', () => {
    expect(buildInvoiceRequest(EMPTY_INVOICE)).toEqual({});
    expect(buildInvoiceRequest({ name: '  ', taxId: ' ', email: '' })).toEqual({});
  });

  it('uses receiver type 01 (RUC) when a tax id is given', () => {
    expect(buildInvoiceRequest({ name: 'ACME SA', taxId: ' 155-123-456 ', email: '' }).request).toEqual({
      receiverType: '01',
      taxId: '155-123-456',
      name: 'ACME SA',
    });
  });

  it('falls back to consumidor final (02/CF) when there is no tax id', () => {
    expect(buildInvoiceRequest({ name: '', taxId: '', email: 'a@b.co' }).request).toEqual({
      receiverType: '02',
      taxId: 'CF',
      name: 'Consumidor Final',
      email: 'a@b.co',
    });
  });

  it('omits email when blank (Firestore rejects undefined)', () => {
    const r = buildInvoiceRequest({ name: 'Ana', taxId: '', email: '' }).request;
    expect(r).toEqual({ receiverType: '02', taxId: 'CF', name: 'Ana' });
    expect(r && 'email' in r).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(buildInvoiceRequest({ name: 'Ana', taxId: '', email: 'no-at-sign' })).toEqual({
      error: 'Revisa el correo para la factura.',
    });
    expect(buildInvoiceRequest({ name: '', taxId: '', email: 'a@b' }).error).toBeDefined();
  });
});
