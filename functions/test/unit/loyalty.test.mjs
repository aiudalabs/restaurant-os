// Pure tests for the Club award rules (run: cd functions && npm run build && node --test test/unit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOrder, EMPTY_MEMBER, weekIndexOf, monthKeyOf, tierFor } from '../../lib/loyalty/program.js';

// Mon 2026-10-19 12:00 Panama (UTC-5) = 17:00Z
const at = (day, hour = 12) => new Date(Date.UTC(2026, 9, day, hour + 5));

test('first order: 1 point per balboa at bronce, one stamp, no bonus', () => {
  const r = applyOrder(EMPTY_MEMBER, { total: 17.5, productIds: ['a'], at: at(19) });
  assert.equal(r.points, 17);
  assert.equal(r.member.points, 17);
  assert.equal(r.member.stamps, 1);
  assert.equal(r.member.visits, 1);
  assert.equal(r.member.tier, 'bronce');
  assert.deepEqual(r.bonuses, []);
});

test('tier rate applies to the order placed after the tier is reached', () => {
  let m = { ...EMPTY_MEMBER, lifetimeSpend: 40, tier: 'bronce' };
  let r = applyOrder(m, { total: 20, productIds: ['a'], at: at(19) });
  assert.equal(r.points, 20); // still bronce when ordering
  assert.equal(r.member.tier, 'plata'); // 60 lifetime
  r = applyOrder(r.member, { total: 20, productIds: ['a'], at: at(19) });
  assert.equal(r.points, 25); // plata 1.25
});

test('8th stamp issues the free-bowl voucher and resets the card', () => {
  let m = { ...EMPTY_MEMBER, stamps: 7 };
  const r = applyOrder(m, { total: 10, productIds: ['a'], at: at(19) });
  assert.equal(r.member.stamps, 0);
  assert.deepEqual(r.vouchers, [{ id: 'bowl-sellos', name: 'Bowl del día gratis' }]);
});

test('3 visits in one week pay +50 once', () => {
  let m = EMPTY_MEMBER;
  const out = [];
  for (const day of [19, 20, 21, 22]) {
    const r = applyOrder(m, { total: 10, productIds: ['a'], at: at(day) });
    out.push(r.bonuses.map((b) => b.key));
    m = r.member;
  }
  assert.deepEqual(out, [[], [], ['visitas-semana'], []]);
});

test('3 distinct dishes in a month pay +80 once', () => {
  let m = EMPTY_MEMBER;
  let r = applyOrder(m, { total: 10, productIds: ['a', 'b'], at: at(19) });
  assert.deepEqual(r.bonuses, []);
  r = applyOrder(r.member, { total: 10, productIds: ['b', 'c'], at: at(20) });
  assert.deepEqual(r.bonuses.map((b) => b.key), ['platos-mes']);
  r = applyOrder(r.member, { total: 10, productIds: ['d'], at: at(21) });
  assert.deepEqual(r.bonuses.map((b) => b.key).filter((k) => k === 'platos-mes'), []);
});

test('4 consecutive weeks pay +120; a gap resets the streak', () => {
  let m = EMPTY_MEMBER;
  const keys = [];
  for (const day of [5, 12, 19, 26]) {
    const r = applyOrder(m, { total: 10, productIds: ['a'], at: at(day) });
    keys.push(r.bonuses.map((b) => b.key));
    m = r.member;
  }
  assert.deepEqual(keys[3], ['racha']);
  assert.equal(m.streakWeeks, 4);
  const gap = applyOrder(m, { total: 10, productIds: ['a'], at: new Date(Date.UTC(2026, 10, 16, 17)) }); // 3 weeks later
  assert.equal(gap.member.streakWeeks, 1);
});

test('weeks start on Monday in Panama time; Sunday 23:30 local is still the old week', () => {
  assert.equal(weekIndexOf(at(19, 0)), weekIndexOf(at(25, 23))); // Mon 00:00 .. Sun 23:00
  assert.equal(weekIndexOf(at(25, 23)) + 1, weekIndexOf(at(26, 0)));
  assert.equal(monthKeyOf(new Date(Date.UTC(2026, 10, 1, 3))), '2026-10'); // Oct 31 22:00 local
});

test('tierFor thresholds', () => {
  assert.equal(tierFor(49.99), 'bronce');
  assert.equal(tierFor(50), 'plata');
  assert.equal(tierFor(150), 'oro');
});
