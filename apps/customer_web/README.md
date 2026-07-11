# customer_web — App web del cliente (pickup por número)

Web app que reemplaza el lado *cliente* para el demo. El comensal escanea un QR,
recibe un **número de retiro único** que debe conservar, hace su pedido (sin pago)
y sigue su estado en tiempo real. Deploy inmediato por Firebase Hosting — sin
esperar a Google Play / App Store.

- **Stack:** React 18 + TypeScript + Vite + Tailwind + Firebase Web SDK.
- **Datos:** mismo esquema plano que el resto (`orders`, `order_items`, `products`…),
  `firebase-admin` custom tokens NO se usan aquí — el cliente entra con **anon auth**.
- **URL demo:** https://restaurant-os-pedir.web.app
  - QR / deep link: `?org=demo-org&branch=demo-branch`

## Flujo

1. **/** (`EntryScreen`) — lee `org`/`branch` del QR, nombre opcional. Si ya hay un
   pedido activo en `localStorage`, ofrece reanudar.
2. **/menu** (`MenuScreen`) — categorías + productos (`isActive`, por `menuId`).
3. **/cart** (`CartScreen`) — confirma el pedido. Crea `order` (`source: 'qr'`,
   `tableId: ''`, `tableNumber = pickupCode`) + `order_items` (`stationId: ''`).
4. **/order/:orderId** (`TrackingScreen`) — número grande + stepper en vivo.
5. **/recover** (`RecoverScreen`) — busca un pedido por su código (`pickupCode`).

## Recuperación del pedido

- **Mismo dispositivo:** `localStorage` (`ros_customer_active_order`) devuelve al
  usuario directo a su tracking al reabrir. Se limpia cuando el pedido se entrega.
- **Otro dispositivo / storage limpio:** pantalla *Recuperar* → query por `pickupCode`.

## Routing a estación (KDS)

El cliente anónimo **no puede leer `stations`** (security rules), así que el
routing lo hace el Cloud Function `onOrderCreated`: asigna `stationId` por
`categoryId` y espeja el ítem al RTDB (`/order_items/{stationId}`), que es lo que
escucha el KDS. Se modificó ese function para que las órdenes `source: 'qr'`
(sin pago en el demo) lleguen al KDS de inmediato, igual que las de `waiter`.

## Dev / build / deploy

```bash
npm install
npm run dev          # http://localhost:5175/?org=demo-org&branch=demo-branch
npm run build
firebase deploy --only hosting:customer   # → restaurant-os-pedir.web.app
```

La config de Firebase (web API key pública) está inline en `src/lib/firebase.ts`.
