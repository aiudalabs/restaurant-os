import * as admin from "firebase-admin";

export type PaymentMethod = "cash" | "card" | "yappy" | "transfer";
export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "yappy", "transfer"];

/** Who the fiscal invoice is for. receiverType 01 = contribuyente (RUC), 02 = consumidor final. */
export interface InvoiceRequest {
  receiverType: "01" | "02";
  taxId: string;
  dv?: string;
  name: string;
  email?: string;
}

export interface MarkPaidParams {
  method: PaymentMethod;
  /** uid of the staff member who collected / confirmed, or "bff" for the card callback. */
  uid: string;
  now: admin.firestore.Timestamp;
  confirmationNumber?: string;
  invoiceRequest?: InvoiceRequest;
}

/**
 * The ONE place that marks an order as paid. Every payment origin (Cobrar in
 * waiter_web, manual Yappy, card callback) goes through here so `payment.status`
 * means the same thing everywhere; onOrderPaid reacts to the flip to 'paid'
 * (KDS release, audit, fiscal invoice).
 *
 * Returns 'already_paid' without writing when the order is already paid — a
 * double tap or a retried callback never produces a second paidAt.
 */
export function markOrderPaid(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  order: FirebaseFirestore.DocumentData,
  p: MarkPaidParams,
): "paid" | "already_paid" {
  if (order.payment?.status === "paid") return "already_paid";

  const update: Record<string, unknown> = {
    "payment.method": p.method,
    "payment.status": "paid",
    "payment.paidAt": p.now,
    "payment.recordedBy": p.uid,
    updatedAt: p.now,
  };
  if (p.confirmationNumber) update["payment.confirmationNumber"] = p.confirmationNumber;
  if (p.invoiceRequest) update.invoiceRequest = cleanInvoiceRequest(p.invoiceRequest);
  // A link order waiting for its payment becomes a normal confirmed order; the
  // kitchen release itself happens in onOrderPaid.
  if (order.status === "pending_payment") update.status = "confirmed";

  tx.update(ref, update);
  return "paid";
}

/**
 * Normalises the optional invoice request sent by a client. Everything is
 * optional: no data → consumidor final without a name; a name alone →
 * consumidor final with that name; a RUC → contribuyente (the BFF resolves the
 * DV and the legal name against the DGI through Digifact before issuing).
 */
export function cleanInvoiceRequest(raw: unknown): InvoiceRequest {
  const r = (raw ?? {}) as Record<string, unknown>;
  const taxIdRaw = typeof r.taxId === "string" ? r.taxId.trim() : "";
  const taxId = taxIdRaw && taxIdRaw.toUpperCase() !== "CF" ? taxIdRaw : "";
  const name = typeof r.name === "string" ? r.name.trim() : "";
  const dv = typeof r.dv === "string" ? r.dv.trim() : "";
  const email = typeof r.email === "string" ? r.email.trim() : "";
  return {
    receiverType: taxId ? "01" : "02",
    taxId: taxId || "CF",
    ...(dv ? { dv } : {}),
    name: name || "Consumidor Final",
    ...(email ? { email } : {}),
  };
}
