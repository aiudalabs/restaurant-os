// Browser-side preparation of brand images, like services/storage.service.ts does for
// product photos, but keeping transparency (PNG first, WebP only when PNG is too heavy).

export type BrandImageKind = 'logo' | 'icon';

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',');
export const MAX_BYTES = 1024 * 1024; // storage.rules: size < 1 MB
const LOGO_MAX_WIDTH = 1200;
const ICON_SIDE = 512;
const ICON_MIN_SIDE = 192;
const SAFE_BYTES = MAX_BYTES - 16 * 1024;

export interface PreparedImage {
  blob: Blob;
  extension: 'png' | 'webp';
}

export function isAcceptedType(type: string): boolean {
  return (ACCEPTED_TYPES as readonly string[]).includes(type);
}

export async function prepareBrandImage(file: File, kind: BrandImageKind): Promise<PreparedImage> {
  if (!isAcceptedType(file.type)) {
    throw new Error('Ese archivo no es una imagen compatible. Usa un PNG, JPG o WebP.');
  }
  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation phones write into photos.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('No se pudo leer la imagen. Prueba con otro archivo PNG, JPG o WebP.');
  }
  try {
    if (kind === 'icon' && Math.min(bitmap.width, bitmap.height) < ICON_MIN_SIDE) {
      throw new Error(`El ícono es muy pequeño. Sube una imagen de al menos ${ICON_MIN_SIDE} × ${ICON_MIN_SIDE} px.`);
    }
    return await encodeUnderLimit(bitmap, kind);
  } finally {
    bitmap.close();
  }
}

function draw(bitmap: ImageBitmap, kind: BrandImageKind, shrink: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no puede procesar imágenes.');
  if (kind === 'icon') {
    // Square: crop the center, so a wide logo is not squashed.
    const side = Math.round(ICON_SIDE * shrink);
    const crop = Math.min(bitmap.width, bitmap.height);
    canvas.width = side;
    canvas.height = side;
    ctx.drawImage(bitmap, (bitmap.width - crop) / 2, (bitmap.height - crop) / 2, crop, crop, 0, 0, side, side);
    return canvas;
  }
  const scale = Math.min(1, LOGO_MAX_WIDTH / bitmap.width) * shrink;
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encodeUnderLimit(bitmap: ImageBitmap, kind: BrandImageKind): Promise<PreparedImage> {
  for (const shrink of [1, 0.75, 0.5]) {
    const canvas = draw(bitmap, kind, shrink);
    const png = await toBlob(canvas, 'image/png');
    if (png && png.size <= SAFE_BYTES) return { blob: png, extension: 'png' };
    for (const quality of [0.9, 0.75]) {
      const webp = await toBlob(canvas, 'image/webp', quality);
      if (webp && webp.type === 'image/webp' && webp.size <= SAFE_BYTES) return { blob: webp, extension: 'webp' };
    }
  }
  throw new Error('La imagen sigue pesando más de 1 MB. Usa una versión más simple o más pequeña.');
}
