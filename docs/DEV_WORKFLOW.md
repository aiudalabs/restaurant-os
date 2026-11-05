# Flujo de desarrollo con agentes y puertas de calidad

Adaptado de las reglas de Zaveli v2 (`lemusdigital-llc/zaveli-v2/AGENTS.md`). Vigente desde 2026-11-05.
Las reglas de `CLAUDE.md` (dev primero, issues, ramas, commits) siguen mandando; esto añade cómo se ejecuta y se valida.

## Roles

- **Orquestador** (la sesión principal): divide el trabajo en tareas independientes, lanza agentes, los vigila y es el único que mergea.
- **Agentes de desarrollo**: uno por tarea, cada uno en su propio worktree y su propia rama (`feat/issue-N-slug`). Solo tocan los archivos de su tarea.
- **Revisor**: un agente distinto del que escribió el código. Revisa el diff y corre `make check`. Es obligatorio solo para lo sensible (abajo).

## Ciclo de una tarea

1. Issue con criterios de aceptación escritos como pruebas verificables.
2. El agente escribe primero la prueba (refactors) o junto con el código (funcionalidad nueva).
3. Mientras trabaja: `make check` (rápido, sin emuladores). No corre `make verify` ni `make e2e` en cada cambio.
4. Antes de pedir revisión, una vez: `make verify` y, si tocó reglas, pagos o triggers, `make e2e`.
5. PR que diga qué cambia, cómo probarlo y qué queda fuera. Cierra el issue.
6. Revisión (ver abajo) y validación del orquestador antes del merge.
7. Despliegue a dev. Prod solo cuando el responsable lo pide.

## Puerta previa al merge

El orquestador no mergea sin comprobar, sobre el commit exacto que se fusiona:

- CI de GitHub Actions en verde (`.github/workflows/ci.yml`).
- `make verify` en local en verde; `make e2e` si el PR toca `firestore.rules`, `database.rules.json`, `functions/src/payments/`, `functions/src/orders/` o `functions/src/loyalty/`.
- Cada criterio de aceptación del issue tiene una prueba que lo cubre o una verificación manual anotada en el PR.
- Sin atajos para llegar al verde: no se cambia un criterio ni se sustituye una integración real por un simulador sin declararlo en el PR.

## Qué lleva prueba siempre

Dinero y totales, pago confirmado y factura, aislamiento entre organizaciones (reglas), credenciales y PINs, descuentos y puntos del Club. Una prueba de aislamiento debe demostrar que la organización A **no** puede leer ni escribir datos de la B.

## Pirámide de pruebas

| Capa | Herramienta | Dónde | Estado |
|---|---|---|---|
| Unitarias backend | `node --test`, `pytest` | `functions/test/unit`, `apps/fastapi_bff/tests` | existe (18 + 50) |
| Integración con emuladores | Firebase Emulator Suite | `functions/test/emulator` (reglas, contador, pago, Yappy, descuentos, Club, PIN, claims) | existe, manual (JDK 21+) |
| Unitarias web | Vitest | `apps/*/src/**/*.test.ts` | **falta** |
| Recorrido de punta a punta | Playwright contra dev/emulador | `e2e/` | **falta** |

Prioridad para cerrar el hueco: Vitest en la lógica de cobro de `waiter_web` y en `customer_web/src/lib` (carrito, totales), luego un recorrido Playwright: pedido → cocina → cobro → factura.

## Revisión por PR

Una revisión por PR, de otro agente. Obligatoria para: reglas de seguridad, pagos, credenciales, aislamiento entre organizaciones, facturación. El resto (UI, docs, herramientas) se mergea con lo local en verde, declarado en el PR.

## Reglas heredadas que se mantienen

- `main` solo por PR. Nadie hace push directo.
- Lo que cambia una dependencia, credenciales, dinero o algo fuera de la máquina se pregunta al responsable.
- Si el sistema de permisos deniega un comando, no se reintenta por otra vía: se anota y se pregunta.
- Antes de cualquier deploy o migración a prod: export manual de Firestore (ver `ENVIRONMENTS.md` §8).
