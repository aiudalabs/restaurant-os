import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '@/lib/firebase';

// Photos are downscaled in the browser before upload: a 5 MB phone photo ends up
// around 100–200 KB, so the customer menu loads fast on mobile data.
const MAX_SIDE_PX = 1200;
const JPEG_QUALITY = 0.85;

/**
 * Uploads a product photo to orgs/{orgId}/products/ and returns its public URL
 * (stored in product.imageUrl). storage.rules only accept images from that
 * org's admins/managers, identified by the { orgId, role } token claims.
 */
export async function uploadProductImage(orgId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo no es una imagen. Usa una foto JPG o PNG.');
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');

  const image = await downscale(file);

  // A token minted before the claims were added lacks orgId: refresh it once.
  const token = await user.getIdTokenResult();
  if (token.claims.orgId !== orgId) await user.getIdToken(true);

  const fileRef = ref(storage, `orgs/${orgId}/products/${crypto.randomUUID()}.jpg`);
  await uploadBytes(fileRef, image, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000, immutable', // names are unique, never overwritten
  });
  return getDownloadURL(fileRef);
}

async function downscale(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation phones write into photos.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('No se pudo leer la imagen. Prueba con una foto JPG o PNG.');
  }
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no puede procesar imágenes.');
  ctx.fillStyle = '#ffffff'; // transparent PNG areas → white in the JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
