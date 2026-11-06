import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StatusChip, type StatusTone } from '@/components/ui/m3';
import { useNow } from '@/hooks/use-now';
import { printPdf } from '@/lib/print';
import { retryInvoice } from '@/services/fiscal.service';
import type { FiscalStatus, Order } from '@/types/order';
import { DetailRow } from './detail-row';

const FISCAL_LABELS: Record<FiscalStatus, string> = {
  pending: 'Generando',
  issuing: 'Generando',
  issued: 'Emitida',
  error: 'Con error',
  skipped: 'Sin facturación',
};

const FISCAL_TONES: Record<FiscalStatus, StatusTone> = {
  pending: 'info',
  issuing: 'info',
  issued: 'success',
  error: 'error',
  skipped: 'neutral',
};

/** A `pending` invoice older than this is presumed stuck and can be retried by hand. */
const STUCK_PENDING_MS = 2 * 60 * 1000;

const RECEIVER_LABELS: Record<'01' | '02', string> = {
  '01': 'Contribuyente',
  '02': 'Consumidor final',
};

/** Electronic invoice of an order: state, data, PDF/print and a retry when it failed or got stuck. */
export function InvoiceSection({ order }: { order: Order }) {
  const now = useNow(15_000);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState('');
  const fiscal = order.fiscal;
  const request = order.invoiceRequest;
  if (!fiscal && !request) return null;

  const updatedMs = order.updatedAt?.toDate?.().getTime() ?? 0;
  const stuck = fiscal?.status === 'pending' && updatedMs > 0 && now - updatedMs > STUCK_PENDING_MS;
  const canRetry = fiscal?.status === 'error' || stuck;

  const retry = async () => {
    setRetrying(true);
    setRetryError('');
    try {
      // The live order doc carries the final state; the response only tells us about a new error.
      const result = await retryInvoice(order.id);
      if (result.status === 'error') setRetryError(result.lastError || 'Digifact rechazó la factura. Revisa los datos del cliente y vuelve a intentarlo.');
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : 'No se pudo reintentar la factura. Inténtalo de nuevo en un momento.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <section className="border-t border-[var(--line)] pt-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="t-title-medium text-[var(--ink)]">Factura electrónica</h3>
        {fiscal && (
          <StatusChip tone={FISCAL_TONES[fiscal.status] ?? 'outline'} icon="receipt">
            {FISCAL_LABELS[fiscal.status] ?? fiscal.status}
          </StatusChip>
        )}
      </div>
      <dl className="space-y-1">
        {request && (
          <>
            <DetailRow label="Cliente">{request.name}</DetailRow>
            <DetailRow label={request.receiverType === '01' ? 'RUC' : 'Cédula / RUC'}>
              {request.taxId ? `${request.taxId}${request.dv ? ` DV ${request.dv}` : ''}` : '-'}
            </DetailRow>
            <DetailRow label="Tipo">{RECEIVER_LABELS[request.receiverType] ?? request.receiverType}</DetailRow>
          </>
        )}
        {fiscal?.numeroDF && <DetailRow label="Número">{fiscal.numeroDF}</DetailRow>}
        {fiscal?.cufe && (
          <DetailRow label="CUFE">
            <span title={fiscal.cufe} className="break-all">
              {fiscal.cufe.length > 24 ? `${fiscal.cufe.slice(0, 24)}…` : fiscal.cufe}
            </span>
          </DetailRow>
        )}
      </dl>

      {fiscal?.status === 'error' && fiscal.lastError && (
        <p className="t-body-medium mt-3 rounded-[10px] bg-[var(--late-wash)] px-3 py-2 text-[var(--late-ink)]">{fiscal.lastError}</p>
      )}

      {fiscal?.status === 'issued' && (fiscal.pdfUrl || fiscal.qrUrl) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {fiscal.pdfUrl && (
            <a
              href={fiscal.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="m3-state t-label-large inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--tint)] px-4 text-[var(--ink)]"
            >
              <Icon name="picture_as_pdf" size={18} /> Ver PDF
            </a>
          )}
          {fiscal.pdfUrl && (
            <Button
              type="button"
              variant="tonal"
              disabled={printing}
              onClick={async () => {
                setPrintError('');
                setPrinting(true);
                try {
                  await printPdf(fiscal.pdfUrl as string);
                } catch (e) {
                  setPrintError(e instanceof Error ? e.message : 'No se pudo imprimir. Abre el PDF e imprímelo desde el navegador.');
                } finally {
                  setPrinting(false);
                }
              }}
            >
              <Icon name="print" size={18} /> {printing ? 'Imprimiendo…' : 'Imprimir factura'}
            </Button>
          )}
          {fiscal.qrUrl && (
            <a
              href={fiscal.qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="m3-state t-label-large inline-flex h-11 items-center gap-2 rounded-[10px] px-3 text-[var(--ink)] underline underline-offset-4"
            >
              <Icon name="open_in_new" size={18} /> Consultar en la DGI
            </a>
          )}
          {printError && <p className="t-body-small w-full text-[var(--late-ink)]">{printError}</p>}
        </div>
      )}

      {retryError && (
        <p role="alert" className="t-body-medium mt-3 rounded-[10px] bg-[var(--late-wash)] px-3 py-2 text-[var(--late-ink)]">
          {retryError}
        </p>
      )}

      {canRetry && (
        <Button variant="tonal" icon={retrying ? undefined : 'refresh'} className="mt-3" disabled={retrying} onClick={retry}>
          {retrying && <Icon name="progress_activity" size={18} className="animate-spin" />}
          {retrying ? 'Reintentando…' : 'Reintentar factura'}
        </Button>
      )}
    </section>
  );
}
