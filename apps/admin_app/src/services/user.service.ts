import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import type { AppUser } from '@/types/user';

export function watchUsers(
  orgId: string,
  callback: (users: AppUser[]) => void,
) {
  const q = query(
    collection(db, paths.users),
    where('orgId', '==', orgId),
    orderBy('displayName'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppUser));
  });
}

export async function updateUser(
  id: string,
  data: Partial<AppUser>,
) {
  await updateDoc(doc(db, paths.users, id), data);
}

export async function toggleUser(id: string, isActive: boolean) {
  await updateDoc(doc(db, paths.users, id), { isActive });
}

interface CreateOperatorPayload {
  email: string;
  password: string;
  displayName: string;
  orgId: string;
  branchIds: string[];
  role: 'admin' | 'manager' | 'operator';
  stationId?: string;
}

interface CreateOperatorResult {
  uid: string;
}

export async function createOperatorUser(
  payload: CreateOperatorPayload,
): Promise<string> {
  const fn = httpsCallable<CreateOperatorPayload, CreateOperatorResult>(
    functions,
    'createOperatorUser',
  );
  const result = await fn(payload);
  return result.data.uid;
}
