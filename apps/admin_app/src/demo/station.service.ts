import type { Station } from '@/types/station';
import { demoStations } from './data';

export function watchStations(_orgId: string, _branchId: string, callback: (stations: Station[]) => void) {
  const timer = window.setTimeout(() => callback(demoStations), 80);
  return () => window.clearTimeout(timer);
}

export async function createStation(): Promise<string> {
  throw new Error('El modo demo es de solo lectura.');
}

export async function updateStation() {
  throw new Error('El modo demo es de solo lectura.');
}

export async function deleteStation() {
  throw new Error('El modo demo es de solo lectura.');
}

export async function toggleStation() {
  throw new Error('El modo demo es de solo lectura.');
}
