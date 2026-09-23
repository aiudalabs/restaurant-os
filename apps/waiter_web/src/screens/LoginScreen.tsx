import { useState, type FormEvent } from 'react';

interface Props {
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ error, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    await onLogin(email, password);
    setBusy(false);
  };

  return (
    <div className="flex min-h-full items-center justify-center px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl">🧾</div>
          <h1 className="text-2xl font-extrabold">Mesero</h1>
          <p className="text-sm text-muted">Entra con la cuenta que te dio el administrador</p>
        </div>
        <input
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-line bg-panel px-4 py-3.5 text-base outline-none focus:border-brand"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-line bg-panel px-4 py-3.5 text-base outline-none focus:border-brand"
        />
        {error && <p className="text-center text-sm font-medium text-brand">{error}</p>}
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white active:bg-brandDark disabled:opacity-50"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
