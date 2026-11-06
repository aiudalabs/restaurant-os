import { describe, expect, it } from 'vitest';
import {
  AA_TEXT,
  FONT_PRESETS,
  LIMITS,
  NEUTRAL,
  PLATFORM_BRANDING,
  buildTheme,
  cacheKey,
  contrast,
  derivePalette,
  parseBranding,
  readThemeCache,
  resolveBranding,
  safeLocalStorage,
  writeThemeCache,
  type Branding,
  type FontPreset,
} from './theme';
import { applyThemeToDocument } from './branding';
import { readFileSync } from 'node:fs';

const valid: Branding = {
  displayName: 'Casa Roja',
  primary: '#B3261E',
  accent: '#E0A458',
  fontPreset: 'rounded',
  logoUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/logo.png',
  iconUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/icon.png',
  tagline: 'Comida de casa',
};

const INPUTS: Array<[string, string]> = [
  ['#3F6B2A', '#C9A24A'], // Pick & Eat
  ['#B3261E', '#E0A458'],
  ['#12355B', '#F2A541'],
  ['#3B5BDB', '#FFB000'], // platform
  ['#FFFF99', '#FFFFCC'], // too-light primary and accent
  ['#FFFFFF', '#FFFFFF'],
  ['#050505', '#000000'], // too-dark both
  ['#000000', '#101010'],
  ['#00FFFF', '#FF00FF'], // saturated, out of sRGB-friendly lightness
  ['#808080', '#808080'],
  ['#FF0000', '#0000FF'],
  ['#7A5CFA', '#20C997'],
];

describe('derivePalette contrast guarantees', () => {
  it.each(INPUTS)('primary %s / accent %s', (p, a) => {
    const c = derivePalette(p, a);
    // Brand: white button text, link text on the surface, mist/tint text on brand.
    expect(contrast(NEUTRAL.white, c.brand)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.brand, NEUTRAL.surface)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.brandMist, c.brand)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.brandTint, c.brand)).toBeGreaterThanOrEqual(AA_TEXT);
    // Ink over the light tints and over the accent fill.
    expect(contrast(NEUTRAL.ink, c.brandTint)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(NEUTRAL.ink, c.accentTint)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(NEUTRAL.ink, c.accent)).toBeGreaterThanOrEqual(AA_TEXT);
    // Accent text on the accent tint (and on white), and light accent text on brand.
    expect(contrast(c.accentInk, c.accentTint)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.accentDark, c.accentTint)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.accentDark, NEUTRAL.white)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.accentLight, c.brand)).toBeGreaterThanOrEqual(AA_TEXT);
    for (const v of Object.values(c)) expect(v).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('keeps a primary that already passes exactly as chosen', () => {
    expect(derivePalette('#3F6B2A', '#C9A24A').brand).toBe('#3F6B2A');
    expect(derivePalette('#12355B', '#F2A541').accent).toBe('#F2A541');
  });

  it('darkens a too-light primary and lightens a too-dark accent, keeping the hue family', () => {
    const light = derivePalette('#FFFF99', '#FFFFFF');
    expect(light.brand).not.toBe('#FFFF99');
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(light.brand.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b); // still yellowish/olive
    expect(g).toBeGreaterThan(b);
    const dark = derivePalette('#3B5BDB', '#000000');
    expect(dark.accent).not.toBe('#000000');
  });
});

describe('platform theme', () => {
  it('uses the exact cobalt/amber from the plan and matches the CSS defaults in index.css', () => {
    expect(PLATFORM_BRANDING).toMatchObject({ displayName: 'Pedidos', primary: '#3B5BDB', accent: '#FFB000', fontPreset: 'modern', logoUrl: '' });
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
    const vars = buildTheme(PLATFORM_BRANDING).vars;
    for (const [k, v] of Object.entries(vars)) expect(css).toContain(`${k}: ${v};`);
  });
});

describe('parseBranding / resolveBranding', () => {
  it('accepts a valid branding and normalizes hex case', () => {
    expect(parseBranding({ ...valid, primary: '#b3261e' })).toEqual(valid);
  });
  it('accepts empty logo/icon URLs (wordmark)', () => {
    expect(parseBranding({ ...valid, logoUrl: '', iconUrl: '', tagline: undefined })).toMatchObject({ logoUrl: '', iconUrl: '' });
  });

  const bad: Array<[string, unknown]> = [
    ['undefined', undefined],
    ['null', null],
    ['string', 'rojo'],
    ['bad hex (3 digits)', { ...valid, primary: '#FFF' }],
    ['bad hex (no #)', { ...valid, primary: 'B3261E' }],
    ['bad hex (css injection)', { ...valid, accent: '#FFFFFF; background:url(x)' }],
    ['non-string hex', { ...valid, primary: 0xb3261e }],
    ['http logo', { ...valid, logoUrl: 'http://example.com/l.png' }],
    ['javascript: logo', { ...valid, logoUrl: 'javascript:alert(1)' }],
    ['data: icon', { ...valid, iconUrl: 'data:image/png;base64,AAAA' }],
    ['url with credentials', { ...valid, logoUrl: 'https://u:p@example.com/l.png' }],
    ['not a url', { ...valid, logoUrl: 'logo.png' }],
    ['over-long url', { ...valid, logoUrl: 'https://example.com/' + 'a'.repeat(LIMITS.url) }],
    ['over-long name', { ...valid, displayName: 'N'.repeat(LIMITS.displayName + 1) }],
    ['empty name', { ...valid, displayName: '   ' }],
    ['control chars in name', { ...valid, displayName: 'Casa\nRoja' }],
    ['over-long tagline', { ...valid, tagline: 'x'.repeat(LIMITS.tagline + 1) }],
    ['unknown font preset', { ...valid, fontPreset: 'comic' }],
    ['missing font preset', { ...valid, fontPreset: undefined }],
  ];
  it.each(bad)('rejects %s and falls back to the platform theme', (_n, raw) => {
    expect(parseBranding(raw)).toBeNull();
    expect(resolveBranding(raw)).toEqual(PLATFORM_BRANDING);
  });

  it('platform fallback is not Pick & Eat', () => {
    expect(JSON.stringify(PLATFORM_BRANDING)).not.toMatch(/pick/i);
  });
});

describe('font presets', () => {
  it('maps each preset to its Google Font pair, and only that preset is requested', () => {
    const expected: Record<FontPreset, [string, string]> = {
      classic: ['Fraunces', 'DM+Sans'],
      modern: ['Bricolage+Grotesque', 'Hanken+Grotesk'],
      rounded: ['Nunito', 'Quicksand'],
    };
    for (const preset of Object.keys(expected) as FontPreset[]) {
      const f = FONT_PRESETS[preset];
      const t = buildTheme({ ...valid, fontPreset: preset });
      expect(t.fontHref).toBe(f.href);
      expect(t.fontHref.startsWith('https://fonts.googleapis.com/css2?')).toBe(true);
      for (const fam of expected[preset]) expect(t.fontHref).toContain(fam);
      for (const other of Object.keys(expected).filter((k) => k !== preset) as FontPreset[]) {
        for (const fam of expected[other]) expect(t.fontHref).not.toContain(fam);
      }
      expect(t.vars['--font-display']).toBe(f.display);
      expect(t.vars['--font-sans']).toBe(f.sans);
    }
  });
});

describe('theme cache', () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it('round-trips per branch', () => {
    const s = memory();
    writeThemeCache(s, 'b1', valid);
    expect(readThemeCache(s, 'b1')).toEqual(valid);
    expect(readThemeCache(s, 'b2')).toBeNull();
    const entry = JSON.parse(s.m.get(cacheKey('b1'))!);
    expect(entry.theme.vars['--brand']).toMatch(/^\d+ \d+ \d+$/);
    expect(entry.theme.title).toBe('Casa Roja');
  });

  it('survives a blocked localStorage (throws on access / read / write)', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    };
    expect(() => writeThemeCache(blocked, 'b1', valid)).not.toThrow();
    expect(readThemeCache(blocked, 'b1')).toBeNull();
    expect(readThemeCache(null, 'b1')).toBeNull();
    expect(() => writeThemeCache(null, 'b1', valid)).not.toThrow();
  });

  it('safeLocalStorage returns null when touching localStorage throws', () => {
    const g = globalThis as { localStorage?: unknown };
    const orig = Object.getOwnPropertyDescriptor(g, 'localStorage');
    Object.defineProperty(g, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
    try {
      expect(safeLocalStorage()).toBeNull();
    } finally {
      if (orig) Object.defineProperty(g, 'localStorage', orig);
      else delete g.localStorage;
    }
  });

  it('ignores corrupt or tampered cache entries', () => {
    const s = memory();
    s.setItem(cacheKey('b1'), '{not json');
    expect(readThemeCache(s, 'b1')).toBeNull();
    s.setItem(cacheKey('b1'), JSON.stringify({ v: 1, branding: { ...valid, logoUrl: 'javascript:alert(1)' } }));
    expect(readThemeCache(s, 'b1')).toBeNull();
    s.setItem(cacheKey('b1'), JSON.stringify({ v: 2, branding: valid }));
    expect(readThemeCache(s, 'b1')).toBeNull();
  });
});

describe('applyThemeToDocument', () => {
  const fakeDoc = () => {
    const styles: Record<string, string> = {};
    const appended: Array<{ rel?: string; href?: string }> = [];
    const meta = { content: '' };
    return {
      styles,
      appended,
      meta,
      doc: {
        title: '',
        documentElement: { style: { setProperty: (k: string, v: string) => (styles[k] = v) } },
        head: { appendChild: (n: { rel?: string; href?: string }) => appended.push(n) },
        querySelector: (sel: string) => (sel.startsWith('meta') ? meta : null),
        querySelectorAll: () => [],
        createElement: () => ({ setAttribute: () => undefined }) as Record<string, unknown>,
      } as unknown as Document,
    };
  };

  it('sets variables, title, theme-color, icons and the preset font link', () => {
    const f = fakeDoc();
    applyThemeToDocument(f.doc, buildTheme(valid));
    expect(f.styles['--brand']).toMatch(/^\d+ \d+ \d+$/);
    expect(f.doc.title).toBe('Casa Roja');
    expect(f.meta.content).toMatch(/^#[0-9A-F]{6}$/);
    const hrefs = f.appended.map((n) => n.href);
    expect(hrefs).toContain(valid.iconUrl);
    expect(hrefs).toContain(FONT_PRESETS.rounded.href);
  });

  it('does not touch icons when the branding has none', () => {
    const f = fakeDoc();
    applyThemeToDocument(f.doc, buildTheme(PLATFORM_BRANDING));
    expect(f.appended.every((n) => n.rel !== 'icon')).toBe(true);
  });
});
