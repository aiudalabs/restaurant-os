import { useState } from 'react';

export function LoginScreen({
  stationId,
  error,
  onPin,
  onEmail,
}: {
  stationId: string;
  error: string;
  onPin: (pin: string) => void;
  onEmail: (email: string, password: string) => void;
}) {
  // If this device is set up for a station, show a PIN pad; otherwise email setup.
  const [mode, setMode] = useState<'pin' | 'email'>(stationId ? 'pin' : 'email');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const press = (d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    if (next.length >= 4) {
      // Auto-submit at 4; if the PIN is longer the user can keep the pad open —
      // but most PINs are 4, so submit and let the server validate.
    }
  };

  const submitPin = () => {
    if (pin.length >= 4) onPin(pin);
    setPin('');
  };

  if (mode === 'pin' && stationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl">🔥</div>
        <h1 className="text-2xl font-extrabold">Ingresa tu PIN</h1>
        <p className="mt-1 text-sm text-muted">Estación de este dispositivo</p>

        <div className="my-6 flex gap-3">
          {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pin.length)).map((i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full ${i < pin.length ? 'bg-brand' : 'bg-line'}`}
            />
          ))}
        </div>

        {error && <p className="mb-3 text-sm font-semibold text-red-400">{error}</p>}

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="h-16 w-16 rounded-2xl bg-panel2 text-2xl font-bold active:bg-line"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="h-16 w-16 rounded-2xl bg-panel text-xl text-muted active:bg-line"
          >
            ⌫
          </button>
          <button onClick={() => press('0')} className="h-16 w-16 rounded-2xl bg-panel2 text-2xl font-bold active:bg-line">
            0
          </button>
          <button
            onClick={submitPin}
            className="h-16 w-16 rounded-2xl bg-brand text-2xl font-bold text-white active:scale-95"
          >
            ✓
          </button>
        </div>

        <button onClick={() => setMode('email')} className="mt-8 text-sm text-muted underline">
          Configurar con email
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEmail(email.trim(), password);
        }}
        className="w-full max-w-sm rounded-3xl border border-line bg-panel p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl">🔥</div>
          <h1 className="text-2xl font-extrabold">Cocina · KDS</h1>
          <p className="mt-1 text-sm text-muted">Configura este dispositivo con tu cuenta</p>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder="Email de estación"
          className="mb-4 w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-ink outline-none focus:border-brand"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Contraseña"
          className="mb-5 w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-ink outline-none focus:border-brand"
        />
        {error && <p className="mb-4 text-center text-sm text-red-400">{error}</p>}
        <button type="submit" className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white active:scale-[0.99]">
          Entrar
        </button>
        {stationId && (
          <button
            type="button"
            onClick={() => setMode('pin')}
            className="mt-4 block w-full text-center text-sm text-muted underline"
          >
            Volver al PIN
          </button>
        )}
      </form>
    </div>
  );
}
