// MIRRORS apps/customer_web/src/lib/theme.ts (docs/BRANDING_DESIGN.md §3.2). The live preview
// of the Marca screen must derive exactly what the customer app derives, so these pure
// functions are a verbatim copy. The localStorage cache section is left out (the admin does
// not cache themes). If the derivation changes in customer_web, change it here too:
// theme.test.ts pins the behavior (contrast guarantees on many inputs).

// Per-restaurant theme (docs/BRANDING_DESIGN.md §3.2-3.3). Pure functions only: the
// owner picks TWO colors (primary + accent) and everything else is derived in OKLCH
// and nudged until the text/background pairs the UI really uses pass WCAG AA.
// Nothing here touches the DOM or the network (see lib/branding.ts for that).

export type FontPreset = 'classic' | 'modern' | 'rounded';

export interface Branding {
  displayName: string;
  primary: string; // #RRGGBB
  accent: string; // #RRGGBB
  fontPreset: FontPreset;
  logoUrl: string; // https only, '' = no logo (wordmark)
  iconUrl: string; // https only, '' = none
  tagline?: string;
}

/** Neutral platform theme used when a branch has no (valid) `branding`. NOT Pick & Eat. */
export const PLATFORM_BRANDING: Branding = {
  displayName: 'Pedidos',
  primary: '#3B5BDB',
  accent: '#FFB000',
  fontPreset: 'modern',
  logoUrl: '',
  iconUrl: '',
};

// ─── Fixed neutrals (not customizable) ──────────────────────────────────────

export const NEUTRAL = { white: '#FFFFFF', surface: '#FAF8F2', ink: '#141414' } as const;
export const AA_TEXT = 4.5;

// ─── Validation ─────────────────────────────────────────────────────────────

const HEX = /^#[0-9a-fA-F]{6}$/;
const PRESETS: readonly FontPreset[] = ['classic', 'modern', 'rounded'];
export const LIMITS = { displayName: 40, tagline: 80, url: 500 } as const;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

function cleanText(v: unknown, max: number, required: boolean): string | null {
  if (v === undefined || v === null) return required ? null : '';
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (required && t.length === 0) return null;
  if (t.length > max || CONTROL.test(t)) return null;
  return t;
}

function cleanUrl(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v !== 'string' || v.length > LIMITS.url) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Returns a sanitized Branding, or null when anything is off (caller falls back to the platform theme). */
export function parseBranding(raw: unknown): Branding | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const displayName = cleanText(r.displayName, LIMITS.displayName, true);
  const tagline = cleanText(r.tagline, LIMITS.tagline, false);
  const logoUrl = cleanUrl(r.logoUrl);
  const iconUrl = cleanUrl(r.iconUrl);
  if (displayName === null || tagline === null || logoUrl === null || iconUrl === null) return null;
  if (typeof r.primary !== 'string' || !HEX.test(r.primary)) return null;
  if (typeof r.accent !== 'string' || !HEX.test(r.accent)) return null;
  if (typeof r.fontPreset !== 'string' || !PRESETS.includes(r.fontPreset as FontPreset)) return null;
  return {
    displayName,
    primary: r.primary.toUpperCase(),
    accent: r.accent.toUpperCase(),
    fontPreset: r.fontPreset as FontPreset,
    logoUrl,
    iconUrl,
    ...(tagline ? { tagline } : {}),
  };
}

export function resolveBranding(raw: unknown): Branding {
  return parseBranding(raw) ?? PLATFORM_BRANDING;
}

// ─── Color math (sRGB <-> OKLab/OKLCH, WCAG contrast) ───────────────────────

interface Lch {
  l: number;
  c: number;
  h: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const toLinear = (u: number) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
const fromLinear = (u: number) => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgbToHex = (rgb: [number, number, number]) =>
  '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

function hexToLch(hex: string): Lch {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(a, bb);
  return { l: L, c, h: c < 1e-4 ? 0 : Math.atan2(bb, a) };
}

/** Linear sRGB for an OKLCH color (may be out of gamut). */
function lchToLinear({ l, c, h }: Lch): [number, number, number] {
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH -> hex; if out of gamut, lowers chroma (keeps lightness and hue). */
function lchToHex(lch: Lch): string {
  const l = clamp01(lch.l);
  let lin = lchToLinear({ ...lch, l });
  if (!inGamut(lin)) {
    let lo = 0;
    let hi = lch.c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(lchToLinear({ l, c: mid, h: lch.h }))) lo = mid;
      else hi = mid;
    }
    lin = lchToLinear({ l, c: lo, h: lch.h });
  }
  return rgbToHex(lin.map((v) => Math.round(clamp01(fromLinear(clamp01(v))) * 255)) as [number, number, number]);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Moves the lightness of `start` the minimum needed (in direction `dir`) until `ok(hex)`
 * holds. Returns `start` untouched when it already passes. Always terminates: at the
 * extreme (L=0 / L=1) it returns black / white-ish, which the callers' pairs accept.
 */
function fitLightness(start: Lch, dir: 1 | -1, ok: (hex: string) => boolean): string {
  const first = lchToHex(start);
  if (ok(first)) return first;
  const extreme = dir === 1 ? 1 : 0;
  let pass = extreme; // assumed passing
  let fail = start.l;
  for (let i = 0; i < 30; i++) {
    const mid = (pass + fail) / 2;
    if (ok(lchToHex({ ...start, l: mid }))) pass = mid;
    else fail = mid;
  }
  return lchToHex({ ...start, l: pass });
}

// ─── Palette ────────────────────────────────────────────────────────────────

export interface Palette {
  brand: string;
  brandDark: string;
  brandTint: string;
  brandMist: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  accentTint: string;
  accentInk: string;
}

export function derivePalette(primaryHex: string, accentHex: string): Palette {
  // ── brand
  const p = hexToLch(primaryHex);
  const brandMist = lchToHex({ l: 0.93, c: Math.min(p.c * 0.3, 0.04), h: p.h });
  const brandTint = lchToHex({ l: 0.96, c: Math.min(p.c * 0.25, 0.03), h: p.h });
  // White text (buttons), surface text (links) and mist text on brand must all be AA.
  const brand = fitLightness(p, -1, (hex) =>
    [NEUTRAL.white, NEUTRAL.surface, brandMist].every((bg) => contrast(hex, bg) >= AA_TEXT),
  );
  const b = hexToLch(brand);
  const brandDark = lchToHex({ ...b, l: Math.max(0.12, b.l - 0.07) });

  // ── accent
  const a0 = hexToLch(accentHex);
  const accentTint = lchToHex({ l: 0.94, c: Math.min(a0.c * 0.35, 0.05), h: a0.h });
  // Accent is a fill under `text-ink` (icons, buttons): ink on accent must be AA.
  const accent = fitLightness(a0, 1, (hex) => contrast(hex, NEUTRAL.ink) >= AA_TEXT);
  const a = hexToLch(accent);
  const textOnTint = (hex: string) =>
    contrast(hex, accentTint) >= AA_TEXT && contrast(hex, NEUTRAL.white) >= AA_TEXT;
  const accentDark = fitLightness({ ...a, l: Math.min(a.l, 0.55) - 0.05 }, -1, textOnTint);
  const accentInk = fitLightness({ ...hexToLch(accentDark), l: hexToLch(accentDark).l - 0.1 }, -1, textOnTint);
  // Light accent is text over the brand fill: must be AA against it.
  const accentLight = fitLightness({ ...a, l: Math.max(a.l, 0.86), c: a.c * 0.8 }, 1, (hex) =>
    contrast(hex, brand) >= AA_TEXT,
  );

  return { brand, brandDark, brandTint, brandMist, accent, accentDark, accentLight, accentTint, accentInk };
}

// ─── Fonts ──────────────────────────────────────────────────────────────────

export interface FontSpec {
  display: string;
  sans: string;
  href: string;
}

const GF = 'https://fonts.googleapis.com/css2?';
export const FONT_PRESETS: Record<FontPreset, FontSpec> = {
  classic: {
    display: "'Fraunces', Georgia, serif",
    sans: "'DM Sans', system-ui, sans-serif",
    href: `${GF}family=DM+Sans:opsz,wght@9..40,400..700&family=Fraunces:opsz,wght@9..144,500..700&display=swap`,
  },
  modern: {
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    sans: "'Hanken Grotesk', system-ui, sans-serif",
    href: `${GF}family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Hanken+Grotesk:wght@400..700&display=swap`,
  },
  rounded: {
    display: "'Nunito', system-ui, sans-serif",
    sans: "'Quicksand', system-ui, sans-serif",
    href: `${GF}family=Nunito:wght@600..800&family=Quicksand:wght@400..700&display=swap`,
  },
};

export const FONT_HREF_PREFIX = 'https://fonts.googleapis.com/';

// ─── Applied theme (what the DOM needs; also what is cached) ────────────────

export interface AppliedTheme {
  vars: Record<string, string>;
  title: string;
  themeColor: string;
  iconUrl: string;
  fontHref: string;
}

const channels = (hex: string) => hexToRgb(hex).join(' ');

export function buildTheme(branding: Branding): AppliedTheme {
  const p = derivePalette(branding.primary, branding.accent);
  const f = FONT_PRESETS[branding.fontPreset];
  return {
    vars: {
      '--brand': channels(p.brand),
      '--brand-dark': channels(p.brandDark),
      '--brand-tint': channels(p.brandTint),
      '--brand-mist': channels(p.brandMist),
      '--accent': channels(p.accent),
      '--accent-dark': channels(p.accentDark),
      '--accent-light': channels(p.accentLight),
      '--accent-tint': channels(p.accentTint),
      '--accent-ink': channels(p.accentInk),
      '--font-display': f.display,
      '--font-sans': f.sans,
    },
    title: branding.displayName,
    themeColor: p.brand,
    iconUrl: branding.iconUrl,
    fontHref: f.href,
  };
}
