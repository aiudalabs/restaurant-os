import { useState } from 'react';
import { Plus, Power, Shield, User, Wrench, ConciergeBell, Pencil, Trash2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useUsers } from '@/hooks/use-users';
import { useStations } from '@/hooks/use-stations';
import type { AppUser, UserRole } from '@/types/user';

// ─── Edit User Dialog (doc fields only: name / role / station) ───

function EditUserDialog({
  user,
  stations,
  onSave,
  onClose,
}: {
  user: AppUser;
  stations: { id: string; name: string }[];
  onSave: (id: string, data: Partial<AppUser>) => Promise<void>;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [role, setRole] = useState<UserRole>(user.role);
  const [stationId, setStationId] = useState(user.stationId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      // Only operators are bound to a KDS station; waiters/managers/admins never are.
      await onSave(user.id, {
        displayName: displayName.trim(),
        role,
        stationId: role === 'operator' ? stationId : '',
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
      setBusy(false);
    }
  };

  const selectCls =
    'flex h-12 w-full rounded-xl border border-transparent bg-[var(--color-surface-container-high)] px-4 text-[15px] text-[var(--color-on-surface)] focus:outline-none focus:border-orange-600';

  return (
    <Dialog
      title="Editar usuario"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          id="edit-name"
          label="Nombre completo"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p className="break-all text-xs text-gray-500">
          Email: <span className="font-mono">{user.email}</span> (no editable)
        </p>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--color-on-surface-variant)]">Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={selectCls}>
            <option value="operator">Operador</option>
            <option value="waiter">Mesero</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {role === 'operator' && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
              Estación
            </label>
            <select value={stationId} onChange={(e) => setStationId(e.target.value)} className={selectCls}>
              <option value="">Sin estación asignada</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Dialog>
  );
}

const USER_FORM_SCHEMA = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
  displayName: z.string().min(1, 'Nombre requerido'),
  role: z.enum(['admin', 'manager', 'operator', 'waiter']),
  stationId: z.string().optional(),
});

type UserFormValues = z.infer<typeof USER_FORM_SCHEMA>;

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'text-red-600 bg-red-50' },
  manager: { label: 'Manager', icon: User, color: 'text-blue-600 bg-blue-50' },
  operator: { label: 'Operador', icon: Wrench, color: 'text-green-600 bg-green-50' },
  waiter: { label: 'Mesero', icon: ConciergeBell, color: 'text-purple-600 bg-purple-50' },
};

// ─── User Form Dialog ───

interface UserFormDialogProps {
  orgId: string;
  branchIds: string[];
  stations: { id: string; name: string }[];
  onSave: (payload: {
    email: string;
    password: string;
    displayName: string;
    orgId: string;
    branchIds: string[];
    role: UserRole;
    stationId?: string;
  }) => Promise<string>;
  onClose: () => void;
}

function UserFormDialog({ orgId, branchIds, stations, onSave, onClose }: UserFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(USER_FORM_SCHEMA),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      role: 'operator',
      stationId: '',
    },
  });

  const role = useWatch({ control, name: 'role' });

  const onSubmit = async (values: UserFormValues) => {
    setServerError(null);
    try {
      await onSave({
        email: values.email,
        password: values.password,
        displayName: values.displayName,
        orgId,
        branchIds,
        role: values.role,
        stationId: values.role === 'operator' ? values.stationId || undefined : undefined,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario';
      setServerError(message);
    }
  };

  const selectCls =
    'flex h-12 w-full rounded-xl border border-transparent bg-[var(--color-surface-container-high)] px-4 text-[15px] text-[var(--color-on-surface)] focus:outline-none focus:border-orange-600 focus:bg-[var(--color-surface-container)]';

  return (
    <Dialog
      title="Nuevo usuario"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <>
          <Button variant="tonal" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          id="displayName"
          label="Nombre completo"
          placeholder="Ej: Juan Perez"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="usuario@restaurante.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          id="password"
          label="Contrasena"
          type="password"
          placeholder="Minimo 6 caracteres"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="space-y-1.5">
          <label htmlFor="role" className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
            Rol
          </label>
          <select id="role" className={selectCls} {...register('role')}>
            <option value="operator">Operador</option>
            <option value="waiter">Mesero</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {role === 'operator' && (
          <div className="space-y-1.5">
            <label htmlFor="stationId" className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
              Estacion
            </label>
            <select id="stationId" className={selectCls} {...register('stationId')}>
              <option value="">Sin estacion asignada</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {serverError && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ─── Row pieces (shared by the phone cards and the desktop table) ───

function RoleBadge({ role }: { role: UserRole }) {
  // Fallback keeps an unknown role from crashing the list.
  const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.operator;
  const RoleIcon = roleConfig.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        roleConfig.color,
      )}
    >
      <RoleIcon className="h-3 w-3" />
      {roleConfig.label}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
      )}
    >
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function UserActions({
  user,
  canDelete,
  onEdit,
  onToggle,
  onDelete,
}: {
  user: AppUser;
  canDelete: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 md:justify-end">
      <Button variant="ghost" size="sm" className="h-10 text-xs md:h-7" onClick={onEdit}>
        <Pencil className="mr-1 h-3.5 w-3.5" />
        Editar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-10 text-xs md:h-7', user.isActive ? 'text-gray-500' : 'text-green-600')}
        onClick={onToggle}
      >
        <Power className="mr-1 h-3.5 w-3.5" />
        {user.isActive ? 'Desactivar' : 'Activar'}
      </Button>
      {canDelete && (
        <Button variant="ghost" size="sm" className="h-10 text-xs text-red-600 md:h-7" onClick={onDelete}>
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Eliminar
        </Button>
      )}
    </div>
  );
}

// ─── Users Page ───

export default function UsersPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  // Use the branch selected in the panel, not appUser.branchIds: appUser is read once
  // at login and goes stale when branches are created/deleted mid-session, which
  // assigned new staff to a deleted branch.
  const { selectedBranchId: branchId } = useBranchContext();
  const branchIds = branchId ? [branchId] : [];

  const { users, loading, toggleUser, createOperatorUser, updateUser, deleteUser } = useUsers(orgId);
  const { stations } = useStations(orgId, branchId);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [confirmUser, setConfirmUser] = useState<AppUser | null>(null);
  const stationOptions = stations.map((s) => ({ id: s.id, name: s.name }));

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
        <Button onClick={() => setShowForm(true)} disabled={!branchId} className="max-sm:w-full">
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="m3-card p-5 py-12 text-center">
          <p className="text-sm text-gray-500">No hay usuarios registrados.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <>
          {/* Phones: stacked cards */}
          <ul className="space-y-3 md:hidden">
            {users.map((user) => (
              <li key={user.id} className={cn('m3-card p-4', !user.isActive && 'opacity-50')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{user.displayName}</p>
                    <p className="truncate text-sm text-gray-500">{user.email}</p>
                  </div>
                  <StatusBadge isActive={user.isActive} />
                </div>
                <div className="mt-2">
                  <RoleBadge role={user.role} />
                </div>
                <div className="mt-3 border-t border-[var(--color-outline-variant)] pt-2">
                  <UserActions
                    user={user}
                    canDelete={user.id !== appUser?.id}
                    onEdit={() => setEditUser(user)}
                    onToggle={() => toggleUser(user.id, !user.isActive)}
                    onDelete={() => setConfirmUser(user)}
                  />
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet/desktop: table */}
          <div className="m3-card hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-[var(--color-outline-variant)]">
              <thead className="bg-[var(--color-surface-container-high)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-outline-variant)]">
                {users.map((user) => (
                  <tr key={user.id} className={cn(!user.isActive && 'opacity-50')}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {user.displayName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={user.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <UserActions
                        user={user}
                        canDelete={user.id !== appUser?.id}
                        onEdit={() => setEditUser(user)}
                        onToggle={() => toggleUser(user.id, !user.isActive)}
                        onDelete={() => setConfirmUser(user)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <UserFormDialog
          orgId={orgId}
          branchIds={branchIds}
          stations={stationOptions}
          onSave={createOperatorUser}
          onClose={() => setShowForm(false)}
        />
      )}

      {editUser && (
        <EditUserDialog
          user={editUser}
          stations={stationOptions}
          onSave={updateUser}
          onClose={() => setEditUser(null)}
        />
      )}

      {confirmUser && (
        <ConfirmDialog
          title="Eliminar usuario"
          message={`¿Eliminar a "${confirmUser.displayName}" (${confirmUser.email})? Se borrará su acceso. Esta acción no se puede deshacer.`}
          onConfirm={() => deleteUser(confirmUser.id)}
          onClose={() => setConfirmUser(null)}
        />
      )}
    </div>
  );
}
