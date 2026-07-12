import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Plus, Pencil, Trash2, Power, X, KeyRound, Copy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useStations } from '@/hooks/use-stations';
import { useCategories } from '@/hooks/use-menu';
import type { Station } from '@/types/station';

const KDS_URL = 'https://restaurant-os-cocina.web.app';

// ─── Station PIN / KDS link dialog ───

function StationPinDialog({ station, onClose }: { station: Station; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const kdsLink = `${KDS_URL}/?station=${station.id}`;

  const save = async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setError('El PIN debe ser de 4 a 6 dígitos.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await httpsCallable(functions, 'setStationPin')({ stationId: station.id, pin });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el PIN.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="m3-card w-full max-w-md rounded-[1.75rem] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">PIN de «{station.name}»</h2>
          <button onClick={onClose} className="m3-state rounded-full p-2 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500">
          El KDS de esta estación entra con este PIN (4-6 dígitos). Se guarda cifrado y validado
          en el servidor.
        </p>

        <Input
          id="station-pin"
          label="PIN"
          type="text"
          inputMode="numeric"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
            setSaved(false);
          }}
          placeholder="Ej: 4821"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-2 text-sm font-semibold text-green-600">✓ PIN guardado.</p>}

        <div className="mt-5 rounded-2xl bg-[var(--color-surface-container-high)] p-4">
          <p className="text-xs font-medium text-gray-500">Link del KDS para este dispositivo</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="truncate font-mono text-xs text-gray-900">{kdsLink}</code>
            <button
              onClick={() => navigator.clipboard?.writeText(kdsLink)}
              className="m3-state shrink-0 rounded-full p-2 text-gray-500"
              title="Copiar"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Ábrelo una vez en el tablet; luego solo pide el PIN.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar PIN'}
          </Button>
        </div>
      </div>
    </div>
  );
}

const STATION_FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  color: z.string().min(1, 'Color requerido'),
  categoryIds: z.array(z.string()),
});

type StationFormValues = z.infer<typeof STATION_FORM_SCHEMA>;

// ─── Station Form Dialog ───

interface StationFormDialogProps {
  station: Station | null;
  orgId: string;
  branchId: string;
  menuId: string;
  onSave: (data: Omit<Station, 'id'>) => Promise<string>;
  onUpdate: (id: string, data: Partial<Station>) => Promise<void>;
  onClose: () => void;
}

function StationFormDialog({
  station,
  orgId,
  branchId,
  menuId,
  onSave,
  onUpdate,
  onClose,
}: StationFormDialogProps) {
  const isEditing = station !== null;
  const { categories } = useCategories(menuId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StationFormValues>({
    resolver: zodResolver(STATION_FORM_SCHEMA),
    defaultValues: {
      name: station?.name ?? '',
      color: station?.color ?? '#FF5722',
      categoryIds: station?.categoryIds ?? [],
    },
  });

  const selectedCategoryIds = watch('categoryIds');

  const toggleCategoryId = (catId: string) => {
    const current = selectedCategoryIds;
    if (current.includes(catId)) {
      setValue(
        'categoryIds',
        current.filter((id) => id !== catId),
      );
    } else {
      setValue('categoryIds', [...current, catId]);
    }
  };

  const onSubmit = async (values: StationFormValues) => {
    if (isEditing) {
      await onUpdate(station.id, {
        name: values.name,
        color: values.color,
        categoryIds: values.categoryIds,
      });
    } else {
      await onSave({
        orgId,
        branchId,
        name: values.name,
        color: values.color,
        categoryIds: values.categoryIds,
        fcmTokens: [],
        isActive: true,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="m3-card p-6 rounded-[1.75rem] w-full max-w-md">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Editar estacion' : 'Nueva estacion'}
          </h2>
          <button onClick={onClose} className="m3-state rounded-full p-2 text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="name"
            label="Nombre"
            placeholder="Ej: Cocina, Bar, Postres"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="space-y-1.5">
            <label htmlFor="color" className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
              Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                className="h-12 w-14 cursor-pointer rounded-xl border border-[var(--color-outline-variant)] bg-transparent"
                {...register('color')}
              />
              <Input
                className="flex-1"
                placeholder="#FF5722"
                {...register('color')}
              />
            </div>
            {errors.color?.message && (
              <p className="text-sm text-red-600">{errors.color.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
              Categorias asignadas
            </label>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400">
                No hay categorias en el menu. Crea categorias primero.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategoryId(cat.id)}
                      className={cn(
                        'm3-state rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                        isSelected
                          ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]'
                          : 'bg-[var(--color-surface-container-high)] text-gray-600',
                      )}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="tonal" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Guardando...'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Crear estacion'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Stations Page ───

export default function StationsPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranchId: branchId, selectedBranch } = useBranchContext();

  const { stations, loading, createStation, updateStation, deleteStation, toggleStation } =
    useStations(orgId, branchId);

  const menuId = selectedBranch?.menuId ?? '';

  const [showForm, setShowForm] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [pinStation, setPinStation] = useState<Station | null>(null);

  const handleAdd = () => {
    setEditingStation(null);
    setShowForm(true);
  };

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    setShowForm(true);
  };

  const handleDelete = async (station: Station) => {
    await deleteStation(station.id);
  };

  if (!branchId) {
    return (
      <div className="m3-card p-5 text-center py-12">
        <p className="text-gray-500">No hay sucursal asignada a tu usuario.</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva estacion
        </Button>
      </div>

      {stations.length === 0 ? (
        <div className="m3-card p-5 py-12 text-center">
          <p className="text-sm text-gray-500">No hay estaciones creadas.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={handleAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Crear la primera
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {stations.map((station) => (
            <div
              key={station.id}
              className={cn(
                'm3-card p-5',
                !station.isActive && 'opacity-50',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: station.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{station.name}</h3>
                    <p className="text-sm text-gray-500">
                      {(station.categoryIds?.length ?? 0) === 0
                        ? 'Sin categorias asignadas'
                        : `${station.categoryIds?.length} categoria(s) asignada(s)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleEdit(station)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-orange-600"
                    onClick={() => setPinStation(station)}
                  >
                    <KeyRound className="mr-1 h-3.5 w-3.5" />
                    PIN / KDS
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-7 text-xs',
                      station.isActive ? 'text-gray-500' : 'text-green-600',
                    )}
                    onClick={() => toggleStation(station.id, !station.isActive)}
                  >
                    <Power className="mr-1 h-3.5 w-3.5" />
                    {station.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(station)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <StationFormDialog
          station={editingStation}
          orgId={orgId}
          branchId={branchId}
          menuId={menuId}
          onSave={createStation}
          onUpdate={updateStation}
          onClose={() => setShowForm(false)}
        />
      )}

      {pinStation && <StationPinDialog station={pinStation} onClose={() => setPinStation(null)} />}
    </div>
  );
}
