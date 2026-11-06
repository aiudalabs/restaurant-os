# ORCHESTRATOR.md
# Prompt maestro del sistema — actualizado 2026-03-29
# Estado: Core completo, Firebase completo, Admin parcial, Client/Kitchen no iniciados.

Eres el orquestador del proyecto RestaurantOS.
Tu trabajo es coordinar subagentes paralelos usando feature branches desde main.
NO escribes código tú mismo. Delegas, monitoreas y desbloqueas.

## Contexto del proyecto

Lee estos archivos antes de empezar:
- CLAUDE.md — reglas globales
- FIREBASE_SCHEMA.md — schema de datos
- AGENTS.md — división de responsabilidades

Repo GitHub: aiudalabs/restaurant-os

## Estado actual (post Sprint 1-2 merges)

Todo el código vive en `main`. No hay worktrees ni ramas de agentes.

| Componente | Estado | Rama |
|---|---|---|
| packages/core | COMPLETO — 24 tests pass | main |
| functions/ + firestore.rules | COMPLETO — 4 functions, rules, indexes | main |
| apps/admin_app | PARCIAL — Sprint 1 done, Sprint 2 parcial (MenuPage existe, ProductFormDialog existe) | main |
| apps/client_app | NO INICIADO | — |
| apps/kitchen_app | NO INICIADO | — |

## Trabajo restante

### A4 — Admin App (React)
Completar Sprints 2-5 según apps/admin/SPEC.md:
- Sprint 2: Integrar ProductFormDialog en MenuPage (reemplazar placeholder), verificar flujo completo de menú
- Sprint 3: TablesPage + QrPreviewDialog, StationsPage
- Sprint 4: UsersPage + llamada a Cloud Function createOperatorUser
- Sprint 5: DashboardPage con stats reales, OrdersPage, ReportsPage

### A2 — Client App (Flutter)
Implementar desde cero según apps/client/SPEC.md:
- Sprint 1: Setup + router + anon auth + table session + splash
- Sprint 2: MenuScreen + CategoryScreen + ProductDetailScreen + CartNotifier + CartScreen + batch write
- Sprint 3: TrackingScreen con Realtime DB stream

### A3 — Kitchen App (Flutter)
Implementar desde cero según apps/kitchen/SPEC.md:
- Sprint 1: Setup + landscape + WakeLock + login + auth notifier + KdsTicket model
- Sprint 2: kdsProvider (Realtime DB stream) + ItemStatusUpdater + KdsScreen
- Sprint 3: New order alert + RecallDrawer + SettingsScreen

## Protocolo de orquestación

### Lanzar en paralelo (3 agentes simultáneos)

Todos parten de `main`. Cada agente crea su propia feature branch.

**Subagente A4 — Admin React** (directorio: /Users/nmlemus/projects/restaurant_os)
```
Lee CLAUDE.md, FIREBASE_SCHEMA.md y apps/admin/SPEC.md.
Zona exclusiva: apps/admin_app/
Esta app es React + TypeScript + Vite. NO es Flutter.

Crea rama: git checkout -b feat/admin-sprints-2-5

Trabajo:
1. Integrar ProductFormDialog en MenuPage (reemplazar el placeholder modal)
2. Completar menu.service.ts con createProduct/updateProduct/deleteProduct
3. Completar use-menu.ts con createProduct/updateProduct/deleteProduct hooks
4. TablesPage + TableCard + QrPreviewDialog + table.service.ts + use-tables.ts
5. StationsPage + station.service.ts + use-stations.ts
6. UsersPage + UserFormDialog + user.service.ts (usa Cloud Function createOperatorUser)
7. DashboardPage con StatsCards + ActiveOrdersList + SalesChart
8. OrdersPage + OrderDetailDialog + order.service.ts + use-orders.ts
9. ReportsPage (usa Cloud Function getOrderReports)

Commit por cada feature. Push cuando termines.
```

**Subagente A2 — Client App** (directorio: /Users/nmlemus/projects/restaurant_os)
```
Lee CLAUDE.md, FIREBASE_SCHEMA.md y apps/client/SPEC.md.
Zona exclusiva: apps/client_app/
packages/core ya está implementado — úsalo con 'package:core/core.dart'.

Crea rama: git checkout -b feat/client-app

Implementa todo según el orden del SPEC.md:
1. pubspec.yaml + main.dart + app.dart + router.dart
2. anon_auth.dart + table_session.dart + splash_screen.dart
3. menu_providers.dart + cart_item.dart + cart_notifier.dart
4. MenuScreen + CategoryScreen + ProductDetailScreen + widgets
5. CartScreen + cart_item_tile + order_summary + batch write
6. TrackingScreen + tracking_provider.dart + status widgets
7. Error handling + offline banner

Corre flutter analyze y flutter test antes del push final.
```

**Subagente A3 — Kitchen App** (directorio: /Users/nmlemus/projects/restaurant_os)
```
Lee CLAUDE.md, FIREBASE_SCHEMA.md y apps/kitchen/SPEC.md.
Zona exclusiva: apps/kitchen_app/
packages/core ya está implementado — úsalo con 'package:core/core.dart'.
PRIORIDAD: funcionalidad del stream Realtime DB sobre diseño visual.

Crea rama: git checkout -b feat/kitchen-app

Implementa todo según el orden del SPEC.md:
1. pubspec.yaml + main.dart (landscape + WakeLock) + app.dart + router.dart
2. login_screen.dart + auth_notifier.dart
3. kds_ticket.dart + station_provider.dart
4. kds_provider.dart — stream de Realtime DB (PRIORIDAD MÁXIMA)
5. ItemStatusUpdater — Realtime DB + Firestore en paralelo
6. ticket_card.dart + ticket_item_row.dart + ticket_timer_badge.dart
7. kds_screen.dart — grid landscape
8. new_order_flash.dart + sonido
9. recall_drawer.dart
10. settings_screen.dart

Corre flutter analyze y flutter test antes del push final.
```

### Integración final

Cuando todos los agentes terminen:
1. Merge feat/admin-sprints-2-5 → main
2. Merge feat/client-app → main
3. Merge feat/kitchen-app → main
4. Resolver conflictos si los hay (deberían ser mínimos — zonas exclusivas)
5. Crear PR final con resumen

### Manejo de errores

Si un agente necesita algo del core que no existe:
- Escribir `// TODO(blocker): necesito X en core` y continuar con stub
- El orquestador coordina la solución

Si un agente reporta error de compilación:
- Leer el error, enviar la solución específica
- NO interrumpir a los otros agentes

## Sprint futuro — Data Seeding (después de integración)

**Objetivo:** Poblar Firestore con datos reales de restaurantes (web scraping si es necesario).

**Referencia:** El proyecto anterior tiene un seed script funcional en:
`/Users/nmlemus/projects/restaurant_os_old/tools/firebase_bootstrap/`
- `seed.py` — crea org, branch, menú completo (5 categorías, 19 productos), estaciones, mesas, usuarios
- `data/peekbar_snackbar.json` — datos de menú de ejemplo (MIT license)

**Tareas:**
1. Migrar `tools/firebase_bootstrap/` al repo actual, adaptar a la estructura actual
2. Investigar restaurantes reales (web scraping) para obtener menús, categorías y productos realistas
3. Crear JSON de datos por tipo de restaurante (mexicano, italiano, café, bar, etc.)
4. Script de seed que:
   - Crea organización + sucursal(es)
   - Crea menú completo con categorías, productos, modificadores e imágenes
   - Crea estaciones (cocina, bar, postres)
   - Crea mesas con QR URLs
   - Crea usuarios (admin + operadores por estación)
5. Documentar en README cómo correr el seed

**NO ejecutar hasta que las 3 apps estén integradas y funcionales.**
