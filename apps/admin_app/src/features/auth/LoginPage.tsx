import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { StatusChip } from '@/components/ui/m3';
import AuthLayout from '@/layouts/auth-layout';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  chain: 'Chain',
};

// The landing checkout hands off here with ?register=1&plan=growth&email=…
function readSignupParams() {
  const p = new URLSearchParams(window.location.search);
  const plan = p.get('plan') ?? '';
  return {
    register: p.get('register') === '1',
    plan: PLAN_LABELS[plan] ? plan : '',
    email: p.get('email') ?? '',
  };
}

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

function ErrorBlock({ message }: { message: string }) {
  return (
    <div role="alert" className="t-body-medium flex items-start gap-2 rounded-xl bg-[var(--md-sys-color-error-container)] p-3 text-[var(--md-sys-color-on-error-container)]">
      <Icon name="error" size={20} className="shrink-0" />
      <span className="min-w-0 break-words">{message}</span>
    </div>
  );
}

function ModeSwitch({ prompt, action, onClick }: { prompt: string; action: string; onClick: () => void }) {
  return (
    <p className="t-body-medium flex flex-wrap items-center justify-center gap-x-1 text-[var(--md-sys-color-on-surface-variant)]">
      {prompt}
      <Button type="button" variant="ghost" onClick={onClick}>{action}</Button>
    </p>
  );
}

export default function LoginPage() {
  const { login, register: registerOrg, loading, error } = useAuth();
  const [signup] = useState(readSignupParams);
  const [mode, setMode] = useState<'login' | 'register'>(signup.register ? 'register' : 'login');

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const regForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: signup.email },
  });

  return (
    <AuthLayout>
      {mode === 'login' ? (
        <form onSubmit={loginForm.handleSubmit((d) => login(d.email, d.password))} className="space-y-5">
          <h2 className="t-title-large text-[var(--md-sys-color-on-surface)]">Inicia sesión</h2>
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
          {error && <ErrorBlock message={error} />}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
          <ModeSwitch prompt="¿Primera vez?" action="Crea tu restaurante" onClick={() => setMode('register')} />
        </form>
      ) : (
        <form onSubmit={regForm.handleSubmit((d) => registerOrg({ ...d, plan: signup.plan }))} className="space-y-5">
          <h2 className="t-title-large text-[var(--md-sys-color-on-surface)]">Crea tu restaurante</h2>
          {signup.plan && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--md-sys-color-outline-variant)] px-4 py-3">
              <span className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">Plan seleccionado</span>
              <StatusChip tone="success" icon="workspace_premium">{PLAN_LABELS[signup.plan]}</StatusChip>
            </div>
          )}
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
          {error && <ErrorBlock message={error} />}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Creando tu restaurante…' : 'Crear mi restaurante'}
          </Button>
          <p className="t-body-small text-center text-[var(--md-sys-color-on-surface-variant)]">
            Creamos tu organización, tu primera sucursal y un menú vacío listos para editar.
          </p>
          <ModeSwitch prompt="¿Ya tienes cuenta?" action="Inicia sesión" onClick={() => setMode('login')} />
        </form>
      )}
    </AuthLayout>
  );
}
