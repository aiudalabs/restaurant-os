import { useMutation } from '@tanstack/react-query';
import { saveBranding, uploadBrandImage } from '@/features/brand/services/brand.service';
import type { BrandImageKind } from '../services/image';
import type { Branding } from '../theme';

/** Resizes in the browser and uploads the logo or icon; resolves to its public URL. */
export function useUploadBrandImage(orgId: string) {
  return useMutation({
    mutationFn: ({ kind, file }: { kind: BrandImageKind; file: File }) => uploadBrandImage(orgId, kind, file),
  });
}

/** Writes the brand to every branch of the org; resolves to how many branches were updated. */
export function useSaveBranding(branchIds: string[]) {
  return useMutation({
    mutationFn: (branding: Branding) => saveBranding(branchIds, branding),
  });
}
