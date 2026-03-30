import { useState, useRef, useCallback } from 'react';
import {
  Plus,
  QrCode,
  Pencil,
  Trash2,
  Power,
  X,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useTables } from '@/hooks/use-tables';
import type { Table } from '@/types/table';

const TABLE_FORM_SCHEMA = z.object({
  number: z.string().min(1, 'Numero requerido'),
  zone: z.string().optional(),
  capacity: z.number({ error: 'Capacidad requerida' }).min(1, 'Min 1'),
});

type TableFormValues = z.infer<typeof TABLE_FORM_SCHEMA>;

function buildQrUrl(orgId: string, branchId: string, tableId: string): string {
  return `https://aiudalabs.github.io/restaurant/qr/?org=${orgId}&branch=${branchId}&table=${tableId}`;
}

// ─── QR Preview Dialog ───

interface QrPreviewDialogProps {
  table: Table;
  orgId: string;
  onClose: () => void;
}

function QrPreviewDialog({ table, orgId, onClose }: QrPreviewDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrUrl = table.qrData || buildQrUrl(orgId, table.branchId, table.id);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            QR - Mesa {table.number}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            ref={qrRef}
            className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-4"
          >
            <QRCodeSVG value={qrUrl} size={192} level="H" />
          </div>
          <p className="text-xs text-gray-500 text-center">
            Mesa {table.number} — escanea para abrir el menu
          </p>
          <div className="w-full rounded-lg bg-gray-50 p-3 text-xs text-gray-700 break-all font-mono">
            {qrUrl}
          </div>
          <div className="w-full flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleCopy} className="flex-1">
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4 text-green-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copiar URL
                </>
              )}
            </Button>
            <Button size="sm" onClick={handleDownload} className="flex-1">
              <Download className="mr-1.5 h-4 w-4" />
              Descargar PNG
            </Button>
          </div>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar mesa' : 'Nueva mesa'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input
            id="number"
            label="Numero de mesa"
            placeholder="Ej: 7, T-3, VIP-1"
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
            error={errors.capacity?.message}
            {...register('capacity', { valueAsNumber: true })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear mesa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
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
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
        <p className="mt-2 text-gray-500">No hay sucursal asignada a tu usuario.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva mesa
        </Button>
      </div>

      {tables.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-500">No hay mesas creadas.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={handleAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Crear la primera
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className={cn(
                'rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm',
                !table.isActive && 'opacity-50',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-gray-900">#{table.number}</span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    table.currentOrderId
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700',
                  )}
                >
                  {table.currentOrderId ? 'Ocupada' : 'Libre'}
                </span>
              </div>

              {table.zone && (
                <p className="text-sm text-gray-500">{table.zone}</p>
              )}
              <p className="text-sm text-gray-500">Capacidad: {table.capacity}</p>

              <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setQrTable(table)}
                >
                  <QrCode className="mr-1 h-3.5 w-3.5" />
                  QR
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleEdit(table)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 text-xs',
                    table.isActive ? 'text-gray-500' : 'text-green-600',
                  )}
                  onClick={() => toggleTable(table.id, !table.isActive)}
                >
                  <Power className="mr-1 h-3.5 w-3.5" />
                  {table.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                {!table.currentOrderId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(table)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
