import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

// Public Firebase web config for restaurant-os-68c79 (governed by security rules).
const firebaseConfig = {
  apiKey: 'AIzaSyCBCwt3GmpxVcGWH58CULtWRh-4snbJ1IY',
  authDomain: 'restaurant-os-68c79.firebaseapp.com',
  projectId: 'restaurant-os-68c79',
  storageBucket: 'restaurant-os-68c79.firebasestorage.app',
  messagingSenderId: '839468636765',
  appId: '1:839468636765:web:6f029569314405bfb70bb4',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');

// Local testing: `VITE_USE_EMULATORS=true npm run dev` with `firebase emulators:start`.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
