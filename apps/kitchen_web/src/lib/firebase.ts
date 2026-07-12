import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

// Public Firebase web config for restaurant-os-68c79 (governed by security rules).
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
export const rtdb = getDatabase(app);
export const functions = getFunctions(app, 'us-central1');
export const auth = getAuth(app);
