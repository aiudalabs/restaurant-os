import { useState } from 'react';
import { Plus, Power, X, Shield, User, Wrench } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useUsers } from '@/hooks/use-users';
import type { AppUser, UserRole } from '@/types/user';

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

function UserFormDialog({ orgId, branchIds, onSave, onClose }: UserFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo usuario</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
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

          <div className="space-y-1">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Rol
            </label>
            <select
              id="role"
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              {...register('role')}
            >
              <option value="operator">Operador</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <Input
            id="stationId"
            label="ID de estacion (solo operadores)"
            placeholder="Opcional"
            {...register('stationId')}
          />

          {serverError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" type="button" onClick={onClose}>
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

  const { users, loading, toggleUser, createOperatorUser } = useUsers(orgId);
  const [showForm, setShowForm] = useState(false);

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
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-500">No hay usuarios registrados.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
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
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
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
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          user.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
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
          onSave={createOperatorUser}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
