# RestaurantOS — Pagos en la app del cliente (Panamá)

**Problema que resuelve:** hoy un cliente puede pedir y **irse sin pagar**, dejando
comida hecha. La solución es un **gate de prepago**: el pedido **no llega a cocina
hasta que el pago se confirma**.

**Regla de diseño:** el pago lo procesa un **tercero con página hospedada** — la app
**nunca toca datos de tarjeta** (mínimo alcance PCI, SAQ A).

---

## 1. Qué se puede usar en Panamá (investigado, con fuentes)

| Opción | ¿En Panamá? | ¿Checkout hospedado? | Métodos | PCI | Requisito |
|---|---|---|---|---|---|
| **PagueloFácil — Enlace de Pago (LinkDeamon)** | ✅ nativo, USD, payout local | ✅ redirect total | Visa, MC, **Clave**, PagoCash | **mínimo (SAQ A)** | cuenta PagueloFácil (CCLW) |
| **Yappy — Botón de Pago Comercial** | ✅ (Banco General) | Componente JS + 2 APIs backend | Yappy (billetera #1 de PA) | bajo | cuenta **Banco General** comercial |
| Tilopay | ✅ | ✅ | Cards, **Yappy, Apple Pay** (Google Pay sin confirmar) | bajo | cuenta Tilopay |
| **Stripe** | ❌ **NO** (solo con entidad + banco extranjeros) | — | — | — | no viable en PA |
| Apple/Google Pay directo | ❌ no son gateway | — | — | — | van *encima* de un gateway |

**Fuentes:** stripe.com/global (Panamá no aparece) · developers.paguelofacil.com/guias/enlace-de-pago
· yappy.com.pa/comercial/desarrolladores · bgeneral.com/botondepagoyappy · support.bigcommerce.com/.../Tilopay

### Decisión

- **Primario: PagueloFácil "Enlace de Pago"** — único que es a la vez nativo de Panamá
  (USD, banco local), redirect hospedado (mínimo PCI), **ya integrado en este repo**, con
  sandbox, y devuelve una confirmación sobre la que se puede condicionar la cocina.
- **Secundario (cuando haya banda): Yappy Botón de Pago** — es la billetera más usada de
  Panamá; requiere cuenta Banco General y algo más de integración (JS + 2 APIs backend).
- **Apple/Google Pay:** más adelante, vía **Tilopay** (Apple Pay confirmado; Google Pay en
  PA sin confirmar). No es motivo para cambiar la estrategia card-first.
- **Stripe: descartado** para una empresa panameña.

---

## 2. Flujo del gate de prepago (implementado)

```
customer_web (carrito)
  │  crea orden status='pending_payment'  (source:'qr')   ── NO va a cocina
  ▼
  POST {BFF}/payments/init  { order_id, amount, description }
  │  BFF → PagueloFácil LinkDeamon  → { payment_url }
  ▼
  window.location = payment_url         (página segura de PagueloFácil)
  │  el cliente paga con tarjeta / Clave
  ▼
  PagueloFácil → GET/POST {BFF}/payments/callback  (PARM_1 = order_id)
  │  BFF: verifica (ver §3) → order.status='paid'
  │       → _route_to_kds()  (espeja al RTDB → KDS lo ve)   ✅ recién ahora cocina
  │       → _sync_to_odoo()  (crea pos.order)
  ▼
  BFF redirige el browser → {customer_app}/order/{order_id}
  │  TrackingScreen ya está suscrito a Firestore → pasa a "Recibido" en vivo
```

**Piezas en el código:**
- `apps/customer_web/src/screens/CartScreen.tsx` — crea la orden y redirige al pago.
- `apps/customer_web/src/lib/payments.ts` / `config.ts` — llama al BFF; flag `VITE_PAYMENTS_ENABLED`.
- `apps/customer_web/src/screens/TrackingScreen.tsx` — estados `pending_payment` / `payment_failed` con botón "Pagar / Reintentar".
- `apps/fastapi_bff/app/payments/*` — `POST /payments/init` (link) y `/payments/callback` (confirmación + routing + Odoo).
- `functions/src/orders/on-order-created.ts` — para `source:'qr'` con `status:'pending_payment'` asigna `stationId` pero **no** espeja al RTDB; el BFF lo hace al pagar.

**Retrocompatibilidad:** con `VITE_PAYMENTS_ENABLED` apagado (default), la web app crea
la orden como `pending` y va directo a cocina (modo demo / pago en mostrador). Nada se
rompe hasta que enciendas los pagos.

---

## 3. ⚠️ Seguridad — endurecimiento obligatorio para producción

El callback de PagueloFácil **no viene firmado (sin HMAC)**. Sin protección, alguien que
descubra la URL del callback podría **falsificar un "Aprobada" y liberar comida gratis** —
justo la pérdida que queremos evitar.

Mitigaciones ya implementadas en `payments/service.py`:
- **Idempotencia:** si la orden ya está `paid`, se ignora el callback duplicado (no re-rutea
  ni duplica el `pos.order`).
- **Seam de verificación server-to-server** (`_verify_with_paguelofacil`): si están
  configurados `PAGUELOFACIL_VERIFY_URL` + `PAGUELOFACIL_ACCESS_TOKEN`, el BFF **re-consulta**
  la transacción a PagueloFácil antes de rutear a cocina. Si no están configurados (sandbox),
  loguea una **advertencia fuerte** y confía en el callback.

**TODO go-live (bloqueante):**
1. Confirmar el endpoint REST de estado de PagueloFácil (su colección Postman oficial) e
   implementar la llamada real dentro de `_verify_with_paguelofacil` — **no** hardcodear una
   URL adivinada.
2. Setear `PAGUELOFACIL_VERIFY_URL` + `PAGUELOFACIL_ACCESS_TOKEN` en el entorno del BFF.
3. Servir el BFF **público por HTTPS** (para que PagueloFácil alcance el callback) — lo da el
   despliegue de `docs/DEPLOYMENT.md`.
4. Cambiar `PAGUELOFACIL_ENV=production` + CCLW de producción.

---

## 4. Activar los pagos

1. Desplegar el BFF público (ver `docs/DEPLOYMENT.md`) con `PAGUELOFACIL_CCLW` (sandbox o prod),
   `CUSTOMER_APP_URL` y, para prod, la verificación server-to-server.
2. Reconstruir y desplegar la web app apuntando al BFF:
   ```bash
   cd apps/customer_web
   VITE_PAYMENTS_ENABLED=true VITE_BFF_URL=https://api.tu-dominio.com npm run build
   firebase deploy --only hosting:customer
   ```
3. Probar en sandbox: pedir → pagar con tarjeta de prueba de PagueloFácil → verificar que la
   orden pasa a `paid` y **recién ahí** aparece en el KDS.

---

## 5. Roadmap de pagos

- [x] PagueloFácil hosted (Enlace de Pago) — gate de prepago
- [x] Idempotencia del callback
- [ ] Verificación server-to-server real (go-live)
- [ ] Yappy Botón de Pago (Banco General) como segundo método
- [ ] Apple Pay vía Tilopay (opcional)
- [ ] Nota fiscal en Odoo tras el pago (`docs/NEXT_STEPS.md`)
