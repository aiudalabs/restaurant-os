import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import type { Table } from '@/types/table';

export function watchTables(
  orgId: string,
  branchId: string,
  callback: (tables: Table[]) => void,
) {
  const q = query(
    collection(db, paths.tables),
    where('branchId', '==', branchId),
  );
  return onSnapshot(q, (snap) => {
    const tables = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Table);
    tables.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    callback(tables);
  }, (err) => {
    console.error('watchTables error:', err);
    callback([]);
  });
}

export async function createTable(
  data: Omit<Table, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, paths.tables), data);
  return ref.id;
}

export async function updateTable(
  id: string,
  data: Partial<Table>,
) {
  await updateDoc(doc(db, paths.tables, id), data);
}

export async function deleteTable(id: string) {
  await deleteDoc(doc(db, paths.tables, id));
}

export async function toggleTable(id: string, isActive: boolean) {
  await updateDoc(doc(db, paths.tables, id), { isActive });
}
