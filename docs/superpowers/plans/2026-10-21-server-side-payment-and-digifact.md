# Server-side payment event + Digifact e-invoicing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One server-side "order paid" event that releases the kitchen, feeds Odoo and emits the Panamanian electronic invoice through Digifact; clients stop writing payments, totals and arbitrary statuses.

**Architecture:** Sprint 1 moves payment and totals behind Cloud Functions (`recordPayment` callable, `onOrderPaid` trigger, server-recomputed totals in `onOrderCreated`) and tightens Firestore rules; the BFF callback becomes just another writer of `payment.status = 'paid'`. Sprint 2 adds a BFF domain `app/fiscal` (Digifact NUC JSON client, fiscal numbering, PDF storage) that `onOrderPaid` calls over HTTP with an internal token, plus admin configuration and customer/waiter UI for the invoice.

**Tech Stack:** firebase-functions 5 (gen1 + v2 Firestore triggers), firebase-admin 12, Firestore rules v2, FastAPI 0.115 + httpx + firebase-admin 6.5, React web apps (Vite), Digifact API V2.0.5 / NUC V2.0.8.

**Spec:** `docs/ARCHITECTURE_REVIEW_2026-10.md` (§1, §5 changes 1–4, 7, 8) and `docs/DIGIFACT_EVALUATION.md` (§2 request, §5 constraints).

## Global Constraints

- Everything is deployed and tested on **dev** only: `scripts/deploy.sh dev …`, `scripts/deploy-bff.sh dev` (`CLOUDSDK_CORE_ACCOUNT=admin@aiudalabs.com`). Never prod.
- No new top-level Firestore collections. Secrets go in the subcollection `organizations/{orgId}/private/{doc}` (documented in `FIREBASE_SCHEMA.md`, server-only rules).
- No new npm/pip dependencies without asking. `axios` already exists in functions; `httpx` in the BFF.
- Payment status vocabulary: `payment.status ∈ 'pending' | 'paid' | 'failed' | null`; `payment.method ∈ 'cash' | 'card' | 'yappy' | 'transfer' | null`. `'approved'` / `'rejected'` disappear.
- Money is rounded to cents with half-up rounding everywhere (functions `round2`, BFF `Decimal.quantize(CENT, ROUND_HALF_UP)`).
- Digifact credentials and the test password are never written to any file in the repo, logs or memory. Test RUC `155704849-2-2021`, DV `32`, branch code `0001` are public values from Digifact's docs.
- Commits reference the GitHub issue: sprint 1 → `Closes #67`, sprint 2 → `Closes #68` (numbers created in Task 0).

## Review Focus

1. A waiter taps Cobrar twice (double tap, slow network): the second call must return `already_paid` without a second `paidAt` or a second invoice. Test in Task 1 (`recordPayment twice → second returns {status:'already_paid'}`) and Task 12 (`issue_invoice` on an order whose `fiscal.status` is `issued` returns the stored CUFE).
2. Customer order created with tampered `total` (0.01) and `payment.status:'paid'`: rules must reject the `paid` field and `onOrderCreated` must overwrite the total from product prices. Tests in Task 4 (rules) and Task 5 (recompute).
3. Digifact returns `3000 / 1002 Documento duplicado` after a timeout (request reached them, response lost): the service must look the document up by `NumeroDF` and reconcile instead of burning a new number. Test in Task 12 (`_reconcile_duplicate`).
4. Order paid before fiscal configuration exists (org `fiscal.enabled` false or missing CPBS): the payment must succeed and the order must simply carry no `fiscal` block, never `fiscal.status:'error'` spam. Test in Task 13 (`onOrderPaid` skips when `fiscal.enabled !== true`) and Task 12 (`build_nuc` raises `FiscalConfigError` with the missing field name).
5. Card callback for an order that is not `pending_payment` (already paid by cash, or cancelled): must be ignored, never flip it to `confirmed`/`payment_failed`. Test in Task 3.

---

## Sprint 1 — server-side payment event (branch `feat/issue-67-server-side-payment`)

### Task 0: GitHub issues and branch

- [ ] Create issue S1 "Pago en servidor: recordPayment + onOrderPaid + reglas con validación de campos" (labels `app:firebase`, `app:waiter`, `app:bff`) and issue S2 "Factura electrónica Digifact (fase 1, consumidor final)" (labels `app:bff`, `app:admin`, `app:client`, `app:firebase`) in `aiudalabs/restaurant-os`; comment "🚧 En progreso" on S1.
- [ ] `git checkout -b feat/issue-67-server-side-payment` from `main`.

### Task 1: `markOrderPaid` helper + `recordPayment` callable

**Files:**
- Create: `functions/src/payments/mark-paid.ts`
- Create: `functions/src/payments/record-payment.ts`
- Modify: `functions/src/payments/confirm-manual-payment.ts` (use the helper; drop the RTDB mirror, Task 2 moves it)
- Modify: `functions/src/index.ts` (export `recordPayment`)
- Test: `functions/test/emulator/payment.e2e.mjs` (new suite `payment` in `scripts/test-emulators.sh`)

**Interfaces:**
- Produces `markOrderPaid(tx: FirebaseFirestore.Transaction, ref: DocumentReference, order: DocumentData, p: { method: PaymentMethod; uid: string; now: Timestamp; confirmationNumber?: string; invoiceRequest?: InvoiceRequest }): 'paid' | 'already_paid'` — writes `payment.method/status/paidAt/recordedBy[/confirmationNumber]`, `updatedAt`, and `status:'confirmed'` only when the order was `pending_payment`; writes `invoiceRequest` when given; returns `'already_paid'` without writing when `payment.status === 'paid'`.
- Produces type `InvoiceRequest = { taxId: string; dv?: string; name: string; email?: string; receiverType: '01' | '02' }` (exported from `mark-paid.ts`).
- Produces callable `recordPayment({ orderId, method, invoiceRequest? })` → `{ status: 'paid' | 'already_paid' }`. Allowed callers: users doc role in `['admin','manager','waiter']`, same `orgId`. Allowed order statuses: anything except `cancelled`, `closed`, `payment_failed`; `pending_payment` is allowed only when `method !== 'card'` (in-person payment of a link order).

- [ ] Write `payment.e2e.mjs`: seeds `users/wA {orgId:'A', role:'waiter'}`, `orders/o1 {orgId:'A', status:'confirmed', total:21.4, payment:{method:null,status:'pending'}}`; cases: `recordPayment` by `wA` → `{status:'paid'}` and `orders/o1.payment.status === 'paid'`, `payment.recordedBy === 'wA'`; second call → `{status:'already_paid'}` and `paidAt` unchanged; waiter of org B → `error: 'NOT_FOUND'`; `method:'card'` on a `pending_payment` order → `error: 'FAILED_PRECONDITION'`.
- [ ] Run `scripts/test-emulators.sh payment` → FAIL (callable not found).
- [ ] Implement `mark-paid.ts` and `record-payment.ts`; refactor `confirmManualPayment` to call `markOrderPaid` inside its transaction (keep its Yappy-only precondition and the `received:false → cancelled, payment.status:'failed'` branch; remove the RTDB mirror block).
- [ ] Run `scripts/test-emulators.sh payment yappy` → all passed.
- [ ] Commit `feat(firebase): recordPayment callable + markOrderPaid helper`.

### Task 2: `onOrderPaid` trigger (KDS release + audit)

**Files:**
- Create: `functions/src/payments/on-order-paid.ts`
- Modify: `functions/src/orders/kds-ticket.ts` (add `releaseToKds`)
- Modify: `functions/src/index.ts`
- Test: extend `payment.e2e.mjs` and `yappy.e2e.mjs`

**Interfaces:**
- Produces `releaseToKds(db: Firestore, orderId: string, order: DocumentData): Promise<number>` in `kds-ticket.ts`: mirrors every `order_items` with a `stationId` to RTDB using `kdsTicketKey/kdsTicket`, returns the count. Idempotent (same keys).
- Produces trigger `onOrderPaid = onDocumentUpdated('orders/{orderId}')` (v2) firing when `before.payment?.status !== 'paid' && after.payment?.status === 'paid'`. Steps: if `before.status === 'pending_payment'` → `releaseToKds`; write `audit_log` doc `{ orgId, type:'order_paid', orderId, method, amount:total, by: payment.recordedBy ?? 'bff', at }`; call `requestInvoice(orderId, after)` (stub returning `false` until Task 13).

- [ ] Add case to `yappy.e2e.mjs`: after `confirmManualPayment(received:true)` the RTDB ticket `order_items/S1/<orderId>_<itemId>` appears (via `waitFor`), proving the mirror now comes from the trigger.
- [ ] Add case to `payment.e2e.mjs`: `recordPayment` on a `pending_payment` cash order → order becomes `confirmed` and the RTDB ticket appears; `audit_log` has one `order_paid` doc for it.
- [ ] Run → FAIL. Implement. Run → all passed.
- [ ] Commit `feat(firebase): onOrderPaid trigger releases KDS and audits payments`.

### Task 3: BFF payments: amount from the order, status `paid`, callback guarded

**Files:**
- Modify: `apps/fastapi_bff/app/payments/service.py`, `router.py`, `models.py`
- Modify: `apps/fastapi_bff/app/config.py` (`odoo_url: str = ""`, `odoo_db: str = ""`)
- Test: `apps/fastapi_bff/tests/test_payments.py` (new, pure: monkeypatch `service.db` with an in-memory fake exposing `collection().document().get()/update()`)

**Interfaces:**
- `create_payment_link(order_id: str) -> dict`: loads the order; raises `OrderNotPayable(reason)` unless `status == 'pending_payment'`; amount = `order['total']`; description = `f"Pedido {pickupCode or order_id[:8]}"`. `PaymentInitRequest` keeps `amount`/`description` optional and ignored (backwards compatible with the deployed customer_web).
- `handle_callback(form) -> str | None`: ignores (logs, returns order_id) when `status != 'pending_payment'` or `payment.status == 'paid'`; on approval writes `payment: {method:'card', status:'paid', paidAt, confirmationNumber, cardType}` and `status:'confirmed'`; on rejection writes `payment.status:'failed'`, `status:'payment_failed'`. Removes `_route_to_kds` (the trigger does it). Keeps `_sync_to_odoo` (non-blocking) and `_verify_with_paguelofacil`, now actually comparing `expected_amount` when the verify endpoint returns an amount.
- `odoo_client_for_org` returns `None` when neither the org nor the env has Odoo (follows from the empty defaults).

- [ ] Write tests: `test_init_uses_order_total_not_client_amount`, `test_init_rejects_order_not_pending_payment`, `test_callback_ignores_already_paid`, `test_callback_ignores_non_pending_order`, `test_callback_approved_writes_paid_card`, `test_odoo_client_none_without_config`.
- [ ] `cd apps/fastapi_bff && python3.12 -m pytest tests/test_payments.py -v` → FAIL. Implement. → PASS. Also `pytest tests/test_zaveli.py` still passes.
- [ ] Commit `fix(bff): payment amount from the order, callback writes paid, Odoo optional for real`.

### Task 4: Firestore rules with field validation

**Files:**
- Modify: `firestore.rules`
- Modify: `functions/test/emulator/rules.test.mjs` (add order/item cases)

Rules to pin:
- `orders` create: `canCreateInOrg(orgId)` AND `request.resource.data.createdByUid == uid()` AND `status in ['pending','pending_payment']` AND `!('paid' in [payment.status])` (i.e. `payment.status in ['pending', null]`) AND `!('fiscal' in data)` AND `source in ['qr','waiter']`.
- `order_items` create: `createdByUid == uid()` AND `status == 'queued'` AND `stationId == ''`.
- `orders` update by staff (`isManager() || myRole()=='waiter'`): `affectedKeys().hasOnly(['status','updatedAt','completedAt','notes','customerName','tableNumber','invoiceRequest'])` AND `request.resource.data.status in ['confirmed','in_preparation','ready','delivered','closed','cancelled']`. Payment and fiscal fields are server-only.
- `organizations/{orgId}/private/{doc}`: `allow read, write: if false`.

- [ ] Add cases: anonymous creates order with `payment.status:'paid'` → denied; with `status:'confirmed'` → denied; with another `createdByUid` → denied; valid pending order → allowed; waiter updates `payment.status` → denied; waiter sets `status:'closed'` → allowed; waiter sets `total` → denied; admin reads `organizations/A/private/odoo` → denied.
- [ ] Run `scripts/test-emulators.sh rules` → FAIL, implement, → all passed.
- [ ] Commit `fix(firebase): orders/order_items rules validate fields; private org subcollection`.

### Task 5: `onOrderCreated` recomputes totals and mirrors by status

**Files:**
- Modify: `functions/src/orders/on-order-created.ts`
- Create: `functions/src/orders/totals.ts`
- Test: `functions/test/emulator/counter.e2e.mjs` (add a tampered-total case) and a pure test `functions/test/unit/totals.test.mjs` (node:test, run with `node --test functions/test/unit`)

**Interfaces:**
- `computeTotals(items: { productId, quantity, modifiers?: {extraPrice}[] }[], products: Map<string, {price:number}>, taxPercent: number): { subtotal, taxAmount, total, itemCount, lines: { productId, unitPrice, totalPrice }[] }` — `unitPrice = product.price + Σ modifiers.extraPrice`, all `round2`. Unknown productId → throws `UnknownProduct(productId)`.
- `onOrderCreated`: loads `products` by the items' ids (chunks of 30 with `documentId() in`), overwrites order `subtotal/taxAmount/taxPercent/total/itemCount` and each item's `unitPrice/totalPrice` in the same batch; `goesToKdsNow = order.status !== 'pending_payment'` (no `source` gate). Unknown product → order `status:'cancelled'`, `notes` prefixed with `[producto desconocido]`, log error.

- [ ] Write `totals.test.mjs` (3 cases: plain, with modifier, half-up rounding 2 × 1.005 at 7 %) → run → FAIL → implement → PASS.
- [ ] Add e2e case: anonymous order with `total: 0.01` → after trigger `total` equals the product-derived value and the RTDB ticket exists for a `source:'zaveli'`-style order (seed with `source:'zaveli'`).
- [ ] Run suites → all passed. Commit `fix(firebase): server-side totals; KDS mirror by status, not source`.

### Task 6: Clients use the callable

**Files:**
- Modify: `apps/waiter_web/src/lib/api.ts` (`recordPayment` → `httpsCallable('recordPayment')`, signature `recordPayment(orderId, method, invoiceRequest?)`), `apps/waiter_web/src/types.ts` (`PaymentMethod` adds `'transfer'`; `InvoiceRequest`), `apps/waiter_web/src/components/OrderCard.tsx` (handle `already_paid` silently)
- Modify: `apps/customer_web/src/types.ts` (drop `'paid'` and keep `'payment_failed'` in `OrderStatus`; add `fiscal?: FiscalInfo`), `apps/customer_web/src/screens/TrackingScreen.tsx` (remove `'paid'` from STEPS)
- Modify: `apps/admin_app/src/types/order.ts` (`PaymentMethod` adds `'transfer'`, `source` adds `'zaveli'`; remove `'paid'` status)

- [ ] `cd apps/waiter_web && npm run build`, same for customer_web and admin_app → clean.
- [ ] Commit `feat(waiter): cobrar via recordPayment callable`.

### Task 7: BFF hygiene (claims, cache, recoverOrder limit)

**Files:**
- Modify: `apps/fastapi_bff/app/catalog/service.py` (`_products_cache: dict[str, tuple[float, list]]` keyed by org), `apps/fastapi_bff/app/core/security.py` (`org_of(user) = user.get('orgId') or user.get('org_id')`), callers in `catalog/router.py`, `ai/*`
- Modify: `functions/src/orders/recover-order.ts`: RTDB counter `recover_attempts/{uid}` `{count, windowStart}`; > 10 attempts per hour → `resource-exhausted`; `database.rules.json` unchanged (server-only path, default deny).
- Test: `apps/fastapi_bff/tests/test_catalog_cache.py` (two orgs, two caches); add case to `payment.e2e.mjs`? No — `recoverOrder` limit case goes in `counter.e2e.mjs` (11 calls → last returns `RESOURCE_EXHAUSTED`).

- [ ] Tests → FAIL → implement → PASS. Commit `fix(bff,firebase): per-org catalog cache, claim names, recoverOrder rate limit`.

### Task 8: Odoo secrets to the private subdoc + docs

**Files:**
- Modify: `apps/fastapi_bff/app/core/odoo.py` `resolve_odoo_config`: read `organizations/{orgId}/private/odoo` first, then the legacy org fields.
- Create: `tools/migrate_org_private.py` (ROS_PROJECT required; moves `odooUrl/odooDb/odooUser/odooPassword` into `private/odoo` and deletes them from the org doc; dry-run by default).
- Modify: `FIREBASE_SCHEMA.md` (Order: `source`, `pickupCode`, `customerName`, `createdByUid`, `payment.recordedBy`, `invoiceRequest`, `fiscal`; statuses; `organizations/{orgId}/private/*`), `docs/PAYMENTS.md` (§2 flow: `paid` + trigger), `docs/INTEGRATION_ARCHITECTURE.md` §4 (real endpoints).
- [ ] Run migration in dry-run against dev; apply. Commit `docs: schema + payments reflect the server-side payment event`.

### Task 9: Deploy sprint 1 to dev and smoke test

- [ ] `scripts/deploy.sh dev rules`, `scripts/deploy.sh dev functions`, `scripts/deploy.sh dev hosting:waiter,hosting:customer,hosting:admin`, `CLOUDSDK_CORE_ACCOUNT=admin@aiudalabs.com scripts/deploy-bff.sh dev`.
- [ ] Smoke on dev with org El Fogon (`07OfcB2trnuJlb7XBIZn`, branch `rnYMQIjihcRQYFwCmPND`): create a link order (customer web `?branch=`), Cobrar in waiter web, verify `payment.status='paid'`, `recordedBy`, audit_log, dashboard revenue.
- [ ] Comment on S1 "✅ Completado — …", push, open PR to `main`.

---

## Sprint 2 — Digifact e-invoicing, phase 1 (branch `feat/issue-68-digifact-fiscal`, on top of sprint 1)

### Task 10: Fiscal data model + admin configuration

**Files:**
- Modify: `FIREBASE_SCHEMA.md` (Organization `fiscal`, Branch `fiscal`, Product `fiscal`)
- Modify: `apps/admin_app/src/types/{organization,branch,product}.ts`
- Create: `apps/admin_app/src/features/settings/SettingsPage.tsx` (route `/settings`, admin only) — org fiscal form + Digifact credentials form
- Create: `apps/admin_app/src/services/organization.service.ts` (`watchOrganization`, `updateOrganizationFiscal`)
- Modify: `apps/admin_app/src/router/index.tsx`, `apps/admin_app/src/layouts/admin-layout.tsx` (nav entry "Facturación")
- Modify: `apps/admin_app/src/features/branches/BranchesPage.tsx` (section "Datos fiscales de la sucursal"), `apps/admin_app/src/features/menu/ProductFormDialog.tsx` (fields `cpbsAbr`, `cpbsCmp`, `taxCode` select `00 Exento / 01 7 %`)
- Create: `functions/src/organizations/set-fiscal-credentials.ts` (callable, admin: writes `organizations/{orgId}/private/digifact {username, password, updatedAt}`; never returns them; `{configured: boolean}` via a second callable `getFiscalStatus`)

Data to pin (`FIREBASE_SCHEMA.md`):
```
Organization.fiscal?: {
  enabled: boolean; provider: 'digifact'; env: 'test' | 'prod';
  ruc: string; dv: string; taxIdType: '1' | '2'; legalName: string; phone?: string;
  defaultCpbsAbr: string; defaultCpbsCmp: string; defaultTaxCode: '00' | '01';
}
Branch.fiscal?: {
  branchCode: string /* '0001' */; billingPoint: string /* '001' */; nextNumber: number /* ≥1 */;
  codUbi: string /* '8-8-12' */; coords: string /* '+8.9213,-79.7068' */;
  address: string; city: string; district: string; state: string;
}
Product.fiscal?: { cpbsAbr?: string; cpbsCmp?: string; taxCode?: '00' | '01' }
Order.invoiceRequest?: { receiverType: '01'|'02'; taxId: string; dv?: string; name: string; email?: string }
Order.fiscal?: {
  status: 'pending' | 'issuing' | 'issued' | 'error' | 'skipped';
  numeroDF?: string; billingPoint?: string; codigoSeguridad?: string;
  cufe?: string; qrUrl?: string; pdfPath?: string; xmlPath?: string; docGuid?: string;
  issuedAt?: Timestamp; attempts: number; lastError?: string;
}
organizations/{orgId}/private/digifact: { username: string; password: string; token?: string; tokenExpiresAt?: Timestamp }
```
- [ ] Implement types, services, pages, callable. `npm run build` + `npm run lint` in admin_app clean; `cd functions && npm run build` clean.
- [ ] Commit `feat(admin): configuración fiscal (org, sucursal, producto) y credenciales Digifact`.

### Task 11: BFF Digifact client

**Files:**
- Create: `apps/fastapi_bff/app/fiscal/__init__.py`, `digifact.py`, `models.py`
- Modify: `apps/fastapi_bff/app/config.py` (`internal_token: str = ""`, `digifact_test_url = "https://testnucpa.digifact.com/api"`, `digifact_prod_url = "https://nucpa.digifact.com/api"`)
- Test: `apps/fastapi_bff/tests/test_digifact_client.py` (httpx `MockTransport`)

**Interfaces:**
- `class DigifactClient(base_url: str, ruc: str, username: str, password: str, token: str | None = None)`
  - `get_token() -> tuple[str, datetime]` POST `/login/get_token` body `{"Username": f"PA.{ruc}.{username}", "Password": password}`.
  - `certify(nuc: dict, formats: str = "PDF|XML") -> CertifyResult` POST `/v2/transform/nuc_json?TAXID=&FORMAT=&USERNAME=`; raises `DigifactDuplicate` when `code == 3000` and any `infoDetails[].dCodRes == '1002'`; raises `DigifactError(code, message, details)` for any other `code != 1`; retries once on 401 after refreshing the token.
  - `get_by_number(numero_df: str, doc_type: str = "01") -> dict | None` via `SHAREDINFO ... SHARED_GETDTEINFO_BYNUMDOC`.
  - `cancel(cufe: str, reason: str) -> bool` POST `/CancelFePA` (prod-only per docs; implemented, untested).
- `CertifyResult = { cufe, qr_url, pdf: bytes | None, xml: bytes | None, doc_guid, issued_at: str }`.

- [ ] Tests: token username format, certify success parsing (base64 → bytes), duplicate → `DigifactDuplicate`, other code → `DigifactError`, 401 refresh. → FAIL → implement → PASS.
- [ ] Commit `feat(bff): cliente Digifact (token, certificar, consultar, anular)`.

### Task 12: NUC builder + invoice service + endpoints

**Files:**
- Create: `apps/fastapi_bff/app/fiscal/nuc.py`, `service.py`, `router.py`
- Modify: `apps/fastapi_bff/app/main.py` (include router), `apps/fastapi_bff/app/core/security.py` (`require_internal_token` dependency: header `X-Internal-Token == settings.internal_token`)
- Modify: `storage.rules` (`orgs/{orgId}/invoices/{file}`: `allow read: if true; allow write: if false`)
- Test: `apps/fastapi_bff/tests/test_nuc.py`, `tests/test_fiscal_service.py`

**Interfaces:**
- `build_nuc(order: dict, items: list[dict], org: dict, branch: dict, products: dict[str, dict], numero_df: str, codigo_seguridad: str, issued_at: datetime, env: str) -> dict` — pure. Rules: `AdditionalIssueType` 2 for env test, 1 for prod; buyer from `order.invoiceRequest` (receiverType 01 with `TaxID`, `DigitoVerificador`) else CF (`TaxID:'CF'`, `TipoReceptor:'02'`, `PaisReceptorFE:'PA'`, address copied from branch); one `Items[]` entry per order item with `Codes` `CodigoProd=productId`, `CodCPBSabr/cmp` from product.fiscal or org defaults, `Qty`, `UnitOfMeasure:'und'`, `Price=unitPrice`, ITBMS tax `Code` from product/org `taxCode` with `Amount = round2(line * rate)` (rate 0.07 for `01`, 0 for `00`), `Totals` per item; `Totals.GrandTotal` from the sum of lines (must equal order.total ± 0.01 else raise `FiscalTotalsMismatch`); `Payments[{Type, Amount:total}]` with `Type`: cash→`02`, card→`03`, yappy/transfer→`08`; `TiempoPago:'1'`. Missing org/branch fields raise `FiscalConfigError(field)`.
- `allocate_number(branch_ref) -> tuple[str, str]` Firestore transaction: reads `branch.fiscal.nextNumber`, writes `nextNumber + 1`, returns (`f"{n:010d}"`, `codigo_seguridad` random 9 digits ≠ number).
- `issue_invoice(order_id: str) -> dict` (returns the `fiscal` block):
  1. load order/org/branch; if `org.fiscal.enabled != True` → write `fiscal.status:'skipped'` and return.
  2. if `order.fiscal.status == 'issued'` → return it (idempotent).
  3. if `order.fiscal.numeroDF` missing → `allocate_number` and write `fiscal {status:'issuing', numeroDF, billingPoint, codigoSeguridad, attempts:+1}` **before** calling Digifact; else reuse the stored number (retry path).
  4. `certify`; on success upload PDF/XML to Storage `orgs/{orgId}/invoices/{cufe}.pdf|.xml` (firebase_admin storage bucket), write `fiscal {status:'issued', cufe, qrUrl, pdfPath, xmlPath, docGuid, issuedAt}`.
  5. on `DigifactDuplicate` → `get_by_number` → if found write `issued` with its CUFE (`_reconcile_duplicate`), else `error`.
  6. on any other error → `fiscal {status:'error', lastError}`; never raise to the caller (HTTP 200 with the block).
- Endpoints: `POST /fiscal/orders/{order_id}/invoice` (internal token OR staff ID token of the order's org, role admin/manager/waiter) → `fiscal` block; `GET /fiscal/orders/{order_id}` same auth → `fiscal` block; `POST /fiscal/orders/{order_id}/retry` (staff) → re-runs `issue_invoice`.

- [ ] Tests for `build_nuc` (CF, RUC buyer, exempt item, totals mismatch, missing CPBS → `FiscalConfigError('cpbs')`), `allocate_number` format, `issue_invoice` with a fake client (success path writes `issued`; duplicate path reconciles; error path writes `error` and keeps `numeroDF`). → FAIL → implement → PASS.
- [ ] Commit `feat(bff): emisión de factura electrónica (NUC, numeración, Storage)`.

### Task 13: `onOrderPaid` → BFF, customer and waiter UI

**Files:**
- Modify: `functions/src/payments/on-order-paid.ts` (`requestInvoice`: when `org.fiscal?.enabled === true`, write `fiscal.status:'pending'` and `POST ${BFF_URL}/fiscal/orders/{id}/invoice` with `X-Internal-Token`; log and ignore failures; BFF retries are manual), `functions/src/payments/config.ts` (`defineString('BFF_URL')`, `defineSecret('BFF_INTERNAL_TOKEN')`), `functions/.env.restaurant-os-dev-49096` (`BFF_URL=`), Secret Manager `BFF_INTERNAL_TOKEN` in dev (`firebase functions:secrets:set`, value generated with `openssl rand -hex 32`, same value in `deploy/env/dev.secrets.env` as `INTERNAL_TOKEN`)
- Modify: `apps/customer_web/src/screens/CartScreen.tsx` (toggle "Quiero factura con RUC" → `invoiceRequest` fields ruc, dv, nombre, email, written on create), `TrackingScreen.tsx` (card "Factura electrónica": CUFE, link QR DGI, button "Descargar PDF" → Storage public URL `https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?alt=media`; states `pending/issuing` → "Generando factura…", `error` → "No se pudo generar la factura, pídela en caja"), `types.ts` (`FiscalInfo`, `invoiceRequest`), `lib/api.ts` (`mapOrder` reads `fiscal`)
- Modify: `apps/waiter_web/src/components/PaymentSheet.tsx` (collapsible "Factura con RUC": ruc, dv, nombre → `InvoiceRequest`), `OrderCard.tsx` (after paid: fiscal status chip + "Ver factura" link), `lib/api.ts` (`mapOrder` reads `fiscal`), `types.ts`
- Modify: `apps/admin_app/src/features/orders/OrdersPage.tsx` (fiscal chip, "Ver PDF", "Reintentar" → `POST /fiscal/orders/{id}/retry` with ID token via a new `fiscal.service.ts`)

- [ ] Emulator case (`payment.e2e.mjs`): org with `fiscal.enabled:false` → after `recordPayment` the order has no `fiscal` field; with `enabled:true` and no BFF reachable → `fiscal.status === 'pending'` (request failed, logged).
- [ ] Builds clean for the three web apps and functions. Commit `feat(client,waiter,admin,firebase): factura electrónica en pago, seguimiento y pedidos`.

### Task 14: Deploy sprint 2 to dev, configure the demo org, end-to-end test

- [ ] Deploy: rules (Storage too), functions (with secret), hosting admin/customer/waiter, BFF with `INTERNAL_TOKEN`.
- [ ] In the dev admin as `admin@aiudalabs.com`, org El Fogon: Facturación → RUC `155704849-2-2021`, DV `32`, tipo `2`, razón social "FE generada en ambiente de pruebas - sin valor comercial ni fiscal", env `test`, CPBS por defecto `50` / `5019`, tasa `01`; Digifact user `PICK&EAT` + password (typed by hand, never stored in the repo). Branch El Fogon → código `0001`, punto `001`, `codUbi` `8-8-12`, coords `+8.9213,-79.7068`, dirección "Blv Costa del Este, PH Financial Tower Piso 17" / Juan Diaz / Panama / Panama, `nextNumber` from a random 7-digit start (test tenant is shared; avoid collisions).
- [ ] Flow: link order → Cobrar efectivo in waiter → `fiscal.status` becomes `issued`, PDF opens from tracking; second order with RUC `155704849-2-2021` DV `32` → receiver 01. Retry path: temporarily wrong password → `error` → fix → Reintentar → `issued`.
- [ ] Comment on S2, push, open PR. Report to the user what to test from the dev UIs.
