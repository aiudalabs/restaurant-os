/**
 * Electronic invoice hook. Sprint 2 (issue #68) replaces this stub with the
 * call to the BFF fiscal domain; until then a paid order carries no `fiscal`.
 */
export async function requestInvoice(
  _orderId: string,
  _order: FirebaseFirestore.DocumentData,
): Promise<boolean> {
  return false;
}
