import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/layouts/auth-layout';

const loginSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type LoginForm = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  orgName: z.string().min(2, 'Nombre del negocio requerido'),
  ownerName: z.string().min(2, 'Tu nombre requerido'),
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const { login, register: registerOrg, loading, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const regForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  return (
    <AuthLayout>
      {mode === 'login' ? (
        <form onSubmit={loginForm.handleSubmit((d) => login(d.email, d.password))} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="dueño@restaurante.com"
            autoComplete="email"
            error={loginForm.formState.errors.email?.message}
            {...loginForm.register('email')}
          />
          <Input
            id="password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={loginForm.formState.errors.password?.message}
            {...loginForm.register('password')}
          />
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
          <p className="text-center text-sm text-gray-500">
            ¿Primera vez?{' '}
            <button type="button" onClick={() => setMode('register')} className="font-semibold text-orange-600">
              Crea tu restaurante
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={regForm.handleSubmit((d) => registerOrg(d))} className="space-y-4">
          <Input
            id="orgName"
            label="Nombre del negocio"
            placeholder="Cadena El Fogón"
            error={regForm.formState.errors.orgName?.message}
            {...regForm.register('orgName')}
          />
          <Input
            id="ownerName"
            label="Tu nombre"
            placeholder="Ana Pérez"
            error={regForm.formState.errors.ownerName?.message}
            {...regForm.register('ownerName')}
          />
          <Input
            id="reg-email"
            label="Email"
            type="email"
            autoComplete="email"
            error={regForm.formState.errors.email?.message}
            {...regForm.register('email')}
          />
          <Input
            id="reg-password"
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            error={regForm.formState.errors.password?.message}
            {...regForm.register('password')}
          />
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando tu restaurante…' : 'Crear mi restaurante'}
          </Button>
          <p className="text-center text-xs text-gray-500">
            Creamos tu organización, tu primera sucursal y un menú vacío listos para editar.
          </p>
          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <button type="button" onClick={() => setMode('login')} className="font-semibold text-orange-600">
              Inicia sesión
            </button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
