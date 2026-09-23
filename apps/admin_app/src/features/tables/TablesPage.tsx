import { useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Icon } from '@/components/ui/icon';
import { Card, EmptyState, ExtendedFab, PageHeader, StatusChip } from '@/components/ui/m3';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useTables } from '@/hooks/use-tables';
import { buildCustomerQrUrl } from '@/lib/config';
import type { Table } from '@/types/table';

const TABLE_FORM_SCHEMA = z.object({
  number: z.string().min(1, 'Numero requerido'),
  zone: z.string().optional(),
  capacity: z.number({ error: 'Capacidad requerida' }).min(1, 'Min 1'),
});

type TableFormValues = z.infer<typeof TABLE_FORM_SCHEMA>;

const buildQrUrl = buildCustomerQrUrl;

// ─── QR Preview Dialog ───

interface QrPreviewDialogProps {
  table: Table;
  orgId: string;
  onClose: () => void;
}

function QrPreviewDialog({ table, orgId, onClose }: QrPreviewDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  // Always rebuild from current config so a table saved with an old base URL
  // still shows the correct QR (no migration needed for display).
  const qrUrl = buildQrUrl(orgId, table.branchId, table.id);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = useCallback(() => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `qr-mesa-${table.number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  }, [table.number]);

  return (
    <Dialog
      title={`QR - Mesa ${table.number}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="tonal" icon={copied ? 'check' : 'content_copy'} onClick={handleCopy}>
            {copied ? 'Copiado' : 'Copiar URL'}
          </Button>
          <Button icon="download" onClick={handleDownload}>
            Descargar PNG
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {/* The QR stays black on white in both themes so any phone can scan it. */}
        <div
          ref={qrRef}
          className="flex items-center justify-center rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-white p-4"
        >
          <QRCodeSVG value={qrUrl} size={192} level="H" />
        </div>
        <p className="t-body-small text-center text-[var(--md-sys-color-on-surface-variant)]">
          Mesa {table.number} — escanea para abrir el menu
        </p>
        <div className="t-body-small w-full break-all rounded-lg bg-[var(--md-sys-color-surface-container-highest)] p-3 font-mono text-[var(--md-sys-color-on-surface)]">
          {qrUrl}
        </div>
      </div>
    </Dialog>
  );
}

// ─── Table Form Dialog ───

interface TableFormDialogProps {
  table: Table | null;
  orgId: string;
  branchId: string;
  onSave: (data: Omit<Table, 'id'>) => Promise<string>;
  onUpdate: (id: string, data: Partial<Table>) => Promise<void>;
  onClose: () => void;
}

function TableFormDialog({
  table,
  orgId,
  branchId,
  onSave,
  onUpdate,
  onClose,
}: TableFormDialogProps) {
  const isEditing = table !== null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TableFormValues>({
    resolver: zodResolver(TABLE_FORM_SCHEMA),
    defaultValues: {
      number: table?.number ?? '',
      zone: table?.zone ?? '',
      capacity: table?.capacity ?? 4,
    },
  });

  const onSubmit = async (values: TableFormValues) => {
    if (isEditing) {
      const updateData: Partial<Table> = {
        number: values.number,
        capacity: values.capacity,
      };
      if (values.zone) updateData.zone = values.zone;
      await onUpdate(table.id, updateData);
    } else {
      const tempId = crypto.randomUUID();
      const qrData = buildQrUrl(orgId, branchId, tempId);
      const tableData: Omit<Table, 'id'> = {
        orgId,
        branchId,
        number: values.number,
        capacity: values.capacity,
        qrData,
        isActive: true,
      };
      if (values.zone) tableData.zone = values.zone;
      const id = await onSave(tableData);
      // Update qrData with the real Firestore id
      const realQrData = buildQrUrl(orgId, branchId, id);
      await onUpdate(id, { qrData: realQrData });
    }
    onClose();
  };

  return (
    <Dialog
      title={isEditing ? 'Editar mesa' : 'Nueva mesa'}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear mesa'}
          </Button>
        </>
      }
    >
      <div className="space-y-6 pt-3">
        <Input
          id="number"
          label="Numero de mesa"
          placeholder="Ej: 7, T-3, VIP-1"
          isRequired
          error={errors.number?.message}
          {...register('number')}
        />
        <Input
          id="zone"
          label="Zona (opcional)"
          placeholder="Ej: Terraza, Salon principal"
          {...register('zone')}
        />
        <Input
          id="capacity"
          label="Capacidad"
          type="number"
          min={1}
          isRequired
          error={errors.capacity?.message}
          {...register('capacity', { valueAsNumber: true })}
        />
      </div>
    </Dialog>
  );
}

// ─── Table Card ───

interface TableCardProps {
  table: Table;
  onQr: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function TableCard({ table, onQr, onEdit, onToggle, onDelete }: TableCardProps) {
  const occupied = Boolean(table.currentOrderId);

  return (
    <Card className="flex flex-col p-4">
      <div className={cn('flex-1', !table.isActive && 'opacity-60')}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="t-title-large text-[var(--md-sys-color-on-surface)]">#{table.number}</h3>
          <div className="flex flex-wrap justify-end gap-1">
            {!table.isActive && <StatusChip tone="outline">Inactiva</StatusChip>}
            <StatusChip tone={occupied ? 'info' : 'success'}>{occupied ? 'Ocupada' : 'Libre'}</StatusChip>
          </div>
        </div>
        <div className="mt-2 space-y-1 text-[var(--md-sys-color-on-surface-variant)]">
          {table.zone && (
            <p className="t-body-medium flex items-center gap-2">
              <Icon name="location_on" size={18} />
              {table.zone}
            </p>
          )}
          <p className="t-body-medium flex items-center gap-2">
            <Icon name="group" size={18} />
            Capacidad: {table.capacity}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 border-t border-[var(--md-sys-color-outline-variant)] pt-3">
        <Button variant="tonal" size="sm" icon="qr_code_2" onClick={onQr}>
          QR
        </Button>
        <div className="ml-auto flex items-center">
          <IconButton icon="edit" label={`Editar mesa ${table.number}`} onClick={onEdit} />
          <IconButton
            icon="power_settings_new"
            label={`${table.isActive ? 'Desactivar' : 'Activar'} mesa ${table.number}`}
            className={table.isActive ? undefined : 'text-[var(--md-sys-color-primary)]'}
            onClick={onToggle}
          />
          {!occupied && (
            <IconButton
              icon="delete"
              label={`Eliminar mesa ${table.number}`}
              className="text-[var(--md-sys-color-error)]"
              onClick={onDelete}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Tables Page ───

export default function TablesPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranchId: branchId } = useBranchContext();

  const { tables, loading, createTable, updateTable, deleteTable, toggleTable } =
    useTables(orgId, branchId);

  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [deletingTable, setDeletingTable] = useState<Table | null>(null);

  const handleAdd = () => {
    setEditingTable(null);
    setShowForm(true);
  };

  const handleEdit = (table: Table) => {
    setEditingTable(table);
    setShowForm(true);
  };

  const handleDelete = async (table: Table) => {
    if (table.currentOrderId) return;
    await deleteTable(table.id);
  };

  if (!branchId) {
    return (
      <Card>
        <EmptyState icon="storefront" title="No hay sucursal asignada a tu usuario." />
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          role="status"
          aria-label="Cargando"
          className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--md-sys-color-primary)] border-t-transparent"
        />
      </div>
    );
  }

  const occupiedCount = tables.filter((t) => t.currentOrderId).length;

  return (
    // Bottom padding keeps the last row clear of the extended FAB.
    <div className="pb-24">
      {tables.length === 0 ? (
        <Card>
          <EmptyState
            icon="table_restaurant"
            title="No hay mesas creadas."
            action={
              <Button variant="tonal" icon="add" onClick={handleAdd}>
                Crear la primera
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <PageHeader
            subtitle={`${tables.length} ${tables.length === 1 ? 'mesa' : 'mesas'} · ${occupiedCount} ${occupiedCount === 1 ? 'ocupada' : 'ocupadas'}`}
          />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onQr={() => setQrTable(table)}
                onEdit={() => handleEdit(table)}
                onToggle={() => toggleTable(table.id, !table.isActive)}
                onDelete={() => setDeletingTable(table)}
              />
            ))}
          </div>
        </>
      )}

      <ExtendedFab icon="add" onClick={handleAdd}>
        Nueva mesa
      </ExtendedFab>

      {showForm && (
        <TableFormDialog
          table={editingTable}
          orgId={orgId}
          branchId={branchId}
          onSave={createTable}
          onUpdate={updateTable}
          onClose={() => setShowForm(false)}
        />
      )}

      {qrTable && (
        <QrPreviewDialog
          table={qrTable}
          orgId={orgId}
          onClose={() => setQrTable(null)}
        />
      )}

      {deletingTable && (
        <ConfirmDialog
          title={`Eliminar mesa ${deletingTable.number}`}
          message="La mesa y su QR dejarán de funcionar. Esta acción no se puede deshacer."
          onConfirm={() => handleDelete(deletingTable)}
          onClose={() => setDeletingTable(null)}
        />
      )}
    </div>
  );
}
