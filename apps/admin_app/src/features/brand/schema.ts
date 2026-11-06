import { z } from 'zod';
import type { Branch } from '@/types/branch';
import { LIMITS, PLATFORM_BRANDING, parseBranding, type Branding } from './theme';

const HEX = /^#[0-9a-fA-F]{6}$/;
// firestore.rules accept control characters but customer_web's parseBranding rejects them
// (and would then show the neutral theme): refuse them here so a saved brand is never dropped.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

const color = (what: string) =>
  z.string().regex(HEX, `Escribe el color de ${what} como #RRGGBB, por ejemplo #3B5BDB.`);

export const brandSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre que verán tus clientes.')
    .max(LIMITS.displayName, `Usa ${LIMITS.displayName} caracteres o menos.`)
    .refine((v) => !CONTROL.test(v), 'El nombre no puede tener saltos de línea.'),
  tagline: z
    .string()
    .trim()
    .max(LIMITS.tagline, `Usa ${LIMITS.tagline} caracteres o menos.`)
    .refine((v) => !CONTROL.test(v), 'La frase no puede tener saltos de línea.'),
  primary: color('marca'),
  accent: color('realce'),
  fontPreset: z.enum(['classic', 'modern', 'rounded']),
  logoUrl: z.string().min(1, 'Sube tu logo para poder guardar.'),
  iconUrl: z.string().min(1, 'Sube tu ícono para poder guardar.'),
});

export type BrandForm = z.infer<typeof brandSchema>;

export function toBranding(f: BrandForm): Branding {
  return {
    displayName: f.displayName.trim(),
    primary: f.primary.toUpperCase(),
    accent: f.accent.toUpperCase(),
    fontPreset: f.fontPreset,
    logoUrl: f.logoUrl,
    iconUrl: f.iconUrl,
    ...(f.tagline.trim() ? { tagline: f.tagline.trim() } : {}),
  };
}

export function toForm(b: Branding): BrandForm {
  return { ...b, tagline: b.tagline ?? '' };
}

export interface CurrentBrand {
  /** Brand found on the branches, or null when the organization has none yet. */
  branding: Branding | null;
  /** Branches that do not carry exactly this brand (saving will unify them). */
  outOfSync: number;
}

/** The org's brand as stored today: the first branch with a valid `branding` wins. */
export function currentBrand(branches: Branch[]): CurrentBrand {
  const found = branches.map((b) => parseBranding(b.branding)).find((b): b is Branding => b !== null) ?? null;
  if (!found) return { branding: null, outOfSync: 0 };
  const same = (b: Branch) => JSON.stringify(parseBranding(b.branding)) === JSON.stringify(found);
  return { branding: found, outOfSync: branches.filter((b) => !same(b)).length };
}

export const EMPTY_FORM: Omit<BrandForm, 'displayName'> = {
  tagline: '',
  primary: PLATFORM_BRANDING.primary,
  accent: PLATFORM_BRANDING.accent,
  fontPreset: PLATFORM_BRANDING.fontPreset,
  logoUrl: '',
  iconUrl: '',
};
