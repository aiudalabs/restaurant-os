/**
 * Wall-clock helpers in the organization's timezone. The server buckets reports
 * by the org timezone (functions/src/reports/get-order-reports.ts), so anything
 * the browser compares with them must use the same zone, not the laptop's.
 */

export const DEFAULT_TIMEZONE = 'America/Panama';

export type WeekdayKey = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
const WEEKDAYS: WeekdayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  const hit = cache.get(tz);
  if (hit) return hit;
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    // Invalid zone string in the org doc: same fallback as the server.
    return formatter(DEFAULT_TIMEZONE);
  }
  cache.set(tz, fmt);
  return fmt;
}

export interface WallClock {
  /** YYYY-MM-DD */
  ymd: string;
  /** Minutes since local midnight. */
  minutes: number;
  weekday: WeekdayKey;
}

export function wallClock(ms: number, tz: string): WallClock {
  const parts: Record<string, string> = {};
  formatter(tz)
    .formatToParts(new Date(ms))
    .forEach((p) => {
      parts[p.type] = p.value;
    });
  const ymd = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { ymd, minutes, weekday: weekdayOf(ymd) };
}

/** Weekday of a calendar date (timezone independent: the date is already local). */
export function weekdayOf(ymd: string): WeekdayKey {
  const [y, m, d] = ymd.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Calendar date shifted by whole days. */
export function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** First and last instant (ISO) of a calendar day in the given zone. */
export function dayRange(ymd: string, tz: string): { start: string; end: string } {
  const [y, m, d] = ymd.split('-').map(Number);
  const instantAt = (h: number, min: number, s: number) => {
    const guess = Date.UTC(y, m - 1, d, h, min, s);
    // Offset of the zone at that instant, then correct once (covers DST changes).
    const wall = wallClock(guess, tz);
    const [wy, wm, wd] = wall.ymd.split('-').map(Number);
    const asUtc = Date.UTC(wy, wm - 1, wd, 0, wall.minutes, 0);
    const offset = asUtc - (guess - (guess % 60_000));
    return guess - offset;
  };
  return {
    start: new Date(instantAt(0, 0, 0)).toISOString(),
    end: new Date(instantAt(23, 59, 59)).toISOString(),
  };
}

/** 13:40 (24 hours, always two-digit hour). */
export function clock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** "HH:mm" or "H:mm" → minutes since midnight, or null if it does not parse. */
export function parseClock(value: string | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h < 24 && m < 60 ? h * 60 + m : null;
}

export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
