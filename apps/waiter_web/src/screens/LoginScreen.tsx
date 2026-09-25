import { useState, type FormEvent, type ReactNode } from 'react';
import type { Roster } from '../lib/auth';
import type { RosterWaiter } from '../types';

interface Props {
  error: string;
  deviceBranch: string;
  roster: Roster | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onPin: (userId: string, pin: string) => Promise<void>;
  onResetDevice: () => void;
}

const PIN_LENGTH = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function LoginScreen({ error, deviceBranch, roster, onLogin, onPin, onResetDevice }: Props) {
  const [useEmail, setUseEmail] = useState(!deviceBranch);
  const [waiter, setWaiter] = useState<RosterWaiter | null>(null);

  if (useEmail) {
    return <EmailLogin error={error} onLogin={onLogin} onBack={deviceBranch ? () => setUseEmail(false) : undefined} />;
  }
  if (waiter) {
    return <PinPad waiter={waiter} error={error} onPin={onPin} onBack={() => setWaiter(null)} />;
  }

  return (
    <Shell>
      {!roster && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-sm text-muted">Cargando meseros…</p>
        </div>
      )}

      {roster?.missing && (
        <Notice>
          Este dispositivo estaba configurado para una sucursal que ya no existe. Pide al administrador el link de la
          app del mesero de tu sucursal.
        </Notice>
      )}

      {roster && !roster.missing && (
        <>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold">¿Quién eres?</h1>
            <p className="text-sm text-muted">{roster.branchName}</p>
          </div>
          {roster.waiters.length === 0 ? (
            <Notice>
              Todavía no hay meseros con PIN en {roster.branchName}. El administrador lo pone en «Usuarios», en la fila
              de cada mesero.
            </Notice>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {roster.waiters.map((w) => (
                <li key={w.uid}>
                  <button
                    onClick={() => setWaiter(w)}
                    className="card flex w-full flex-col items-center gap-2 active:bg-bg"
                  >
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-2xl font-extrabold text-white">
                      {w.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="w-full truncate text-center font-bold">{w.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="mt-8 flex flex-col items-center gap-2 text-sm">
        <button onClick={() => setUseEmail(true)} className="btn btn-text">
          Entrar con email
        </button>
        {roster?.missing && (
          <button onClick={onResetDevice} className="btn btn-text">
            Olvidar esta sucursal
          </button>
        )}
      </div>
    </Shell>
  );
}

function PinPad({
  waiter,
  error,
  onPin,
  onBack,
}: {
  waiter: RosterWaiter;
  error: string;
  onPin: (userId: string, pin: string) => Promise<void>;
  onBack: () => void;
}) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    setBusy(true);
    await onPin(waiter.uid, value);
    setBusy(false);
    setPin(''); // on success this screen unmounts; on error, start over
  };

  const press = (d: string) => {
    if (busy || pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  return (
    <Shell>
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-brand text-3xl font-extrabold text-white">
          {waiter.displayName.charAt(0).toUpperCase()}
        </span>
        <h1 className="text-2xl font-extrabold">Hola, {waiter.displayName}</h1>
        <p className="text-sm text-muted">Escribe tu PIN de {PIN_LENGTH} dígitos</p>
      </div>

      <div className="mb-4 flex justify-center gap-3" aria-label={`${pin.length} de ${PIN_LENGTH} dígitos`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full ${i < pin.length ? 'bg-brand' : 'bg-line'}`} />
        ))}
      </div>
      <p role="alert" className="mb-4 min-h-5 text-center text-sm font-semibold text-brand">
        {busy ? 'Entrando…' : error}
      </p>

      <div className="mx-auto grid w-fit grid-cols-3 gap-3">
        {KEYS.map((d) => (
          <Key key={d} onClick={() => press(d)} disabled={busy}>
            {d}
          </Key>
        ))}
        <Key onClick={() => setPin((p) => p.slice(0, -1))} disabled={busy} label="Borrar" muted>
          ⌫
        </Key>
        <Key onClick={() => press('0')} disabled={busy}>
          0
        </Key>
        <span />
      </div>

      <button onClick={onBack} className="btn btn-text mx-auto mt-8 flex">
        No soy {waiter.displayName}
      </button>
    </Shell>
  );
}

function Key({
  children,
  onClick,
  disabled,
  label,
  muted,
}: {
  children: string;
  onClick: () => void;
  disabled: boolean;
  label?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`h-16 w-16 rounded-2xl text-2xl font-bold active:scale-95 disabled:opacity-40 ${
        muted ? 'text-muted' : 'border border-line bg-panel'
      }`}
    >
      {children}
    </button>
  );
}

function EmailLogin({
  error,
  onLogin,
  onBack,
}: {
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onBack?: () => void;
}) {
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
    <Shell>
      <form onSubmit={submit} className="space-y-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold">Mesero</h1>
          <p className="text-sm text-muted">Entra con la cuenta que te dio el administrador</p>
        </div>
        <input
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          aria-label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
        />
        {error && <p className="text-center text-sm font-medium text-brand">{error}</p>}
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="btn btn-lg btn-filled w-full"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        {onBack ? (
          <button type="button" onClick={onBack} className="btn btn-text w-full">
            Volver a entrar con PIN
          </button>
        ) : (
          <p className="pt-2 text-center text-xs text-muted">
            ¿Eres mesero? Abre el link de tu sucursal que te dio el administrador y entra con tu PIN.
          </p>
        )}
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl text-white" aria-hidden="true">
          🧾
        </div>
        {children}
      </div>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="card text-center text-sm text-muted">{children}</p>;
}
