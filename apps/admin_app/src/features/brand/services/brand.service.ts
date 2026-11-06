import { doc, writeBatch } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import type { Branding } from '../theme';
import { prepareBrandImage, type BrandImageKind } from './image';

/**
 * Uploads the logo or the icon to orgs/{orgId}/brand/ and returns its public download URL
 * (https://firebasestorage.googleapis.com/v0/b/<bucket>/o/orgs%2F<orgId>%2Fbrand%2F<file>?alt=media&token=…),
 * the only shape firestore.rules accept for branches.branding. storage.rules: admin/manager of
 * that org, png/jpeg/webp, under 1 MB (the browser already downscaled it).
 */
export async function uploadBrandImage(orgId: string, kind: BrandImageKind, file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');

  const image = await prepareBrandImage(file, kind);

  // A token minted before the claims were added lacks orgId: refresh it once.
  const token = await user.getIdTokenResult();
  if (token.claims.orgId !== orgId) await user.getIdToken(true);

  const fileRef = ref(storage, `orgs/${orgId}/brand/${kind}-${crypto.randomUUID()}.${image.extension}`);
  try {
    await uploadBytes(fileRef, image.blob, {
      contentType: image.blob.type,
      cacheControl: 'public, max-age=31536000, immutable', // names are unique, never overwritten
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'storage/unauthorized') {
      throw new Error('Tu usuario no puede subir imágenes de marca. Pídele al dueño de la cuenta que lo haga.');
    }
    throw new Error('No se pudo subir la imagen. Revisa tu conexión e inténtalo de nuevo.');
  }
  return getDownloadURL(fileRef);
}

const BATCH_LIMIT = 400; // Firestore allows 500 writes per batch

/**
 * Writes the same `branding` to every branch of the organization (one brand per org) and
 * returns how many branches were updated. firestore.rules validate each field and require
 * an admin of the org, so a bad value fails the whole batch instead of leaving half the
 * branches updated.
 */
export async function saveBranding(branchIds: string[], branding: Branding): Promise<number> {
  const data = { ...branding };
  if (!data.tagline) delete data.tagline; // Firestore rejects undefined; the rules treat tagline as optional
  for (let i = 0; i < branchIds.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const id of branchIds.slice(i, i + BATCH_LIMIT)) {
      batch.update(doc(db, paths.branches, id), { branding: data });
    }
    await batch.commit();
  }
  return branchIds.length;
}
