import { describe, expect, it } from 'vitest';
import {
  AA_TEXT,
  FONT_PRESETS,
  LIMITS,
  NEUTRAL,
  PLATFORM_BRANDING,
  buildTheme,
  contrast,
  derivePalette,
  parseBranding,
  type Branding,
} from './theme';
import { explainColor } from './contrast-notes';

const valid: Branding = {
  displayName: 'Casa Roja',
  primary: '#B3261E',
  accent: '#E0A458',
  fontPreset: 'rounded',
  logoUrl: '',
  iconUrl: '',
};

// Same inputs as customer_web's theme.test.ts: the preview must give the same guarantees.
const INPUTS: Array<[string, string]> = [
  ['#3F6B2A', '#C9A24A'],
  ['#B3261E', '#E0A458'],
  ['#12355B', '#F2A541'],
  ['#3B5BDB', '#FFB000'],
  ['#FFFF99', '#FFFFCC'],
  ['#FFFFFF', '#FFFFFF'],
  ['#050505', '#000000'],
  ['#00FFFF', '#FF00FF'],
  ['#808080', '#808080'],
];

describe('derivePalette (mirror of customer_web)', () => {
  it.each(INPUTS)('primary %s / accent %s keep AA', (p, a) => {
    const c = derivePalette(p, a);
    expect(contrast(NEUTRAL.white, c.brand)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.brandMist, c.brand)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(NEUTRAL.ink, c.accent)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.accentLight, c.brand)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('keeps colors that already pass exactly as chosen', () => {
    expect(derivePalette('#3F6B2A', '#C9A24A').brand).toBe('#3F6B2A');
    expect(derivePalette('#12355B', '#F2A541').accent).toBe('#F2A541');
  });

  it('platform defaults and limits match customer_web', () => {
    expect(PLATFORM_BRANDING).toMatchObject({ primary: '#3B5BDB', accent: '#FFB000', fontPreset: 'modern' });
    expect(LIMITS).toMatchObject({ displayName: 40, tagline: 80 });
    expect(Object.keys(FONT_PRESETS)).toEqual(['classic', 'modern', 'rounded']);
    expect(buildTheme(valid).vars['--brand']).toMatch(/^\d+ \d+ \d+$/);
  });

  it('rejects what the security rules would reject', () => {
    expect(parseBranding({ ...valid, primary: '#FFF' })).toBeNull();
    expect(parseBranding({ ...valid, displayName: 'N'.repeat(41) })).toBeNull();
    expect(parseBranding({ ...valid, fontPreset: 'comic' })).toBeNull();
  });
});

describe('explainColor (contrast guard copy)', () => {
  it('says nothing when the color passes', () => {
    expect(explainColor('primary', '#3F6B2A', '#3F6B2A')).toBeNull();
    expect(explainColor('accent', '#F2A541', '#F2A541')).toBeNull();
  });

  it('explains a too-light primary in plain Spanish with the adjusted color', () => {
    const adjusted = derivePalette('#FFFF99', '#FFB000').brand;
    const note = explainColor('primary', '#FFFF99', adjusted);
    expect(note).toContain(adjusted);
    expect(note).toMatch(/blanco/);
    expect(note).toMatch(/oscurec/);
  });

  it('explains a too-dark accent', () => {
    const adjusted = derivePalette('#3B5BDB', '#000000').accent;
    const note = explainColor('accent', '#000000', adjusted);
    expect(note).toContain(adjusted);
    expect(note).toMatch(/aclar/);
  });
});
