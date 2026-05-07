# Pending Flutter Changes — Milestone 2

Changes to implement in the next sprint once the FastAPI BFF (Milestone 1) is stable.

---

## Waiter App — Auth migration

**Current state:** login screen posts directly to Firebase Auth with email/password.

**Required change:** replace with BFF auth flow.

```dart
// Before:
await FirebaseAuth.instance.signInWithEmailAndPassword(email, password);

// After:
final res = await http.post('$BFF_URL/auth/login',
  body: jsonEncode({'username': pin, 'password': pin}));
final token = res.json()['firebase_token'];
await FirebaseAuth.instance.signInWithCustomToken(token);
```

**What to update:**
- `apps/waiter_app/lib/features/auth/login_screen.dart` — replace auth call
- `apps/waiter_app/lib/features/auth/session_provider.dart` — read `role`,
  `branch_id`, `org_id` from `FirebaseAuth.instance.currentUser.getIdTokenResult()`
- Store `role` in provider so routing guards can use it

**What does NOT change:** everything else. The app already reads orders from
Firestore directly — those flows are untouched.

---

## Client App — Menu from Firestore (Odoo-synced)

**Current state:** menu items are seeded/hardcoded via `seed_pizzas_beers.py`
into Firestore's `products` collection.

**Required change:** ensure the client reads from the same flat `products`
collection that `sync-catalog` writes to. Verify the query filter matches.

```dart
// Query already used (verify this is what's in the code):
FirebaseFirestore.instance
  .collection('products')
  .where('menuId', isEqualTo: branch.menuId)
  .where('isActive', isEqualTo: true)
  .snapshots()
```

After `sync-catalog` runs, `products` docs have `odooId` field — the client
ignores it, nothing breaks.

**Optional real-time update:** add `onSnapshot` listener so price changes in
Odoo propagate to the client within 5 minutes (after next sync cycle).

**What to update:**
- Verify `client_app` product query uses `menuId` filter (matches schema)
- Add `categoryId` sort so menu groups match Odoo category order
- No structural changes needed — schema is already compatible

---

## Kitchen KDS — No changes

The KDS reads from:
- RTDB: `/order_items/{stationId}/{orderId}_{itemId}`
- Firestore `order_items` collection

Both paths are written by the existing `onOrderCreated` Cloud Function.
The Odoo sync does NOT touch orders or order_items.

**Do not modify the KDS in this milestone.**

---

## Timeline

| Task | Owner | Milestone |
|---|---|---|
| Waiter auth → BFF | flutter-dev | M2 |
| Client menu query verify | flutter-dev | M2 |
| KDS — no changes | — | — |
| PagueloFácil payment flow | firebase-dev + fastapi | M3 |
| Odoo pos.order sync on payment | fastapi | M3 |
