import { describe, expect, it, vi } from 'vitest';

// club.ts imports firebase at module load; the helpers under test are pure.
vi.mock('./firebase', () => ({ auth: {}, db: {}, functions: {}, ensureAnonAuth: async () => undefined }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), doc: vi.fn(), onSnapshot: vi.fn(), query: vi.fn(), where: vi.fn() }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));

import {
  CHALLENGES,
  EMPTY_MEMBER,
  TIERS,
  challengeProgress,
  memberId,
  monthKeyNow,
  nextTier,
  tierOf,
  weekIndexNow,
  type Member,
} from './club';

const member = (over: Partial<Member>): Member => ({ ...EMPTY_MEMBER, ...over });

describe('tiers', () => {
  it('are ordered by spend and earn more points per balboa', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].minSpend).toBeGreaterThan(TIERS[i - 1].minSpend);
      expect(TIERS[i].pointsPerBalboa).toBeGreaterThan(TIERS[i - 1].pointsPerBalboa);
    }
  });
  it('tierOf finds a tier and falls back to bronce for unknown ids', () => {
    expect(tierOf('oro').minSpend).toBe(150);
    expect(tierOf('platino' as never).id).toBe('bronce');
  });
  it('nextTier walks up and is null at the top', () => {
    expect(nextTier('bronce')?.id).toBe('plata');
    expect(nextTier('plata')?.id).toBe('oro');
    expect(nextTier('oro')).toBeNull();
  });
  it('spend still needed for the next tier is derived from minSpend', () => {
    const m = member({ lifetimeSpend: 30, tier: 'bronce' });
    const next = nextTier(m.tier);
    expect(next && next.minSpend - m.lifetimeSpend).toBe(20);
  });
});

describe('memberId', () => {
  it('joins org and uid', () => {
    expect(memberId('org1', 'u9')).toBe('org1_u9');
  });
});

describe('Panama calendar (UTC-5, weeks start Monday)', () => {
  // 2024-01-01 is a Monday. Panama midnight = 05:00Z.
  const mondayStart = new Date('2024-01-01T05:00:00Z');

  it('week changes exactly at Panama midnight on Monday', () => {
    const before = weekIndexNow(new Date('2024-01-01T04:59:59Z'));
    expect(weekIndexNow(mondayStart)).toBe(before + 1);
    expect(weekIndexNow(new Date('2024-01-08T04:59:59Z'))).toBe(before + 1);
    expect(weekIndexNow(new Date('2024-01-08T05:00:00Z'))).toBe(before + 2);
  });

  it('uses the Panama date, not UTC, near midnight', () => {
    // 2024-02-01T02:00Z is still 31 Jan 21:00 in Panama.
    expect(monthKeyNow(new Date('2024-02-01T02:00:00Z'))).toBe('2024-01');
    expect(monthKeyNow(new Date('2024-02-01T05:00:00Z'))).toBe('2024-02');
  });
});

describe('challengeProgress', () => {
  const now = new Date('2024-03-13T15:00:00Z');
  const week = weekIndexNow(now);
  const month = monthKeyNow(now);

  it('is all zero for the empty member', () => {
    expect(challengeProgress(EMPTY_MEMBER, now)).toEqual({ visits: 0, dishes: 0, streak: 0 });
  });

  it('counts this week visits and this month distinct dishes', () => {
    const p = challengeProgress(member({ weekIndex: week, weekVisits: 2, monthKey: month, monthProducts: ['a', 'b', 'c'] }), now);
    expect(p).toMatchObject({ visits: 2, dishes: 3 });
  });

  it('ignores visits from an older week and dishes from another month', () => {
    const p = challengeProgress(member({ weekIndex: week - 1, weekVisits: 3, monthKey: '2024-02', monthProducts: ['a'] }), now);
    expect(p).toMatchObject({ visits: 0, dishes: 0 });
  });

  it('streak is kept if the last active week was this or last week, reset otherwise', () => {
    expect(challengeProgress(member({ weekIndex: week, streakWeeks: 2 }), now).streak).toBe(2);
    expect(challengeProgress(member({ weekIndex: week - 1, streakWeeks: 2 }), now).streak).toBe(2);
    expect(challengeProgress(member({ weekIndex: week - 2, streakWeeks: 2 }), now).streak).toBe(0);
  });

  it('streak wraps per cycle but a completed cycle shows full, not 0', () => {
    const t = CHALLENGES.streak.target;
    expect(challengeProgress(member({ weekIndex: week, streakWeeks: t }), now).streak).toBe(t);
    expect(challengeProgress(member({ weekIndex: week, streakWeeks: t + 1 }), now).streak).toBe(1);
    expect(challengeProgress(member({ weekIndex: week, streakWeeks: 2 * t }), now).streak).toBe(t);
  });
});
