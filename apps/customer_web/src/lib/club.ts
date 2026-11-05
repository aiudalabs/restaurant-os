import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, ensureAnonAuth, functions } from './firebase';
import { loadHome } from './home';

// Display mirror of functions/src/loyalty/program.ts. The server decides what is
// earned or redeemable; keep both files in step when the program changes.

export type TierId = 'bronce' | 'plata' | 'oro';

export const TIERS: { id: TierId; label: string; minSpend: number; pointsPerBalboa: number }[] = [
  { id: 'bronce', label: 'Bronce', minSpend: 0, pointsPerBalboa: 1 },
  { id: 'plata', label: 'Plata', minSpend: 50, pointsPerBalboa: 1.25 },
  { id: 'oro', label: 'Oro', minSpend: 150, pointsPerBalboa: 1.5 },
];

export const STAMP_GOAL = 8;

export const REWARDS: { id: string; name: string; cost: number; icon: 'dessert' | 'juice' | 'bowl' | 'box' }[] = [
  { id: 'postre', name: 'Postre del día gratis', cost: 100, icon: 'dessert' },
  { id: 'jugo-verde', name: 'Jugo verde gratis', cost: 90, icon: 'juice' },
  { id: 'bowl', name: 'Bowl del día gratis', cost: 250, icon: 'bowl' },
  { id: 'almuerzo-dos', name: 'Almuerzo para dos', cost: 600, icon: 'box' },
];

export const CHALLENGES = {
  visits: { target: 3, points: 50 },
  dishes: { target: 3, points: 80 },
  streak: { target: 4, points: 120 },
};

export interface Member {
  points: number;
  stamps: number;
  lifetimeSpend: number;
  visits: number;
  tier: TierId;
  name?: string;
  weekIndex: number;
  weekVisits: number;
  streakWeeks: number;
  monthKey: string;
  monthProducts: string[];
}

export const EMPTY_MEMBER: Member = {
  points: 0, stamps: 0, lifetimeSpend: 0, visits: 0, tier: 'bronce',
  weekIndex: -1, weekVisits: 0, streakWeeks: 0, monthKey: '', monthProducts: [],
};

export interface Voucher {
  code: string;
  rewardName: string;
  status: 'active' | 'used';
}

export interface EarnEvent {
  points: number;
  bonusPoints: number;
  stampsAfter: number;
  stampCompleted: boolean;
}

export const memberId = (orgId: string, uid: string): string => `${orgId}_${uid}`;

// Same calendar as the server (Panama, UTC-5, weeks start on Monday).
const PANAMA_OFFSET_MS = -5 * 3600 * 1000;
export const weekIndexNow = (at = new Date()): number =>
  Math.floor((Math.floor((at.getTime() + PANAMA_OFFSET_MS) / 86400000) + 3) / 7);
export const monthKeyNow = (at = new Date()): string =>
  new Date(at.getTime() + PANAMA_OFFSET_MS).toISOString().slice(0, 7);

/** Restaurant org of this device: the order in progress or the remembered home. */
export function clubOrgId(sessionOrgId?: string): string {
  return sessionOrgId || loadHome()?.orgId || '';
}

export function tierOf(id: TierId) {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

/** Next tier above `id`, or null at the top. */
export function nextTier(id: TierId) {
  const i = TIERS.findIndex((t) => t.id === id);
  return TIERS[i + 1] ?? null;
}

/** Progress of the three challenges for the current week / month. */
export function challengeProgress(m: Member, now = new Date()) {
  const week = weekIndexNow(now);
  return {
    visits: m.weekIndex === week ? m.weekVisits : 0,
    dishes: m.monthKey === monthKeyNow(now) ? m.monthProducts.length : 0,
    streak: m.weekIndex >= week - 1 ? m.streakWeeks % CHALLENGES.streak.target || (m.streakWeeks > 0 ? CHALLENGES.streak.target : 0) : 0,
  };
}

/** Live member doc (or the empty member before the first paid order). */
export function watchMember(orgId: string, cb: (m: Member, loaded: boolean) => void): () => void {
  let unsub = () => {};
  let alive = true;
  ensureAnonAuth()
    .then(() => {
      const uid = auth.currentUser?.uid;
      if (!alive || !uid || !orgId) return cb(EMPTY_MEMBER, true);
      unsub = onSnapshot(
        doc(db, 'loyalty_members', memberId(orgId, uid)),
        (snap) => cb(snap.exists() ? ({ ...EMPTY_MEMBER, ...snap.data() } as Member) : EMPTY_MEMBER, true),
        () => cb(EMPTY_MEMBER, true),
      );
    })
    .catch(() => cb(EMPTY_MEMBER, true));
  return () => {
    alive = false;
    unsub();
  };
}

/** Active vouchers of this customer in this restaurant, newest first. */
export function watchVouchers(orgId: string, cb: (v: Voucher[]) => void): () => void {
  let unsub = () => {};
  let alive = true;
  ensureAnonAuth()
    .then(() => {
      const uid = auth.currentUser?.uid;
      if (!alive || !uid || !orgId) return;
      unsub = onSnapshot(
        query(collection(db, 'loyalty_vouchers'), where('uid', '==', uid), where('orgId', '==', orgId)),
        (snap) => {
          const list = snap.docs
            .map((d) => ({ ...(d.data() as Voucher & { createdAt?: { toMillis(): number } }) }))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
          cb(list.filter((v) => v.status === 'active'));
        },
        () => cb([]),
      );
    })
    .catch(() => cb([]));
  return () => {
    alive = false;
    unsub();
  };
}

/** What this customer earned from one paid order (appears a moment after payment). */
export function watchEarn(orderId: string, cb: (e: EarnEvent | null) => void): () => void {
  let unsub = () => {};
  let alive = true;
  ensureAnonAuth()
    .then(() => {
      const uid = auth.currentUser?.uid;
      if (!alive || !uid) return;
      unsub = onSnapshot(
        query(collection(db, 'loyalty_events'), where('uid', '==', uid), where('orderId', '==', orderId)),
        (snap) => cb(snap.empty ? null : (snap.docs[0].data() as EarnEvent)),
        () => cb(null),
      );
    })
    .catch(() => cb(null));
  return () => {
    alive = false;
    unsub();
  };
}

export async function redeemReward(orgId: string, rewardId: string): Promise<{ code: string; rewardName: string }> {
  await ensureAnonAuth();
  const res = await httpsCallable<{ orgId: string; rewardId: string }, { code: string; rewardName: string }>(
    functions,
    'redeemReward',
  )({ orgId, rewardId });
  return res.data;
}

/** Google Wallet is shown only once the project has its issuer configured (VITE_GOOGLE_WALLET=1). */
export const googleWalletEnabled = import.meta.env.VITE_GOOGLE_WALLET === '1';

export async function googleWalletUrl(orgId: string): Promise<string> {
  await ensureAnonAuth();
  const res = await httpsCallable<{ orgId: string }, { url: string }>(functions, 'googleWalletLink')({ orgId });
  return res.data.url;
}
