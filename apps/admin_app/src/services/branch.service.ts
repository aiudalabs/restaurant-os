import { doc, getDoc, updateDoc } from 'firebase/firestore';
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

export async function updateBranch(id: string, data: Partial<Branch>): Promise<void> {
  await updateDoc(doc(db, paths.branches, id), data);
}
