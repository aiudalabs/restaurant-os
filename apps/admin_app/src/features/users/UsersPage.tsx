import { useState } from 'react';
import { Plus, Power, X, Shield, User, Wrench, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
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
      await onSave(user.id, { displayName: displayName.trim(), role, stationId });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
      setBusy(false);
    }
  };

  const selectCls =
    'flex h-12 w-full rounded-xl border border-transparent bg-[var(--color-surface-container-high)] px-4 text-[15px] text-[var(--color-on-surface)] focus:outline-none focus:border-orange-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="m3-card w-full max-w-md rounded-[1.75rem] p-6">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-lg font-bold text-gray-900">Editar usuario</h2>
          <button onClick={onClose} className="m3-state rounded-full p-2 text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <Input
            id="edit-name"
            label="Nombre completo"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Email: <span className="font-mono">{user.email}</span> (no editable)
          </p>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-on-surface-variant)]">Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={selectCls}>
              <option value="operator">Operador</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
              Estación (solo operadores)
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
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

const USER_FORM_SCHEMA = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
  displayName: z.string().min(1, 'Nombre requerido'),
  role: z.enum(['admin', 'manager', 'operator']),
  stationId: z.string().optional(),
});

type UserFormValues = z.infer<typeof USER_FORM_SCHEMA>;

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'text-red-600 bg-red-50' },
  manager: { label: 'Manager', icon: User, color: 'text-blue-600 bg-blue-50' },
  operator: { label: 'Operador', icon: Wrench, color: 'text-green-600 bg-green-50' },
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
        stationId: values.stationId || undefined,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario';
      setServerError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="m3-card p-6 rounded-[1.75rem] w-full max-w-md">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-lg font-bold text-gray-900">Nuevo usuario</h2>
          <button onClick={onClose} className="m3-state rounded-full p-2 text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <select
              id="role"
              className="flex h-12 w-full rounded-xl border border-transparent bg-[var(--color-surface-container-high)] px-4 text-[15px] text-[var(--color-on-surface)] focus:outline-none focus:border-orange-600 focus:bg-[var(--color-surface-container)]"
              {...register('role')}
            >
              <option value="operator">Operador</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="stationId" className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
              Estacion (solo operadores)
            </label>
            <select
              id="stationId"
              className="flex h-12 w-full rounded-xl border border-transparent bg-[var(--color-surface-container-high)] px-4 text-[15px] text-[var(--color-on-surface)] focus:outline-none focus:border-orange-600 focus:bg-[var(--color-surface-container)]"
              {...register('stationId')}
            >
              <option value="">Sin estacion asignada</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="tonal" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Users Page ───

export default function UsersPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const branchIds = appUser?.branchIds ?? [];
  const branchId = branchIds[0] ?? '';

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
        <Button onClick={() => setShowForm(true)}>
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
        <div className="m3-card overflow-hidden">
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
              {users.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role];
                const RoleIcon = roleConfig.icon;
                return (
                  <tr key={user.id} className={cn(!user.isActive && 'opacity-50')}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {user.displayName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          roleConfig.color,
                        )}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {roleConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          user.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setEditUser(user)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'h-7 text-xs',
                            user.isActive ? 'text-gray-500' : 'text-green-600',
                          )}
                          onClick={() => toggleUser(user.id, !user.isActive)}
                        >
                          <Power className="mr-1 h-3.5 w-3.5" />
                          {user.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                        {user.id !== appUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600"
                            onClick={() => setConfirmUser(user)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
