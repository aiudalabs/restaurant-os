import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReceiptData } from '../lib/receipt';

interface Props {
  receipt: ReceiptData;
  /** Called once the print dialog closed (or after a safety timeout). */
  onDone: () => void;
}

/**
 * Prints the receipt through the browser/OS print dialog (on Android Chrome the
 * system print service, e.g. RawBT). It is rendered into <body> next to #root;
 * the print stylesheet (index.css) hides #root and sizes the page to 80 mm.
 * A page cannot print silently: the dialog is always shown.
 */
export function ReceiptPrint({ receipt, onDone }: Props) {
  // Wait for the logo so it is not missing from the printout; a broken logo must not block printing.
  const [ready, setReady] = useState(!receipt.logoUrl);

  useEffect(() => {
    if (!ready) return;
    const finish = () => onDone();
    window.addEventListener('afterprint', finish, { once: true });
    // Some Android browsers never fire afterprint: do not leave the receipt mounted forever.
    const timer = setTimeout(finish, 60_000);
    window.print();
    return () => {
      window.removeEventListener('afterprint', finish);
      clearTimeout(timer);
    };
  }, [ready, onDone]);

  return createPortal(
    <div className="receipt-print" aria-hidden="true">
      <header className="receipt-center">
        {receipt.logoUrl && (
          <img src={receipt.logoUrl} alt="" className="receipt-logo" onLoad={() => setReady(true)} onError={() => setReady(true)} />
        )}
        <p className="receipt-brand">{receipt.brandName}</p>
        {receipt.address && <p>{receipt.address}</p>}
        {receipt.phone && <p>Tel. {receipt.phone}</p>}
      </header>
      <p className="receipt-title">RECIBO DE CONSUMO</p>
      <dl className="receipt-meta">
        <dt>Pedido</dt>
        <dd>{receipt.reference}</dd>
        <dt>Fecha</dt>
        <dd>{receipt.dateText}</dd>
        {receipt.servedBy && (
          <>
            <dt>Atendió</dt>
            <dd>{receipt.servedBy}</dd>
          </>
        )}
      </dl>
      <hr />
      <ul className="receipt-lines">
        {receipt.lines.map((l, i) => (
          <li key={i}>
            <span className="receipt-qty">{l.quantity}</span>
            <span className="receipt-name">
              {l.name}
              {l.note && <small>{l.note}</small>}
              {l.quantity > 1 && <small>{l.quantity} x {l.unitPrice}</small>}
            </span>
            <span className="receipt-amount">{l.total}</span>
          </li>
        ))}
      </ul>
      <hr />
      <dl className="receipt-totals">
        <dt>Subtotal</dt>
        <dd>{receipt.subtotal}</dd>
        {receipt.discount && (
          <>
            <dt>{receipt.discount.label}</dt>
            <dd>{receipt.discount.amount}</dd>
          </>
        )}
        <dt>{receipt.tax.label}</dt>
        <dd>{receipt.tax.amount}</dd>
        {receipt.tip && (
          <>
            <dt>Propina</dt>
            <dd>{receipt.tip}</dd>
          </>
        )}
        <dt className="receipt-total">TOTAL</dt>
        <dd className="receipt-total">{receipt.total}</dd>
        {receipt.paymentText && (
          <>
            <dt>Pago</dt>
            <dd>{receipt.paymentText}</dd>
          </>
        )}
      </dl>
      <p className="receipt-center receipt-foot">¡Gracias por su visita!</p>
    </div>,
    document.body,
  );
}
