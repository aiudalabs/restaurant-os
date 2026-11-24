import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
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
  // Wait for the logo and the QR so neither is missing from the printout; a failure of either must not block printing.
  const [logoReady, setLogoReady] = useState(!receipt.logoUrl);
  const [qr, setQr] = useState<{ done: boolean; src: string }>({ done: !receipt.qrUrl, src: '' });
  const ready = logoReady && qr.done;

  useEffect(() => {
    if (!receipt.qrUrl) return;
    let cancelled = false;
    QRCode.toDataURL(receipt.qrUrl, { margin: 0, width: 220, errorCorrectionLevel: 'M' })
      .then((src) => !cancelled && setQr({ done: true, src }))
      .catch(() => !cancelled && setQr({ done: true, src: '' }));
    return () => {
      cancelled = true;
    };
  }, [receipt.qrUrl]);

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
          <img src={receipt.logoUrl} alt="" className="receipt-logo" onLoad={() => setLogoReady(true)} onError={() => setLogoReady(true)} />
        )}
        <p className="receipt-brand">{receipt.brandName}</p>
        {receipt.address && <p>{receipt.address}</p>}
        {receipt.phone && <p>Tel. {receipt.phone}</p>}
        {receipt.ruc && <p>{receipt.ruc}</p>}
      </header>
      <p className="receipt-title">RECIBO DE CONSUMO</p>
      <dl className="receipt-meta">
        <dt>Pedido</dt>
        <dd>{receipt.reference}</dd>
        <dt>Fecha</dt>
        <dd>{receipt.dateText}</dd>
        {receipt.customer && (
          <>
            <dt>Cliente</dt>
            <dd>{receipt.customer.name || '—'}</dd>
            <dt>RUC</dt>
            <dd>{receipt.customer.ruc}</dd>
          </>
        )}
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
      {qr.src && (
        <div className="receipt-center receipt-qr">
          <img src={qr.src} alt="" />
          <p>Escanea para pedir y ver tu Club</p>
        </div>
      )}
      <p className="receipt-center receipt-foot">¡Gracias por su visita!</p>
    </div>,
    document.body,
  );
}
