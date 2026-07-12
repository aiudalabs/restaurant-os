import { useState } from 'react';

export function LoginScreen({
  onLogin,
  error,
}: {
  onLogin: (email: string, password: string) => void;
  error: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex h-full items-center justify-center px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(email.trim(), password);
        }}
        className="w-full max-w-sm rounded-3xl border border-line bg-panel p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl">
            🔥
          </div>
          <h1 className="text-2xl font-extrabold">Cocina · KDS</h1>
          <p className="mt-1 text-sm text-muted">Inicia sesión con tu cuenta de estación</p>
        </div>

        <label className="mb-1 block text-sm font-medium text-muted">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder="cocina@restaurante.com"
          className="mb-4 w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-ink outline-none focus:border-brand"
        />
        <label className="mb-1 block text-sm font-medium text-muted">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          className="mb-5 w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-ink outline-none focus:border-brand"
        />

        {error && (
          <p className="mb-4 rounded-xl bg-red-500/15 px-3 py-2 text-center text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white active:scale-[0.99]"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
