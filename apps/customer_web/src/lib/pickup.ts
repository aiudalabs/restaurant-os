// Human-friendly pickup code. No ambiguous chars (0/O/1/I/L) so it's easy to
// read aloud and type back when recovering an order.
const ALPHABET = 'ACDEFGHJKMNPQRSTUVWXYZ2345679';

export function generatePickupCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `P-${code}`;
}

// Normalizes user-typed input for recovery: uppercase, strip spaces, ensure the
// "P-" prefix so "k7qx", "P-K7QX" and "p k7qx" all resolve to the same code.
export function normalizePickupCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '').replace(/^P-?/, '');
  return cleaned ? `P-${cleaned}` : '';
}
