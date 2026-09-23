import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, IconButton } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Card, EmptyState, PageHeader, StatusChip, Switch, type StatusTone } from '@/components/ui/m3';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useUsers } from '@/hooks/use-users';
import { useStations } from '@/hooks/use-stations';
import type { AppUser, UserRole } from '@/types/user';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'operator', label: 'Operador' },
  { value: 'waiter', label: 'Mesero' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

const ROLE_CONFIG: Record<UserRole, { label: string; icon: string; tone: StatusTone }> = {
  admin: { label: 'Admin', icon: 'shield_person', tone: 'info' },
  manager: { label: 'Manager', icon: 'manage_accounts', tone: 'success' },
  operator: { label: 'Operador', icon: 'skillet', tone: 'neutral' },
  waiter: { label: 'Mesero', icon: 'room_service', tone: 'neutral' },
};

function ErrorBanner({ children }: { children: string }) {
  return (
    <p className="t-body-medium rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">
      {children}
    </p>
  );
}

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
      <div className="space-y-6 pt-2">
        <Input
          id="edit-name"
          label="Nombre completo"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Input
          id="edit-email"
          label="Email"
          value={user.email}
          readOnly
          disabled
          supporting="El email no se puede editar."
        />
        <Select id="edit-role" label="Rol" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {role === 'operator' && (
          <Select
            id="edit-station"
            label="Estación"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            supporting="El operador entra al KDS de esta estación."
          >
            <option value="">Sin estación asignada</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
        {error && <ErrorBanner>{error}</ErrorBanner>}
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

  return (
    <Dialog
      title="Nuevo usuario"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <div className="space-y-6 pt-2">
        <Input
          id="displayName"
          label="Nombre completo"
          placeholder="Ej: Juan Perez"
          error={errors.displayName?.message}
          isRequired
          {...register('displayName')}
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="usuario@restaurante.com"
          error={errors.email?.message}
          isRequired
          {...register('email')}
        />
        <Input
          id="password"
          label="Contraseña"
          type="password"
          placeholder="Mínimo 6 caracteres"
          error={errors.password?.message}
          isRequired
          {...register('password')}
        />

        <Select id="role" label="Rol" {...register('role')}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>

        {role === 'operator' && (
          <Select
            id="stationId"
            label="Estación"
            supporting="El operador entra al KDS de esta estación."
            {...register('stationId')}
          >
            <option value="">Sin estación asignada</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}

        {serverError && <ErrorBanner>{serverError}</ErrorBanner>}
      </div>
    </Dialog>
  );
}

// ─── Row ───

function RoleChip({ role }: { role: UserRole }) {
  // Fallback keeps an unknown role from crashing the list.
  const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.operator;
  return (
    <StatusChip tone={roleConfig.tone} icon={roleConfig.icon}>
      {roleConfig.label}
    </StatusChip>
  );
}

function UserRow({
  user,
  stationName,
  canDelete,
  onEdit,
  onToggle,
  onDelete,
}: {
  user: AppUser;
  stationName: string | null;
  canDelete: boolean;
  onEdit: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
}) {
  const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();
  const switchId = `user-active-${user.id}`;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className={cn('flex min-w-0 flex-1 basis-64 items-center gap-4', !user.isActive && 'opacity-60')}>
        <span className="t-title-medium grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="t-title-medium truncate text-[var(--md-sys-color-on-surface)]">{user.displayName}</p>
          <p className="t-body-medium truncate text-[var(--md-sys-color-on-surface-variant)]">{user.email}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 max-md:pl-14">
        <RoleChip role={user.role} />
        {/* Stations are per branch: an operator of another branch shows no station chip. */}
        {user.role === 'operator' && (stationName || !user.stationId) && (
          <StatusChip tone="outline" icon="soup_kitchen">
            {stationName ?? 'Sin estación'}
          </StatusChip>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <label htmlFor={switchId} className="t-label-large mr-2 cursor-pointer text-[var(--md-sys-color-on-surface-variant)]">
          {user.isActive ? 'Activo' : 'Inactivo'}
        </label>
        <Switch id={switchId} checked={user.isActive} onChange={onToggle} />
        <IconButton icon="edit" label="Editar usuario" onClick={onEdit} className="ml-2" />
        {canDelete && (
          <IconButton
            icon="delete"
            label="Eliminar usuario"
            onClick={onDelete}
            className="text-[var(--md-sys-color-error)]"
          />
        )}
      </div>
    </li>
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
  const stationName = (id?: string) => stations.find((s) => s.id === id)?.name ?? null;

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
        subtitle="Quién entra al panel, a la app del mesero y al KDS."
        actions={
          <Button icon="person_add" onClick={() => setShowForm(true)} disabled={!branchId} className="max-sm:w-full">
            Nuevo usuario
          </Button>
        }
      />

      {users.length === 0 ? (
        <Card>
          <EmptyState
            icon="group"
            title="No hay usuarios registrados."
            action={
              <Button variant="tonal" icon="person_add" onClick={() => setShowForm(true)} disabled={!branchId}>
                Crear el primero
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--md-sys-color-outline-variant)]">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                stationName={stationName(user.stationId)}
                canDelete={user.id !== appUser?.id}
                onEdit={() => setEditUser(user)}
                onToggle={(isActive) => toggleUser(user.id, isActive)}
                onDelete={() => setConfirmUser(user)}
              />
            ))}
          </ul>
        </Card>
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
