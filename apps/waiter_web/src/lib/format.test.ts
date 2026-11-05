import { describe, expect, it } from 'vitest';
import { money } from './format';

describe('money', () => {
  it('always shows two decimals with a $ prefix', () => {
    expect(money(0)).toBe('$0.00');
    expect(money(5)).toBe('$5.00');
    expect(money(10.7)).toBe('$10.70');
  });
  it('rounds to cents and hides float noise', () => {
    expect(money(1.239)).toBe('$1.24');
    expect(money(0.3000000000000004)).toBe('$0.30');
  });
  it('formats large amounts without grouping', () => {
    expect(money(1234.5)).toBe('$1234.50');
  });
});
