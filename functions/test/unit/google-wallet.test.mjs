// Pure tests for the Google Wallet save link (run: cd functions && npm run build && node --test test/unit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildSaveUrl } from '../../lib/loyalty/google-wallet.js';
import { EMPTY_MEMBER } from '../../lib/loyalty/program.js';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

test('save URL carries a verifiable RS256 JWT with the member balance', () => {
  const url = buildSaveUrl({
    issuerId: 'ISSUER',
    siteUrl: 'https://club.example',
    account: { client_email: 'svc@example.iam', private_key: privateKey },
    memberId: 'org1_uid1',
    name: 'Ivo Pérez',
    member: { ...EMPTY_MEMBER, points: 340, stamps: 6, tier: 'plata' },
  });
  const prefix = 'https://pay.google.com/gp/v/save/';
  assert.ok(url.startsWith(prefix));
  const [h, b, s] = url.slice(prefix.length).split('.');
  assert.equal(JSON.parse(Buffer.from(h, 'base64url')).alg, 'RS256');
  assert.ok(crypto.createVerify('RSA-SHA256').update(`${h}.${b}`).verify(publicKey, Buffer.from(s, 'base64url')));
  const p = JSON.parse(Buffer.from(b, 'base64url'));
  assert.equal(p.iss, 'svc@example.iam');
  assert.equal(p.typ, 'savetowallet');
  const obj = p.payload.loyaltyObjects[0];
  assert.equal(obj.id, 'ISSUER.org1_uid1');
  assert.equal(obj.classId, p.payload.loyaltyClasses[0].id);
  assert.equal(obj.loyaltyPoints.balance.int, 340);
  assert.equal(obj.secondaryLoyaltyPoints.balance.string, '6/8');
  assert.equal(obj.barcode.value, 'org1_uid1');
  assert.equal(obj.textModulesData[0].body, 'Plata');
});
