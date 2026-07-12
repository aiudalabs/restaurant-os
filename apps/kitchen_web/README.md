# kitchen_web — KDS web (Kitchen Display System)

Versión **web** del KDS de cocina — sin instalar nada, abre en el navegador de
cualquier tablet y puede ir a **pantalla completa** (kiosco).

- **Stack:** React 18 + TypeScript + Vite + Tailwind + Firebase Web SDK.
- **URL:** https://restaurant-os-cocina.web.app
- **Tema oscuro** (menos reflejo en cocina), texto grande, tickets a color por antigüedad.

## Cómo funciona
1. **Login** (Firebase Auth email/password) → lee `users/{uid}` → obtiene su `stationId` (y `orgId`).
2. **Board en vivo:** escucha el **RTDB** `order_items/{stationId}` (igual que el KDS Flutter) y agrupa por orden en tickets.
3. **Avanzar estado:** tocar un ítem → `queued → in_progress → done`. Escribe **RTDB** (velocidad) **+ Firestore** (fuente de verdad); el `on-order-item-updated` hace el roll-up del estado de la orden. Ítems `done` salen del board; un ticket con todo listo desaparece.
4. **Pantalla completa** (`requestFullscreen`) + **wake lock** para que la pantalla no se apague.

## Credenciales de estación
Cada operador entra con la cuenta de **su estación** (creadas en el admin → Usuarios,
o auto-generadas al crear la sucursal con `provisionBranch`). El KDS muestra solo los
pedidos de esa estación.

## Dev / build / deploy
```bash
npm install
npm run dev          # http://localhost:5176
npm run build
firebase deploy --only hosting:kds   # → restaurant-os-cocina.web.app
```
