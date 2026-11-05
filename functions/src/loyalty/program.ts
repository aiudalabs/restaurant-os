/**
 * Club Pick & Eat — program rules and the pure award function (issue #75).
 *
 * Rules live in code for v1 (no admin UI yet). The customer app mirrors the
 * display data in apps/customer_web/src/lib/club.ts; the server is the only
 * place that decides what a member earns or can redeem.
 *
 * Deterministic only: every reward is earned by spending or by a challenge,
 * never by chance (Panama requires a Junta de Control de Juegos permit for
 * promotions that depend on luck — docs/LOYALTY_EVALUATION.md §4).
 */

export type TierId = "bronce" | "plata" | "oro";

/** Lifetime spend (B/.) needed for each tier, and the points earned per B/. spent. */
export const TIERS: { id: TierId; minSpend: number; pointsPerBalboa: number }[] = [
  { id: "bronce", minSpend: 0, pointsPerBalboa: 1 },
  { id: "plata", minSpend: 50, pointsPerBalboa: 1.25 },
  { id: "oro", minSpend: 150, pointsPerBalboa: 1.5 },
];

export const STAMP_GOAL = 8;
export const STAMP_REWARD = { id: "bowl-sellos", name: "Bowl del día gratis" };

/** Redeemable with points. Free products only: they never touch an order total or its invoice. */
export const REWARDS: { id: string; name: string; cost: number }[] = [
  { id: "postre", name: "Postre del día gratis", cost: 100 },
  { id: "jugo-verde", name: "Jugo verde gratis", cost: 90 },
  { id: "bowl", name: "Bowl del día gratis", cost: 250 },
  { id: "almuerzo-dos", name: "Almuerzo para dos", cost: 600 },
];

export const CHALLENGE_VISITS = { target: 3, points: 50 }; // visits in one week
export const CHALLENGE_DISHES = { target: 3, points: 80 }; // distinct dishes in one month
export const CHALLENGE_STREAK = { target: 4, points: 120 }; // consecutive weeks with a visit

export interface MemberState {
  points: number;
  stamps: number;
  lifetimeSpend: number;
  visits: number;
  tier: TierId;
  /** Monday-based week index of the last visit counted in weekVisits / streak. */
  weekIndex: number;
  weekVisits: number;
  streakWeeks: number;
  /** 'YYYY-MM' of monthProducts. */
  monthKey: string;
  monthProducts: string[];
}

export const EMPTY_MEMBER: MemberState = {
  points: 0,
  stamps: 0,
  lifetimeSpend: 0,
  visits: 0,
  tier: "bronce",
  weekIndex: -1,
  weekVisits: 0,
  streakWeeks: 0,
  monthKey: "",
  monthProducts: [],
};

export interface Bonus {
  key: string;
  label: string;
  points: number;
}

export interface AwardResult {
  member: MemberState;
  /** Base points for the order (tier rate × total). */
  points: number;
  bonuses: Bonus[];
  /** Reward ids of vouchers to issue (stamp card completed). */
  vouchers: { id: string; name: string }[];
}

const PANAMA_OFFSET_MS = -5 * 3600 * 1000; // UTC-5, no DST

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Days since 1970-01-01 in Panama local time. */
function panamaDay(at: Date): number {
  return Math.floor((at.getTime() + PANAMA_OFFSET_MS) / 86400000);
}

/** Monday-based week number (1970-01-01 was a Thursday). */
export function weekIndexOf(at: Date): number {
  return Math.floor((panamaDay(at) + 3) / 7);
}

export function monthKeyOf(at: Date): string {
  return new Date(at.getTime() + PANAMA_OFFSET_MS).toISOString().slice(0, 7);
}

export function tierFor(lifetimeSpend: number): TierId {
  let tier: TierId = "bronce";
  for (const t of TIERS) if (lifetimeSpend >= t.minSpend) tier = t.id;
  return tier;
}

function rateOf(tier: TierId): number {
  return TIERS.find((t) => t.id === tier)?.pointsPerBalboa ?? 1;
}

/**
 * Applies one paid order to a member. Pure: the caller persists the result and
 * guarantees one call per order (the earn event id is the order id).
 */
export function applyOrder(
  prev: MemberState,
  order: { total: number; productIds: string[]; at: Date },
): AwardResult {
  const m: MemberState = { ...prev, monthProducts: [...prev.monthProducts] };
  const bonuses: Bonus[] = [];
  const vouchers: { id: string; name: string }[] = [];

  // Base points at the tier the member had when ordering.
  const points = Math.floor(order.total * rateOf(m.tier));
  m.points += points;
  m.lifetimeSpend = round2(m.lifetimeSpend + order.total);
  m.visits += 1;

  // Stamp card.
  m.stamps += 1;
  if (m.stamps >= STAMP_GOAL) {
    m.stamps = 0;
    vouchers.push({ ...STAMP_REWARD });
  }

  // Challenge: N visits in one week (once per week).
  const week = weekIndexOf(order.at);
  const newWeek = week !== m.weekIndex;
  if (newWeek) {
    if (m.weekIndex >= 0 && week === m.weekIndex + 1) m.streakWeeks += 1;
    else m.streakWeeks = 1;
    m.weekIndex = week;
    m.weekVisits = 0;
  }
  m.weekVisits += 1;
  if (m.weekVisits === CHALLENGE_VISITS.target) {
    bonuses.push({ key: "visitas-semana", label: `${CHALLENGE_VISITS.target} visitas esta semana`, points: CHALLENGE_VISITS.points });
  }

  // Challenge: streak of consecutive weeks (every Nth week).
  if (newWeek && m.streakWeeks > 0 && m.streakWeeks % CHALLENGE_STREAK.target === 0) {
    bonuses.push({ key: "racha", label: `Racha de ${CHALLENGE_STREAK.target} semanas`, points: CHALLENGE_STREAK.points });
  }

  // Challenge: N distinct dishes in one month (once per month).
  const month = monthKeyOf(order.at);
  if (month !== m.monthKey) {
    m.monthKey = month;
    m.monthProducts = [];
  }
  const before = m.monthProducts.length;
  for (const id of order.productIds) if (!m.monthProducts.includes(id)) m.monthProducts.push(id);
  if (before < CHALLENGE_DISHES.target && m.monthProducts.length >= CHALLENGE_DISHES.target) {
    bonuses.push({ key: "platos-mes", label: `Probaste ${CHALLENGE_DISHES.target} platos distintos`, points: CHALLENGE_DISHES.points });
  }

  m.points += bonuses.reduce((s, b) => s + b.points, 0);
  m.tier = tierFor(m.lifetimeSpend);
  return { member: m, points, bonuses, vouchers };
}

/** loyalty_members/{orgId}_{uid}: one member per restaurant org and customer session. */
export const memberId = (orgId: string, uid: string): string => `${orgId}_${uid}`;
