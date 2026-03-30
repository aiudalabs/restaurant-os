import { useState } from 'react';
import { Plus, Pencil, Trash2, Power, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useStations } from '@/hooks/use-stations';
import { useCategories } from '@/hooks/use-menu';
import type { Station } from '@/types/station';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar estacion' : 'Nueva estacion'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input
            id="name"
            label="Nombre"
            placeholder="Ej: Cocina, Bar, Postres"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="space-y-1">
            <label htmlFor="color" className="block text-sm font-medium text-gray-700">
              Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-gray-300"
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
            <label className="block text-sm font-medium text-gray-700">
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
                        'rounded-full px-3 py-1 text-sm border transition-colors',
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" type="button" onClick={onClose}>
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
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Estaciones</h1>
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
        <h1 className="text-2xl font-bold text-gray-900">Estaciones</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva estacion
        </Button>
      </div>

      {stations.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
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
                'rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm',
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
                      {station.categoryIds.length === 0
                        ? 'Sin categorias asignadas'
                        : `${station.categoryIds.length} categoria(s) asignada(s)`}
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
    </div>
  );
}
