import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import type { Branch } from '@/types/branch';

export async function fetchBranch(branchId: string): Promise<Branch | null> {
  const snap = await getDoc(doc(db, paths.branches, branchId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Branch;
}

export async function fetchBranches(branchIds: string[]): Promise<Branch[]> {
  const results = await Promise.all(branchIds.map(fetchBranch));
  return results.filter((b): b is Branch => b !== null);
}

/** Live list of every branch in an organization (for owners/admins). */
export function watchBranchesByOrg(orgId: string, callback: (branches: Branch[]) => void) {
  const q = query(collection(db, paths.branches), where('orgId', '==', orgId));
  return onSnapshot(
    q,
    (snap) => {
      const branches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Branch);
      branches.sort((a, b) => a.name.localeCompare(b.name));
      callback(branches);
    },
    (err) => {
      console.error('watchBranchesByOrg error:', err);
      callback([]);
    },
  );
}

export type NewBranch = Omit<Branch, 'id' | 'createdAt'>;

export async function createBranch(data: NewBranch): Promise<string> {
  const ref = await addDoc(collection(db, paths.branches), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBranch(id: string, data: Partial<Branch>): Promise<void> {
  await updateDoc(doc(db, paths.branches, id), data);
}
