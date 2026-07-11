import { bffUrl } from './config';

/**
 * Asks the BFF to create a PagueloFácil hosted payment link for an order and
 * returns the URL to redirect the customer to. The app never handles card data —
 * the customer pays on PagueloFácil's secure page and is redirected back to the
 * tracking screen. The BFF only releases the order to the kitchen once the
 * payment is confirmed (prepayment gate).
 */
export async function initPayment(
  orderId: string,
  amount: number,
  description: string,
): Promise<string> {
  const res = await fetch(`${bffUrl}/payments/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, amount, description }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo iniciar el pago (${res.status})`);
  }
  const data = (await res.json()) as { payment_url?: string };
  if (!data.payment_url) throw new Error('El proveedor de pago no devolvió un enlace.');
  return data.payment_url;
}
