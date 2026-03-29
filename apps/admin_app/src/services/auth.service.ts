import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import type { AppUser } from '@/types/user';

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export async function fetchAppUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, paths.users, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}
