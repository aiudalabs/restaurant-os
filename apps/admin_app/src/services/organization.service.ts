import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import type { Organization, OrganizationFiscal } from '@/types/organization';

/** Live organization doc; `null` when it does not exist or cannot be read. */
export function watchOrganization(orgId: string, callback: (org: Organization | null) => void): () => void {
  return onSnapshot(
    doc(db, paths.organizations, orgId),
    (snap) => callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Organization) : null),
    (err) => {
      console.error('watchOrganization error:', err);
      callback(null);
    },
  );
}

/** Replaces the whole fiscal map (rules: admins of the org only). */
export async function updateOrganizationFiscal(orgId: string, fiscal: OrganizationFiscal): Promise<void> {
  await updateDoc(doc(db, paths.organizations, orgId), { fiscal });
}
