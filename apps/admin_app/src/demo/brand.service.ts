import { isAcceptedType, type BrandImageKind } from '@/features/brand/services/image';

// Stand-in for features/brand/services/brand.service.ts (see the aliases in vite.config.ts).
// Nothing leaves the browser: "uploading" returns a local blob: URL so the live preview can
// show the picture; saving always explains that demo mode is read-only.

export async function uploadBrandImage(_orgId: string, _kind: BrandImageKind, file: File): Promise<string> {
  if (!isAcceptedType(file.type)) {
    throw new Error('Ese archivo no es una imagen compatible. Usa un PNG, JPG o WebP.');
  }
  return URL.createObjectURL(file);
}

export async function saveBranding(): Promise<number> {
  throw new Error('Estás en el modo demo: puedes probar la vista previa, pero no se guarda nada.');
}
