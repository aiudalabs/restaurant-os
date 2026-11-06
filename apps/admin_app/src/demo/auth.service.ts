import type { User } from 'firebase/auth';
import type { AppUser } from '@/types/user';
import { demoUser } from './data';
import { signedOut } from './firebase';

export function subscribeToAuth(callback: (user: User | null) => void) {
  const timer = window.setTimeout(() => callback(signedOut() ? null : ({ uid: demoUser.id } as User)), 0);
  return () => window.clearTimeout(timer);
}

export async function signIn(): Promise<never> {
  throw new Error('El modo demo no inicia sesión. Quita --mode demo para entrar con una cuenta real.');
}

export async function signOut() {
  /* nothing to sign out of */
}

export async function fetchAppUser(): Promise<AppUser | null> {
  return demoUser;
}
