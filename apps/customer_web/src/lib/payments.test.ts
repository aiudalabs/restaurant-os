import { afterEach, describe, expect, it, vi } from 'vitest';

// config.ts reads import.meta.env at module load, so each case re-imports it.
async function loadConfig(env: Record<string, string>) {
  vi.resetModules();
  vi.stubEnv('VITE_PAYMENTS_ENABLED', '');
  vi.stubEnv('VITE_BFF_URL', '');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('./config');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('payments gating (config)', () => {
  it('is off by default', async () => {
    expect((await loadConfig({})).paymentsEnabled).toBe(false);
  });
  it('is on only with the flag AND a BFF url', async () => {
    expect((await loadConfig({ VITE_PAYMENTS_ENABLED: 'true', VITE_BFF_URL: 'https://bff.example.com' })).paymentsEnabled).toBe(true);
    expect((await loadConfig({ VITE_PAYMENTS_ENABLED: 'true' })).paymentsEnabled).toBe(false);
    expect((await loadConfig({ VITE_BFF_URL: 'https://bff.example.com' })).paymentsEnabled).toBe(false);
  });
  it('only the exact string "true" enables it', async () => {
    expect((await loadConfig({ VITE_PAYMENTS_ENABLED: '1', VITE_BFF_URL: 'https://bff.example.com' })).paymentsEnabled).toBe(false);
  });
  it('strips one trailing slash from the BFF url', async () => {
    expect((await loadConfig({ VITE_BFF_URL: 'https://bff.example.com/' })).bffUrl).toBe('https://bff.example.com');
  });
});

describe('initPayment', () => {
  async function setup(response: Partial<Response> & { json?: () => Promise<unknown> }) {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    const cfg = await loadConfig({ VITE_BFF_URL: 'https://bff.example.com/' });
    expect(cfg.bffUrl).toBe('https://bff.example.com');
    const { initPayment } = await import('./payments');
    return { fetchMock, initPayment };
  }

  it('posts the order to /payments/init and returns the hosted link', async () => {
    const { fetchMock, initPayment } = await setup({ ok: true, json: async () => ({ payment_url: 'https://pay/x' }) });
    await expect(initPayment('o1', 10.69, 'Pedido P-ABCD')).resolves.toBe('https://pay/x');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://bff.example.com/payments/init');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ order_id: 'o1', amount: 10.69, description: 'Pedido P-ABCD' });
  });

  it('throws with the status when the BFF fails', async () => {
    const { initPayment } = await setup({ ok: false, status: 502 });
    await expect(initPayment('o1', 1, 'd')).rejects.toThrow('(502)');
  });

  it('throws when the provider returns no link', async () => {
    const { initPayment } = await setup({ ok: true, json: async () => ({}) });
    await expect(initPayment('o1', 1, 'd')).rejects.toThrow(/enlace/);
  });
});
