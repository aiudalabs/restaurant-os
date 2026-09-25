import { useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Button, IconButton } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Card, EmptyState, PageHeader, StatusChip, Switch } from '@/components/ui/m3';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useMenus } from '@/hooks/use-menu';
import { functions } from '@/lib/firebase';
import { CUSTOMER_APP_URL } from '@/lib/config';
import type { Branch } from '@/types/branch';
import type { Menu } from '@/types/menu';

interface ProvisionedOperator {
  station: string;
  email: string;
  password: string;
}

interface BranchFormState {
  name: string;
  address: string;
  phone: string;
  menuId: string;
  taxPercent: string; // percent as typed, e.g. "7"
  isActive: boolean;
  showProductImagesToWaiters: boolean;
}

const EMPTY: BranchFormState = {
  name: '',
  address: '',
  phone: '',
  menuId: '',
  taxPercent: '7',
  isActive: true,
  showProductImagesToWaiters: false,
};

function CredRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-1 flex items-center justify-between gap-2">
      <span className="t-label-medium w-20 shrink-0 text-[var(--md-sys-color-on-surface-variant)]">{label}</span>
      <code className="t-body-medium min-w-0 flex-1 break-all font-mono text-[var(--md-sys-color-on-surface)]">{value}</code>
      <IconButton icon={copied ? 'check' : 'content_copy'} label={`Copiar ${label}`} onClick={copy} />
    </div>
  );
}

function BranchDialog({
  branch,
  menus,
  onClose,
}: {
  branch: Branch | null;
  menus: Menu[];
  onClose: () => void;
}) {
  const { updateBranch } = useBranchContext();
  const [created, setCreated] = useState<ProvisionedOperator[] | null>(null);
  const [form, setForm] = useState<BranchFormState>(
    branch
      ? {
          name: branch.name ?? '',
          address: branch.address ?? '',
          phone: branch.phone ?? '',
          menuId: branch.menuId ?? '',
          taxPercent: branch.taxPercent != null ? String(Math.round(branch.taxPercent * 100)) : '7',
          isActive: branch.isActive ?? true,
          showProductImagesToWaiters: branch.showProductImagesToWaiters ?? false,
        }
      : // A new branch with no menu can't take orders: preselect it when the org has only one.
        { ...EMPTY, menuId: menus.length === 1 ? menus[0].id : '' },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof BranchFormState>(k: K, v: BranchFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      menuId: form.menuId,
      taxPercent: (Number(form.taxPercent) || 0) / 100,
      isActive: form.isActive,
    };
    try {
      if (branch) {
        await updateBranch(branch.id, { ...payload, showProductImagesToWaiters: form.showProductImagesToWaiters });
        onClose();
      } else {
        // Server-side: creates the branch + its stations (Cocina/Bar) + one
        // operator per station, and returns the generated credentials.
        const provision = httpsCallable<
          typeof payload,
          { operators: ProvisionedOperator[] }
        >(functions, 'provisionBranch');
        const res = await provision(payload);
        setCreated(res.data.operators ?? []);
        setSaving(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la sucursal.');
      setSaving(false);
    }
  };

  if (created) {
    return (
      <Dialog title="Sucursal lista" onClose={onClose} className="sm:max-w-lg" footer={<Button onClick={onClose}>Listo</Button>}>
        <p className="t-body-medium mb-4 text-[var(--md-sys-color-on-surface-variant)]">
          Se crearon sus <b>estaciones</b> (Cocina y Bar) y un <b>operador por estación</b> para
          el KDS. Guarda estas credenciales:
        </p>
        <div className="space-y-3">
          {created.length === 0 && (
            <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">
              Las estaciones se crearon; crea los operadores desde «Equipo».
            </p>
          )}
          {created.map((op) => (
            <div key={op.email} className="rounded-xl bg-[var(--md-sys-color-surface-container-highest)] py-3 pl-4 pr-2">
              <div className="t-title-small flex items-center gap-2 text-[var(--md-sys-color-on-surface)]">
                <Icon name="soup_kitchen" size={20} className="text-[var(--md-sys-color-primary)]" /> {op.station}
              </div>
              <CredRow label="Email" value={op.email} />
              <CredRow label="Contraseña" value={op.password} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">
          <Icon name="warning" size={20} className="shrink-0" />
          <p className="t-body-small">
            Guárdalas ahora — la contraseña no se vuelve a mostrar. Para entrar más fácil al KDS, ponle un PIN a cada estación en «Estaciones».
          </p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={branch ? 'Editar sucursal' : 'Nueva sucursal'}
      onClose={onClose}
      className="sm:max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : branch ? 'Guardar' : 'Crear sucursal'}
          </Button>
        </>
      }
    >
      <div className="space-y-6 pt-2">
        <Input
          id="branch-name"
          label="Nombre"
          placeholder="Sucursal Marbella"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          isRequired
        />
        <Input
          id="branch-address"
          label="Dirección"
          placeholder="Calle 50, Ciudad de Panamá"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            id="branch-phone"
            label="Teléfono"
            placeholder="+507 …"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          <Input
            id="branch-tax"
            label="Impuesto (%)"
            type="number"
            value={form.taxPercent}
            onChange={(e) => set('taxPercent', e.target.value)}
          />
        </div>

        <Select
          id="branch-menu"
          label="Menú de esta sucursal"
          value={form.menuId}
          onChange={(e) => set('menuId', e.target.value)}
          supporting={
            form.menuId ? (
              'Es el menú que verán los meseros y el cliente al escanear el QR de esta sucursal.'
            ) : (
              <span className="text-[var(--md-sys-color-error)]">
                Sin menú, esta sucursal no puede recibir pedidos (ni del mesero ni por QR).
              </span>
            )
          }
        >
          <option value="">— Sin menú asignado —</option>
          {menus.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="branch-active" className="t-body-large cursor-pointer text-[var(--md-sys-color-on-surface)]">
            Sucursal activa
          </label>
          <Switch id="branch-active" checked={form.isActive} onChange={(v) => set('isActive', v)} />
        </div>

        {/* Edit only: new branches are created by provisionBranch and start with photos off. */}
        {branch && (
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="branch-photos" className="cursor-pointer">
              <span className="t-body-large block text-[var(--md-sys-color-on-surface)]">Fotos en la app del mesero</span>
              <span className="t-body-medium block text-[var(--md-sys-color-on-surface-variant)]">
                Muestra la foto de cada producto al tomar el pedido.
              </span>
            </label>
            <Switch
              id="branch-photos"
              checked={form.showProductImagesToWaiters}
              onChange={(v) => set('showProductImagesToWaiters', v)}
            />
          </div>
        )}

        {error && (
          <p className="t-body-medium rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function BranchCard({
  branch,
  menuName,
  onEdit,
  onDelete,
}: {
  branch: Branch;
  menuName: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]">
          <Icon name="storefront" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="t-title-large truncate text-[var(--md-sys-color-on-surface)]">{branch.name}</h3>
          <StatusChip tone={branch.isActive ? 'success' : 'neutral'} className="mt-1">
            {branch.isActive ? 'Activa' : 'Inactiva'}
          </StatusChip>
        </div>
        <span className="-mr-2 -mt-1 flex items-center">
          <IconButton icon="edit" label="Editar" onClick={onEdit} />
          <IconButton icon="delete" label="Eliminar" onClick={onDelete} className="text-[var(--md-sys-color-error)]" />
        </span>
      </div>

      {branch.address && (
        <p className="t-body-medium mt-3 flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)]">
          <Icon name="location_on" size={18} className="shrink-0" /> {branch.address}
        </p>
      )}

      <div className="mt-4 space-y-2 border-t border-[var(--md-sys-color-outline-variant)] pt-3">
        <div className="flex items-center gap-3">
          <Icon name="restaurant_menu" size={20} className="shrink-0 text-[var(--md-sys-color-on-surface-variant)]" />
          {menuName ? (
            <span className="t-body-medium truncate text-[var(--md-sys-color-on-surface)]">{menuName}</span>
          ) : (
            <span className="t-body-medium text-[var(--md-sys-color-error)]">Sin menú asignado</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[var(--md-sys-color-on-surface-variant)]">
          <Icon name="qr_code_2" size={20} className="shrink-0" />
          <span className="t-body-small min-w-0 truncate font-mono">
            {CUSTOMER_APP_URL.replace(/^https?:\/\//, '')}/?branch={branch.id.slice(0, 6)}…
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function BranchesPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { branches, loading, deleteBranch } = useBranchContext();
  const { menus } = useMenus(orgId);
  const [dialog, setDialog] = useState<{ branch: Branch | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Branch | null>(null);

  const menuName = useMemo(() => {
    const map = new Map(menus.map((m) => [m.id, m.name]));
    return (id: string) => map.get(id) ?? null;
  }, [menus]);

  return (
    <div>
      <PageHeader
        subtitle="Tus locales. Cada uno tiene su propio menú y sus QR."
        actions={
          <Button icon="add" onClick={() => setDialog({ branch: null })} className="max-sm:w-full">
            Nueva sucursal
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--md-sys-color-primary)] border-t-transparent" />
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <EmptyState
            icon="storefront"
            title="Aún no tienes sucursales."
            body="Crea la primera: se generan sus estaciones y los accesos del KDS."
            action={
              <Button icon="add" onClick={() => setDialog({ branch: null })}>
                Nueva sucursal
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => (
            <BranchCard
              key={b.id}
              branch={b}
              menuName={menuName(b.menuId)}
              onEdit={() => setDialog({ branch: b })}
              onDelete={() => setConfirmDelete(b)}
            />
          ))}
        </div>
      )}

      {dialog && (
        <BranchDialog
          branch={dialog.branch}
          menus={menus}
          onClose={() => setDialog(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar sucursal"
          message={`¿Eliminar "${confirmDelete.name}"? Se eliminarán también sus estaciones, mesas y los operadores dedicados a esta sucursal. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar sucursal"
          onConfirm={() => deleteBranch(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
