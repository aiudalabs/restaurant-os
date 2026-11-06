import { describe, expect, it } from 'vitest';
import { generatePickupCode, normalizePickupCode } from './pickup';

describe('generatePickupCode', () => {
  it('has the shape P-XXXX and never uses ambiguous characters', () => {
    for (let i = 0; i < 500; i++) {
      const code = generatePickupCode();
      expect(code).toMatch(/^P-[ACDEFGHJKMNPQRSTUVWXYZ2345679]{4}$/);
    }
  });
});

describe('normalizePickupCode', () => {
  it.each(['k7qx', 'K7QX', 'P-K7QX', 'p-k7qx', 'p k7qx', '  pk7qx  ', 'P K 7 Q X'])('resolves %j to P-K7QX', (raw) => {
    expect(normalizePickupCode(raw)).toBe('P-K7QX');
  });

  it('returns empty for blank or prefix-only input', () => {
    expect(normalizePickupCode('')).toBe('');
    expect(normalizePickupCode('   ')).toBe('');
    expect(normalizePickupCode('P-')).toBe('');
  });

  it('is idempotent on generated codes', () => {
    const code = generatePickupCode();
    expect(normalizePickupCode(code)).toBe(code);
  });
});
