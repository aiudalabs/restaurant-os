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
import type { Station } from '@/types/station';

export function watchStations(
  orgId: string,
  branchId: string,
  callback: (stations: Station[]) => void,
) {
  const q = query(
    collection(db, paths.stations),
    where('orgId', '==', orgId),
    where('branchId', '==', branchId),
  );
  return onSnapshot(q, (snap) => {
    const stations = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Station);
    stations.sort((a, b) => a.name.localeCompare(b.name));
    callback(stations);
  }, (err) => {
    console.error('watchStations error:', err);
    callback([]);
  });
}

export async function createStation(
  data: Omit<Station, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, paths.stations), data);
  return ref.id;
}

export async function updateStation(
  id: string,
  data: Partial<Station>,
) {
  await updateDoc(doc(db, paths.stations, id), data);
}

export async function deleteStation(id: string) {
  await deleteDoc(doc(db, paths.stations, id));
}

export async function toggleStation(id: string, isActive: boolean) {
  await updateDoc(doc(db, paths.stations, id), { isActive });
}
