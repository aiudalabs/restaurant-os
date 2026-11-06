// Stand-in for src/lib/firebase.ts in demo mode: no Firebase app is created and nothing goes to the network.
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import type { FirebaseStorage } from 'firebase/storage';
import type { FirebaseApp } from 'firebase/app';

/** The sign-in screen is shown when the URL starts with /login; every other path is "signed in". */
export const signedOut = (): boolean => window.location.pathname.startsWith('/login');

export const app = {} as FirebaseApp;
export const db = {} as Firestore;
export const functions = {} as Functions;
export const storage = {} as FirebaseStorage;
export const auth = {
  get currentUser() {
    return signedOut() ? null : { uid: 'demo-user', getIdToken: async () => 'demo' };
  },
} as unknown as Auth;
