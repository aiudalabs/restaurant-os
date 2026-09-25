# CLAUDE.md — RestaurantOS
# Reglas globales. Todo agente lee esto primero. No hay excepciones.

---

## Qué es este proyecto

Sistema de gestión de pedidos para restaurantes y cadenas de restaurantes.
SaaS multi-tenant: un mismo sistema sirve a múltiples organizaciones independientes.

Desde la integración con Odoo (ver `docs/INTEGRATION_ARCHITECTURE.md`), el sistema
es de dos motores:
- **Firebase** = capa operacional en tiempo real (órdenes, mesas, KDS, auth de sesión)
- **Odoo ERP** = fuente de verdad de catálogo, empleados (HR) y contabilidad
- **FastAPI BFF** (`apps/fastapi_bff`) = el único puente entre ambos mundos

Las apps Flutter/React hablan con Firebase para todo lo operacional, y con el BFF
solo para auth (login contra Odoo) y pagos.

---

## Las apps y su tecnología

| App | Tecnología | Plataforma | Quién la usa |
|---|---|---|---|
| `client_app` | Flutter | iOS + Android | Clientes del restaurante (QR → orden) |
| `waiter_app` | Flutter | iOS + Android | Meseros — toman órdenes, ven activas |
| `kitchen_app` | Flutter | Android tablet | Cocina, bar, cualquier estación (KDS) |
| `admin_app` | React + TypeScript | Web (browser) | Dueños y managers |
| `fastapi_bff` | Python + FastAPI | Servicio backend | Puente Odoo ↔ Firebase (auth, catálogo, pagos) |
| `packages/core` | Dart | Compartido | Usado por client_app, waiter_app y kitchen_app |

**IMPORTANTE:** `admin_app` es React, NO Flutter. No sugerir Flutter Web para el admin.

Las carpetas `apps/admin`, `apps/client`, `apps/kitchen` (sin sufijo `_app`) solo
contienen el `SPEC.md` original de cada app — no son código vivo. El código real
vive en `*_app/` y en `fastapi_bff/`. `apps/waiter_demo` es un prototipo HTML
suelto, no forma parte del sistema.

Para el detalle completo del flujo Odoo↔Firebase (auth, sync de catálogo, órdenes,
pagos, webhooks, endpoints del BFF) la fuente de verdad es
**`docs/INTEGRATION_ARCHITECTURE.md`** — leerlo antes de tocar `fastapi_bff` o el
flujo de auth de `waiter_app`/`client_app`.

Roadmap y prioridades actuales: `docs/ROADMAP.md` (fases hacia SaaS) y
`docs/NEXT_STEPS.md` (pendientes puntuales, p.ej. factura fiscal en Odoo).

---

## Estructura del monorepo

```
restaurant_os/
├── CLAUDE.md                    ← este archivo
├── FIREBASE_SCHEMA.md           ← fuente de verdad de la BD (Firebase)
├── AGENTS.md                    ← coordinación entre agentes
├── docs/
│   ├── INTEGRATION_ARCHITECTURE.md  ← fuente de verdad Odoo ↔ Firebase ↔ BFF
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   ├── NEXT_STEPS.md
│   ├── FLOWS.md
│   └── SAAS_STRATEGY.md
├── pubspec.yaml                 ← workspace root (Melos)
├── melos.yaml
├── packages/
│   └── core/                    ← Dart package compartido
└── apps/
    ├── client_app/              ← Flutter app del cliente
    ├── waiter_app/               ← Flutter app del mesero
    ├── kitchen_app/              ← Flutter KDS
    ├── admin_app/                ← React dashboard
    └── fastapi_bff/              ← Python FastAPI, puente con Odoo ERP
```

---

## Versiones fijas — no actualizar sin modificar este archivo

### Flutter / Dart
```yaml
flutter: 3.24.x (stable)
dart: 3.5.x
firebase_core: ^3.6.0
cloud_firestore: ^5.4.0
firebase_auth: ^5.3.0
firebase_database: ^11.1.0
firebase_storage: ^12.3.0
firebase_messaging: ^15.1.0
firebase_remote_config: ^5.1.0
flutter_riverpod: ^2.5.0
riverpod_annotation: ^2.3.0
go_router: ^14.0.0
freezed: ^2.5.0
freezed_annotation: ^2.4.0
json_serializable: ^6.8.0
riverpod_generator: ^2.4.0
build_runner: ^2.4.0
cached_network_image: ^3.4.0
mobile_scanner: ^5.2.0    # solo client_app
wakelock_plus: ^1.2.0     # solo kitchen_app
shared_preferences: ^2.3.0
intl: ^0.19.0
```

### React / TypeScript (solo admin_app)
```json
{
  "react": "^18.3.0",
  "typescript": "^5.5.0",
  "vite": "^5.4.0",
  "firebase": "^10.13.0",
  "@tanstack/react-query": "^5.56.0",
  "@tanstack/react-router": "^1.56.0",
  "react-hook-form": "^7.53.0",
  "zod": "^3.23.0",
  "recharts": "^2.12.0",
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-*": "latest"
}
```

### Python (solo fastapi_bff)
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.10.4          # bump: google-genai requiere >=2.9.0
pydantic-settings==2.4.0
firebase-admin==6.5.0
httpx==0.28.1             # bump: google-genai requiere >=0.28.1
google-genai==1.56.0     # asistente IA (Vertex AI vía ADC) — ver docs/AI_ASSISTANT.md
python-jose[cryptography]==3.3.0
python-dotenv==1.0.1
pytest==8.3.0 / pytest-asyncio==0.24.0
```
Odoo se integra vía JSON-RPC (no un SDK oficial) — cliente propio en `app/core/odoo.py`.

---

## Reglas de código — Dart/Flutter

1. `final` sobre `var` siempre que el valor no cambie.
2. Sin `dynamic`. Tipado estricto en todo.
3. Todos los modelos usan **Freezed**. Sin excepciones.
4. Todo modelo tiene `fromFirestore()` y `toFirestore()`.
5. Nunca llamar Firebase directamente desde un Widget.
6. Los Widgets solo leen providers. Nunca tienen lógica de negocio.
7. Siempre manejar los 3 estados de AsyncValue: loading / error / data.
8. Nunca `!` (null assertion) sin comentario que explique por qué es seguro.
9. Rutas de Firestore: siempre usar `FirestorePaths`. Nunca strings manuales.
10. Atrapar `FirebaseException` en repositorios y convertir a `AppException`.

## Reglas de código — React/TypeScript

1. Componentes funcionales con hooks. Sin class components.
2. Props tipadas siempre. Sin `any`.
3. `useQuery` de TanStack para toda llamada a Firebase (excepto realtime).
4. Formularios con `react-hook-form` + validación `zod`.
5. Nunca llamar Firestore directamente desde un componente. Usar hooks/services.
6. Cada feature tiene su carpeta: `components/`, `hooks/`, `services/`, `types/`.

## Reglas de código — Python/FastAPI (fastapi_bff)

1. Cada dominio (`auth`, `catalog`, `orders`, `payments`, `webhooks`) vive en su
   propia carpeta con `router.py` / `service.py` / `models.py`.
2. Contratos de entrada/salida siempre con modelos Pydantic. Nada de `dict` suelto
   cruzando una capa de router.
3. El cliente Odoo (JSON-RPC) vive solo en `app/core/odoo.py`. No hacer llamadas
   JSON-RPC ad-hoc desde un `service.py`.
4. Odoo es fuente de verdad de catálogo/empleados/contabilidad; Firestore es cache
   o capa operacional. Nunca escribir el catálogo en Firestore a mano — pasa por
   el sync (`/admin/sync-catalog`).
5. Nunca commitear `.env`, `serviceAccountKey.json` ni ninguna credencial —
   ya están en `.gitignore`, no los saques de ahí.
6. Sync a Odoo al confirmar pago es asíncrono — si Odoo falla, encolar en
   `sync_queue` en vez de bloquear la respuesta al cliente.

## Nomenclatura

| Elemento | Dart | TypeScript | Python |
|---|---|---|---|
| Archivos | `snake_case.dart` | `kebab-case.tsx` | `snake_case.py` |
| Clases/Componentes | `PascalCase` | `PascalCase` | `PascalCase` |
| Variables/funciones | `camelCase` | `camelCase` | `snake_case` |
| Constantes | `kConstant` | `CONSTANT` | `UPPER_CASE` |
| Providers Riverpod | sufijo `Provider` | — | — |
| Repositorios | sufijo `Repository` | sufijo `Service` | sufijo `Service` |

---

## Bundle IDs / Package IDs

```
client_app   → com.aiudalabs.restaurantos.client
kitchen_app  → com.aiudalabs.restaurantos.kitchen
waiter_app   → com.aiudalabs.restaurantos.client   ⚠️ BUG: duplica el de client_app,
                                                       debería ser .waiter. No cambiar
                                                       sin coordinar (afecta firma/
                                                       Firebase config ya generada).
admin_app    → N/A (web app)
fastapi_bff  → N/A (servicio backend)
```

Configurar en:
- Android: `android/app/build.gradle` → `applicationId`
- iOS: `ios/Runner.xcodeproj/project.pbxproj` → `PRODUCT_BUNDLE_IDENTIFIER`

---

## Lo que NINGÚN agente puede hacer

- ❌ Crear colecciones de Firestore fuera de `FIREBASE_SCHEMA.md`
- ❌ Hardcodear strings de rutas de Firestore
- ❌ Poner lógica de negocio en widgets o componentes React
- ❌ Ignorar errores con catch vacíos `catch {}`
- ❌ Subir `google-services.json`, `.env`, o credenciales al repo
- ❌ Modificar archivos de otra app sin autorización explícita
- ❌ Usar `setState` en pantallas principales Flutter (usar Riverpod)
- ❌ Instalar dependencias no listadas en este archivo sin consultarlo primero

---

## Arquitectura de agentes — cómo funciona el sistema

Este proyecto usa **un orquestador + subagentes en git worktrees**.
No hay terminales separadas. Claude Code lanza y coordina todo.

```
 Un solo proceso claude --dangerously-skip-permissions
        │
        ▼
  ORQUESTADOR (lee ORCHESTRATOR.md)
  ├── Task → A1 Core     (worktree ../ros_core)
  ├── Task → A5 Firebase (worktree ../ros_firebase)
  ├── Task → A4 Admin    (worktree ../ros_admin)
  ├── Task → A2 Client   (worktree ../ros_client)  ← lanzado cuando Core S1 listo
  └── Task → A3 Kitchen  (worktree ../ros_kitchen) ← lanzado cuando Core S1 listo
```

Cada subagente trabaja en su propio worktree. No hay conflictos de archivos.
Las señales entre agentes son strings exactos que el orquestador detecta:
- `SIGNAL: CORE_PROVIDERS_READY` → lanza A2 y A3
- `SIGNAL: ORDER_ROUTING_READY` → Firebase lista para testear
- `SIGNAL: MENU_MANAGEMENT_READY` → Admin puede crear menús

**Para lanzar todo:** `./setup_agents.sh` desde la raíz del repo.

---

## Flujo de trabajo con GitHub — OBLIGATORIO para todos los agentes

> Tienes acceso al GitHub MCP. Repo: **aiudalabs/restaurant-os**
> Cada tarea tiene un issue creado. El trabajo se organiza alrededor de esos issues.
> NUNCA escribas código sin un issue asociado. NUNCA hagas commit sin cerrar el issue.

### Flujo por cada tarea

```
1. BUSCAR el issue correspondiente (por título o label de tu app)
2. COMENTAR en el issue: "🚧 En progreso"
3. CREAR una rama: git checkout -b feat/issue-{número}-{descripción-corta}
4. IMPLEMENTAR la tarea
5. VERIFICAR que compila / tests pasan
6. COMMIT con referencia al issue:
   git commit -m "feat(scope): descripción\n\nCloses #{número}"
7. PUSH de la rama
8. COMENTAR en el issue: "✅ Completado — [descripción de lo que hiciste]"
9. CERRAR el issue
```

### Ramas

- Rama principal: `main`
- Nunca commitear directo a `main`
- Formato de rama: `feat/issue-{n}-{slug}` o `fix/issue-{n}-{slug}`
- Una rama por issue. Cuando el issue cierra, la rama se puede eliminar.

### Commits

Cada commit debe referenciar el issue:
```
feat(core): implementar OrderRepository con watchActive y create

Closes #12
```

Scopes válidos: `client`, `waiter`, `kitchen`, `admin`, `core`, `firebase`, `bff`, `docs`

Formatos válidos del mensaje:
- `feat(scope):` — nueva funcionalidad
- `fix(scope):` — corrección de bug
- `refactor(scope):` — refactor sin cambio de comportamiento
- `test(scope):` — agregar o corregir tests
- `docs:` — solo documentación

### Pull Requests

Cuando un sprint completo termine (todos sus issues cerrados):
1. Crear un PR de la rama del último issue hacia `main`
2. Título del PR: `[Sprint completado] Nombre del milestone`
3. Body del PR: lista de los issues cerrados en ese sprint
4. Asignar para revisión al coordinador humano

### Lo que el agente hace con GitHub en cada sesión

Al **iniciar** una sesión de trabajo:
- Revisar qué issues del milestone activo están abiertos
- Tomar el primero en orden y comentar "🚧 En progreso"

Al **terminar** cada tarea:
- Commit con `Closes #N`
- Comentar en el issue con resumen de lo implementado
- Cerrar el issue
- Avanzar al siguiente issue del mismo milestone

Al **encontrar un bug** mientras trabaja:
- Crear un nuevo issue con label `app:{scope}` y descripción del problema
- Arreglarlo en el mismo commit si es pequeño, o en rama separada si es grande

Al **necesitar algo de otro agente:**
- Crear issue con label `blocker` y mencionar al agente responsable en el body
- Escribir un stub en el código con comentario `// TODO(blocker): issue #{n}`
- Continuar con la siguiente tarea

---

## Archivos que nadie toca sin consenso explícito

- `CLAUDE.md` (este archivo)
- `FIREBASE_SCHEMA.md`
- `firestore.rules`
- `packages/core/lib/utils/firestore_paths.dart`

---

## Convención de commits

```
feat(client): descripción
fix(waiter): descripción
fix(kitchen): descripción
refactor(core): descripción
feat(admin): descripción
feat(bff): descripción
docs: descripción
test(core): descripción
```

Scopes válidos: `client`, `waiter`, `kitchen`, `admin`, `core`, `firebase`, `bff`, `docs`

---

## Estado actual (actualizado 2026-07-02)

- Integración con Odoo (BFF, auth, sync de catálogo, pagos) es la línea de trabajo
  activa. `docs/INTEGRATION_ARCHITECTURE.md` es la fuente de verdad de ese flujo,
  no este archivo — actualízalo a él primero si el flujo Odoo↔Firebase cambia.
- Milestone 1 (scaffold del BFF + integración Odoo 17) y el pago sandbox con
  PagueloFácil (issue #34) y la migración de auth de `waiter_app` al BFF
  (issue #32) ya tienen commits en `main`/en esta rama, pero los issues #32 y #34
  siguen **abiertos en GitHub** — falta abrir el PR hacia `main` y mergear para
  que se cierren automáticamente. No asumas que "closes #N" en un commit ya cerró
  el issue si no se ha mergeado.
- Pendiente documentado en `docs/NEXT_STEPS.md`: endpoint de factura fiscal
  (`POST /orders/{id}/invoice`) contra Odoo — no implementado aún.
- Rama actual de trabajo: `feat/issue-32-bff-auth` (limpieza menor de
  `waiter_app` sin commitear: mensaje de validación y comentario de `constants.dart`).
- Ver `docs/ROADMAP.md` para las fases siguientes (pagos, identidad de cliente,
  multi-menú, self-service billing) — es el mapa de prioridades del producto.
