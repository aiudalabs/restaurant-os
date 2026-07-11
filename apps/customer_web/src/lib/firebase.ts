import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Public Firebase web config for restaurant-os-68c79.
// The web API key is not a secret — access is governed by Firestore security
// rules. Inlined so the demo build works without extra env setup.
const firebaseConfig = {
  apiKey: 'AIzaSyCBCwt3GmpxVcGWH58CULtWRh-4snbJ1IY',
  authDomain: 'restaurant-os-68c79.firebaseapp.com',
  projectId: 'restaurant-os-68c79',
  storageBucket: 'restaurant-os-68c79.firebasestorage.app',
  messagingSenderId: '839468636765',
  appId: '1:839468636765:web:6f029569314405bfb70bb4',
  databaseURL: 'https://restaurant-os-68c79-default-rtdb.firebaseio.com',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let signInPromise: Promise<void> | null = null;

/**
 * Ensures an anonymous Firebase session exists before any Firestore read/write.
 * Security rules require `isAuthed()` even for the public menu, so every screen
 * awaits this once. Idempotent — concurrent callers share one sign-in.
 */
export function ensureAnonAuth(): Promise<void> {
  if (auth.currentUser) return Promise.resolve();
  if (!signInPromise) {
    signInPromise = signInAnonymously(auth)
      .then(() => undefined)
      .catch((err) => {
        signInPromise = null;
        throw err;
      });
  }
  return signInPromise;
}
