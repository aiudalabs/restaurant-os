import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Public Firebase web config of the environment: apps/<app>/.env.<projectId> (docs/ENVIRONMENTS.md).
// The web API key is not a secret — access is governed by Firestore security
// rules. Inlined so the demo build works without extra env setup.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');

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
