import { useMemo, useState, type ReactNode } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Icon } from '@/components/ui/icon';
import { Card, EmptyState, FilterChip, PageHeader, StatusChip, Switch, TagChip } from '@/components/ui/m3';
import { cn } from '@/lib/utils';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useStations } from '@/hooks/use-stations';
import { useCategories } from '@/hooks/use-menu';
import type { Category } from '@/types/menu';
import type { Station } from '@/types/station';

const KDS_URL = 'https://restaurant-os-cocina.web.app';

const kdsLinkFor = (stationId: string) => `${KDS_URL}/?station=${stationId}`;

/** Copies text to the clipboard and flags `copied` for a moment (button feedback). */
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

/** Other stations that already prepare each category (informative, not enforced). */
type CategoryOwners = Map<string, { id: string; name: string }[]>;

function buildOwners(stations: Station[]): CategoryOwners {
  const owners: CategoryOwners = new Map();
  for (const s of stations) {
    for (const catId of s.categoryIds ?? []) {
      owners.set(catId, [...(owners.get(catId) ?? []), { id: s.id, name: s.name }]);
    }
  }
  return owners;
}

// ─── Category picker (shared by the station form and the assign dialog) ───

function CategoryPicker({
  categories,
  selectedIds,
  onToggle,
  owners,
  stationId,
}: {
  categories: Category[];
  selectedIds: string[];
  onToggle: (catId: string) => void;
  owners: CategoryOwners;
  stationId: string | null;
}) {
  if (categories.length === 0) {
    return (
      <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">
        No hay categorías en el menú. Crea categorías primero.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const others = (owners.get(cat.id) ?? []).filter((o) => o.id !== stationId);
        return (
          <FilterChip key={cat.id} selected={selectedIds.includes(cat.id)} onClick={() => onToggle(cat.id)}>
            {cat.name}
            {others.length > 0 && (
              <span className="t-label-medium text-[var(--md-sys-color-on-surface-variant)]">
                · {others.map((o) => o.name).join(', ')}
              </span>
            )}
          </FilterChip>
        );
      })}
    </div>
  );
}

// ─── Station PIN / KDS link dialog ───

function StationPinDialog({ station, onClose }: { station: Station; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const { copied, copy } = useCopy();
  const kdsLink = kdsLinkFor(station.id);

  const save = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setError('El PIN debe ser de 6 dígitos.');
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
    <Dialog
      title={`PIN de «${station.name}»`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar PIN'}
          </Button>
        </>
      }
    >
      <p className="t-body-medium mb-6 text-[var(--md-sys-color-on-surface-variant)]">
        El KDS de esta estación entra con este PIN (6 dígitos). Se guarda cifrado y validado
        en el servidor; tras 5 intentos fallidos la estación se bloquea (5 min, luego 30 min, luego 24 h).
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
        placeholder="Ej: 482913"
        error={error || undefined}
        supporting={`${pin.length}/6 dígitos`}
      />
      {saved && (
        <p className="t-body-medium mt-3 flex items-center gap-2 text-[var(--md-sys-color-primary)]">
          <Icon name="check_circle" size={20} /> PIN guardado.
        </p>
      )}

      <div className="mt-6 rounded-xl bg-[var(--md-sys-color-surface-container-highest)] p-4">
        <p className="t-label-medium text-[var(--md-sys-color-on-surface-variant)]">Link del KDS para este dispositivo</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <code className="t-body-small min-w-0 truncate font-mono text-[var(--md-sys-color-on-surface)]">{kdsLink}</code>
          <IconButton icon={copied ? 'check' : 'content_copy'} label="Copiar link" onClick={() => copy(kdsLink)} />
        </div>
        <p className="t-body-small mt-1 text-[var(--md-sys-color-on-surface-variant)]">
          Ábrelo una vez en el tablet; luego solo pide el PIN.
        </p>
      </div>
    </Dialog>
  );
}

// ─── Assign categories dialog ───

function AssignCategoriesDialog({
  station,
  categories,
  owners,
  onUpdate,
  onClose,
}: {
  station: Station;
  categories: Category[];
  owners: CategoryOwners;
  onUpdate: (id: string, data: Partial<Station>) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(station.categoryIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (catId: string) =>
    setSelectedIds((ids) => (ids.includes(catId) ? ids.filter((id) => id !== catId) : [...ids, catId]));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onUpdate(station.id, { categoryIds: selectedIds });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar las categorías.');
      setSaving(false);
    }
  };

  return (
    <Dialog
      title={`Qué prepara «${station.name}»`}
      onClose={onClose}
      className="sm:max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <p className="t-body-medium mb-4 text-[var(--md-sys-color-on-surface-variant)]">
        Los productos de estas categorías llegan al KDS de esta estación. Junto al nombre ves
        qué otra estación ya la prepara.
      </p>
      <CategoryPicker
        categories={categories}
        selectedIds={selectedIds}
        onToggle={toggle}
        owners={owners}
        stationId={station.id}
      />
      {error && (
        <p className="t-body-medium mt-4 rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">
          {error}
        </p>
      )}
    </Dialog>
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
  categories: Category[];
  owners: CategoryOwners;
  onSave: (data: Omit<Station, 'id'>) => Promise<string>;
  onUpdate: (id: string, data: Partial<Station>) => Promise<void>;
  onClose: () => void;
}

function StationFormDialog({
  station,
  orgId,
  branchId,
  categories,
  owners,
  onSave,
  onUpdate,
  onClose,
}: StationFormDialogProps) {
  const isEditing = station !== null;

  const {
    register,
    handleSubmit,
    control,
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

  const selectedCategoryIds = useWatch({ control, name: 'categoryIds' });

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
    <Dialog
      title={isEditing ? 'Editar estación' : 'Nueva estación'}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      className="sm:max-w-lg"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando…'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear estación'}
          </Button>
        </>
      }
    >
      <div className="space-y-6 pt-2">
        <Input
          id="name"
          label="Nombre"
          placeholder="Ej: Cocina, Bar, Postres"
          error={errors.name?.message}
          isRequired
          {...register('name')}
        />

        <div className="flex items-start gap-3">
          <input
            id="color"
            type="color"
            aria-label="Elegir color"
            className="h-14 w-14 shrink-0 cursor-pointer rounded-[4px] border border-[var(--md-sys-color-outline)] bg-transparent p-1"
            {...register('color')}
          />
          <div className="min-w-0 flex-1">
            <Input
              id="color-hex"
              label="Color"
              placeholder="#FF5722"
              error={errors.color?.message}
              supporting="Identifica la estación en el KDS."
              {...register('color')}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="t-title-small text-[var(--md-sys-color-on-surface)]">Categorías asignadas</p>
          <CategoryPicker
            categories={categories}
            selectedIds={selectedCategoryIds}
            onToggle={toggleCategoryId}
            owners={owners}
            stationId={station?.id ?? null}
          />
        </div>
      </div>
    </Dialog>
  );
}

// ─── Station card ───

function KeyValue({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Icon name={icon} size={20} className="shrink-0 text-[var(--md-sys-color-on-surface-variant)]" />
      <span className="t-label-large w-16 shrink-0 text-[var(--md-sys-color-on-surface-variant)]">{label}</span>
      <span className="t-body-medium min-w-0 flex-1 truncate text-[var(--md-sys-color-on-surface)]">{children}</span>
    </div>
  );
}

function StationCard({
  station,
  categoryNames,
  unknownCount,
  categoriesLoading,
  onEdit,
  onAssign,
  onPin,
  onToggle,
  onDelete,
}: {
  station: Station;
  categoryNames: string[];
  unknownCount: number;
  categoriesLoading: boolean;
  onEdit: () => void;
  onAssign: () => void;
  onPin: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
}) {
  const { copied, copy } = useCopy();
  const kdsLink = kdsLinkFor(station.id);
  const hasNone = !categoriesLoading && categoryNames.length === 0;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]">
          <Icon name="soup_kitchen" />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--md-sys-color-surface)]"
            style={{ backgroundColor: station.color }}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn('t-title-large truncate text-[var(--md-sys-color-on-surface)]', !station.isActive && 'opacity-60')}>
            {station.name}
          </h3>
          {!station.isActive && (
            <StatusChip tone="neutral" icon="power_settings_new" className="mt-1">
              Inactiva
            </StatusChip>
          )}
        </div>
        <Switch
          id={`station-active-${station.id}`}
          checked={station.isActive}
          onChange={onToggle}
          label={station.isActive ? 'Desactivar estación' : 'Activar estación'}
        />
      </div>

      <div className="space-y-2">
        <p className="t-label-large text-[var(--md-sys-color-on-surface-variant)]">Prepara</p>
        {hasNone ? (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">
            <Icon name="warning" size={20} className="shrink-0" />
            <p className="t-body-medium">
              No tiene categorías asignadas: ningún producto llega a su KDS.
              {unknownCount > 0 && ` (${unknownCount} de otro menú)`}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categoryNames.map((name) => (
              <TagChip key={name}>{name}</TagChip>
            ))}
            {unknownCount > 0 && <TagChip icon="help">+{unknownCount} de otro menú</TagChip>}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-[var(--md-sys-color-outline-variant)] pt-3">
        <KeyValue icon="key" label="PIN">
          6 dígitos · cifrado en el servidor
        </KeyValue>
        <KeyValue icon="link" label="KDS">
          <code className="t-body-small font-mono">{kdsLink.replace(/^https?:\/\//, '')}</code>
        </KeyValue>
      </div>

      <div className="-mx-1 mt-auto flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" icon={copied ? 'check' : 'content_copy'} onClick={() => copy(kdsLink)}>
          {copied ? 'Copiado' : 'Copiar link'}
        </Button>
        <Button variant="outlined" size="sm" icon="key" onClick={onPin}>
          PIN
        </Button>
        <Button variant={hasNone ? 'primary' : 'tonal'} size="sm" icon="category" onClick={onAssign}>
          Categorías
        </Button>
        <span className="ml-auto flex items-center">
          <IconButton icon="edit" label="Editar estación" onClick={onEdit} />
          <IconButton
            icon="delete"
            label="Eliminar estación"
            onClick={onDelete}
            className="text-[var(--md-sys-color-error)]"
          />
        </span>
      </div>
    </Card>
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
  const { categories, loading: categoriesLoading } = useCategories(menuId);

  const [showForm, setShowForm] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [pinStation, setPinStation] = useState<Station | null>(null);
  const [assignStation, setAssignStation] = useState<Station | null>(null);
  const [confirmStation, setConfirmStation] = useState<Station | null>(null);

  const owners = useMemo(() => buildOwners(stations), [stations]);
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const handleAdd = () => {
    setEditingStation(null);
    setShowForm(true);
  };

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    setShowForm(true);
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--md-sys-color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        subtitle="Cada estación recibe en su KDS los productos de las categorías que prepara."
        actions={
          <Button icon="add" onClick={handleAdd} className="max-sm:w-full">
            Nueva estación
          </Button>
        }
      />

      {stations.length === 0 ? (
        <Card>
          <EmptyState
            icon="soup_kitchen"
            title="No hay estaciones creadas."
            body="Crea una estación (Cocina, Bar…) y asígnale las categorías que prepara."
            action={
              <Button variant="tonal" icon="add" onClick={handleAdd}>
                Crear la primera
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stations.map((station) => {
            const ids = station.categoryIds ?? [];
            const names = ids.map((id) => categoryName.get(id)).filter((n): n is string => Boolean(n));
            return (
              <StationCard
                key={station.id}
                station={station}
                categoryNames={names}
                unknownCount={categoriesLoading ? 0 : ids.length - names.length}
                categoriesLoading={categoriesLoading}
                onEdit={() => handleEdit(station)}
                onAssign={() => setAssignStation(station)}
                onPin={() => setPinStation(station)}
                onToggle={(isActive) => toggleStation(station.id, isActive)}
                onDelete={() => setConfirmStation(station)}
              />
            );
          })}
        </div>
      )}

      {showForm && (
        <StationFormDialog
          station={editingStation}
          orgId={orgId}
          branchId={branchId}
          categories={categories}
          owners={owners}
          onSave={createStation}
          onUpdate={updateStation}
          onClose={() => setShowForm(false)}
        />
      )}

      {assignStation && (
        <AssignCategoriesDialog
          station={assignStation}
          categories={categories}
          owners={owners}
          onUpdate={updateStation}
          onClose={() => setAssignStation(null)}
        />
      )}

      {pinStation && <StationPinDialog station={pinStation} onClose={() => setPinStation(null)} />}

      {confirmStation && (
        <ConfirmDialog
          title="Eliminar estación"
          message={`¿Eliminar "${confirmStation.name}"? Los productos que solo prepara esta estación dejarán de llegar a un KDS.`}
          onConfirm={() => deleteStation(confirmStation.id)}
          onClose={() => setConfirmStation(null)}
        />
      )}
    </div>
  );
}
