import { useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Plus, Pencil, Store, X, UtensilsCrossed, MapPin, QrCode, KeyRound, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
}

const EMPTY: BranchFormState = {
  name: '',
  address: '',
  phone: '',
  menuId: '',
  taxPercent: '7',
  isActive: true,
};

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="flex items-center gap-2">
        <code className="font-mono text-sm text-gray-900">{value}</code>
        <button
          onClick={() => navigator.clipboard?.writeText(value)}
          className="m3-state rounded-full p-1.5 text-gray-500"
          title="Copiar"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </span>
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
        }
      : EMPTY,
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
        await updateBranch(branch.id, payload);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="m3-card w-full max-w-lg rounded-[1.75rem] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">¡Sucursal lista! 🎉</h2>
            <button onClick={onClose} className="m3-state rounded-full p-2 text-gray-500" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Se crearon sus <b>estaciones</b> (Cocina y Bar) y un <b>operador por estación</b> para
            el KDS. Guarda estas credenciales:
          </p>
          <div className="space-y-3">
            {created.length === 0 && (
              <p className="text-sm text-gray-500">
                Las estaciones se crearon; crea los operadores desde «Usuarios».
              </p>
            )}
            {created.map((op) => (
              <div key={op.email} className="rounded-2xl bg-[var(--color-surface-container-high)] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <KeyRound className="h-4 w-4 text-orange-600" /> {op.station}
                </div>
                <CredRow label="Email" value={op.email} />
                <CredRow label="Contraseña" value={op.password} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Guárdalas ahora — la contraseña no se vuelve a mostrar. Puedes cambiarlas en «Usuarios».
          </p>
          <div className="mt-5 flex justify-end">
            <Button onClick={onClose}>Listo</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="m3-card w-full max-w-lg rounded-[1.75rem] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {branch ? 'Editar sucursal' : 'Nueva sucursal'}
          </h2>
          <button onClick={onClose} className="m3-state rounded-full p-2 text-gray-500" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
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

          <div className="space-y-1.5">
            <label htmlFor="branch-menu" className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
              Menú de esta sucursal
            </label>
            <select
              id="branch-menu"
              value={form.menuId}
              onChange={(e) => set('menuId', e.target.value)}
              className="h-12 w-full rounded-xl bg-[var(--color-surface-container-high)] px-4 text-[15px] text-gray-900"
            >
              <option value="">— Sin menú asignado —</option>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Es el menú que verá el cliente al escanear el QR de esta sucursal.
            </p>
          </div>

          <label className="flex items-center gap-3 pt-1 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-5 w-5 accent-orange-600"
            />
            Sucursal activa
          </label>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : branch ? 'Guardar' : 'Crear sucursal'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { branches, loading } = useBranchContext();
  const { menus } = useMenus(orgId);
  const [dialog, setDialog] = useState<{ branch: Branch | null } | null>(null);

  const menuName = useMemo(() => {
    const map = new Map(menus.map((m) => [m.id, m.name]));
    return (id: string) => map.get(id) ?? null;
  }, [menus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[15px] text-gray-500">
          Tus locales. Cada uno tiene su propio menú y sus QR.
        </p>
        <Button onClick={() => setDialog({ branch: null })}>
          <Plus className="h-5 w-5" /> Nueva sucursal
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-orange-600 border-t-transparent" />
        </div>
      ) : branches.length === 0 ? (
        <div className="m3-card flex flex-col items-center gap-3 p-12 text-center">
          <Store className="h-10 w-10 text-gray-400" />
          <p className="text-sm text-gray-500">Aún no tienes sucursales. Crea la primera.</p>
          <Button onClick={() => setDialog({ branch: null })}>
            <Plus className="h-5 w-5" /> Nueva sucursal
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => {
            const assigned = menuName(b.menuId);
            return (
              <div key={b.id} className="m3-card flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
                    <Store className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {b.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                    <button
                      onClick={() => setDialog({ branch: b })}
                      className="m3-state rounded-full p-2 text-gray-500"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-lg font-bold text-gray-900">{b.name}</h3>
                {b.address && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="h-3.5 w-3.5" /> {b.address}
                  </p>
                )}

                <div className="mt-4 space-y-2 border-t border-[var(--color-outline-variant)] pt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-orange-600" />
                    {assigned ? (
                      <span className="font-medium text-gray-900">{assigned}</span>
                    ) : (
                      <span className="text-red-600">Sin menú asignado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <QrCode className="h-4 w-4" />
                    <span className="truncate font-mono text-xs">
                      {CUSTOMER_APP_URL.replace(/^https?:\/\//, '')}/?branch={b.id.slice(0, 6)}…
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialog && (
        <BranchDialog
          branch={dialog.branch}
          menus={menus}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
