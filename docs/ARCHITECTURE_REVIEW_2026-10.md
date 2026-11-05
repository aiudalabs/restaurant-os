# Revisión de arquitectura RestaurantOS — octubre 2026

Fecha: 2026-10-21. Alcance: todas las apps del monorepo, Cloud Functions, reglas, BFF y docs.
Método: lectura del código (tres pasadas en paralelo: Flutter, web, backend) más verificación
manual de cada hallazgo crítico. No se ejecutó nada ni se cambió código.

Regla vigente para todo lo que salga de aquí: **cualquier cambio se desarrolla, despliega y prueba
en dev (`restaurant-os-dev-49096`) primero. Nada va a prod (`restaurant-os-68c79`) sin estar
mergeado en `main`, probado de punta a punta en dev y pedido explícitamente.** Ya está en
`CLAUDE.md` ("Ambientes: siempre en dev primero") y en `AGENTS.md`; esta revisión no lo cambia.

---

## 1. Cómo funcionaría la factura electrónica (respuesta directa)

**No hace falta una pasarela de pago para facturar.** La factura fiscal se emite cuando ocurre el
evento "pago confirmado", venga de donde venga:

- el mesero toca **Cobrar → Efectivo / Tarjeta** en `waiter_web` (pago en persona);
- el personal confirma un **Yappy manual** (callable `confirmManualPayment`);
- PagueloFácil llama al **callback** del BFF (pago con tarjeta en línea, hoy apagado en prod).

Las tres rutas deben converger en **un solo punto del servidor** que marque la orden como pagada.
Desde ahí sale todo lo que depende del pago: liberar a cocina (si era prepago), sincronizar Odoo
(si la org lo tiene) y **emitir la factura** contra Digifact (ver `docs/DIGIFACT_EVALUATION.md`
para el contador fiscal, idempotencia y datos requeridos). El PDF/CUFE/QR vuelven a la orden en
Firestore, y de ahí los ve el cliente en su pantalla de seguimiento, se envía por email si dio uno,
o se imprime desde el mesero/admin.

```mermaid
flowchart LR
  subgraph Origen del pago
    W[waiter_web<br/>Cobrar: efectivo / tarjeta]
    Y[admin_app o waiter_web<br/>Yappy manual: Pago recibido]
    P[PagueloFácil<br/>callback al BFF]
  end

  W --> RP
  Y --> RP
  P --> RP

  RP[["recordPayment (servidor)<br/>valida orden, estado y monto<br/>escribe payment.status = paid"]]

  RP --> T{{"Trigger onOrderPaid<br/>(orders/{id}: paid por primera vez)"}}

  T --> K[Liberar a KDS<br/>si estaba en pending_payment]
  T --> O[Odoo: pos.order<br/>solo si la org tiene Odoo]
  T --> F[BFF app/fiscal → Digifact<br/>NUC JSON → CUFE + PDF + QR]

  F --> S[(orders/{id}.fiscal<br/>CUFE, numeroDF, pdfUrl, estado)]
  S --> C[customer_web: ver/descargar factura]
  S --> E[Email al cliente si dio correo]
  S --> A[admin_app: listar, reenviar, anular]
```

Cuándo se emite depende del modo de cobro del restaurante y el sistema soporta ambos:

| Modo | Momento de emisión |
|---|---|
| Pago al retirar / en mesa (efectivo, tarjeta física, Yappy manual) | Al tocar **Cobrar** o **Pago recibido** |
| Prepago en línea (PagueloFácil) | En el callback aprobado, antes de ir a cocina |

Si el cliente quiere factura con RUC, se capturan RUC + nombre antes de cobrar (en `customer_web`
al pagar, o el mesero en `waiter_web`); si no, sale a **consumidor final**. La emisión es
asíncrona: si Digifact falla, la orden queda pagada y la factura en estado `pending_fiscal` para
reintentar; nunca bloquea el cobro.

**Hallazgo que condiciona todo lo anterior: ese evento único no existe hoy.** El estado "pagado"
se escribe en cuatro sitios con valores distintos:

| Dónde | Qué escribe | Cómo |
|---|---|---|
| `waiter_web/src/lib/api.ts` `recordPayment` | `payment.status: 'paid'` | `updateDoc` desde el navegador |
| `functions/src/payments/confirm-manual-payment.ts` | `'paid'` + `status: 'confirmed'` | callable (servidor) |
| `fastapi_bff/app/payments/service.py` `handle_callback` | `payment.status: 'approved'`, `method` = tipo de tarjeta crudo | BFF |
| `admin_app` Órdenes | solo estados, no pago | `updateDoc` desde el navegador |

Consecuencias: los reportes (`get-order-reports.ts:155`) y el dashboard del admin cuentan ingresos
solo con `'paid'`, así que **las ventas con tarjeta en línea no suman**; y cualquier mesero (o
cualquiera con su sesión) marca pagado desde el cliente sin validación. El cambio concreto es un
callable `recordPayment` (servidor valida que la orden exista, su estado y el monto; escribe
`'paid'`) y un trigger `onDocumentUpdated('orders/{id}')` cuando `payment.status` pasa a `'paid'`
por primera vez. Un solo cambio arregla el escenario de efectivo que preguntas, el hueco de
seguridad, el bug de ingresos y le da a la factura su punto de enganche.

---

## 2. Mapa de apps: qué está vivo y qué le toca a cada una

| App | Estado real | Pago | Factura (solo UI; la emisión vive en el BFF) |
|---|---|---|---|
| `apps/customer_web` (React, hosting `customer`) | **Viva**. QR/link → pedido → seguimiento. Yappy manual, pago al retirar, tarjeta (apagada) | Sí: elige método, paga en línea cuando se active | Pedir RUC opcional al pagar; ver CUFE, QR y PDF en seguimiento |
| `apps/waiter_web` (React, hosting `waiter`) | **Viva**. Mesero/caja sin mesas, PIN, modo barra | Sí: **Cobrar** (efectivo/tarjeta/Yappy) debe pasar por el callable, no por `updateDoc` | Cobrar emite; capturar RUC del cliente si lo pide; reimprimir |
| `apps/admin_app` (React 19, hosting `admin`) | **Viva**. Panel dueños/managers, asistente IA | Confirma Yappy manual; no cobra | Configuración fiscal de org y sucursal, CPBS por producto, listar/reenviar/anular facturas |
| `apps/kitchen_web` (React, hosting `kds`) | **Viva**. KDS por PIN de estación | Ninguno | Ninguna |
| `apps/landing` (React, hosting `landing`) | Viva. Marketing + pricing con checkout **simulado** | Suscripción SaaS (cobro a restaurantes, distinto del cobro a comensales). Pendiente | Ninguna |
| `apps/fastapi_bff` (Cloud Run) | **Viva**. `auth` (solo Flutter legacy), `catalog`, `payments`, `ai`, `zaveli` | Callback PagueloFácil | **Aquí va el emisor**: nuevo dominio `app/fiscal` |
| `functions/` | **Viva**. 20 funciones (19 gen1, 1 gen2) | `confirmManualPayment`, `yappyWebhook` (código muerto: nada escribe `integrations/*`) | Hook `onOrderPaid` |
| `apps/client_app` (Flutter) | **Legacy**. Último cambio 2026-05-06. Config solo prod. Probablemente **roto** contra las reglas actuales: no escribe `createdByUid` ni `source`, lee `tables`/`organizations` que el anónimo ya no puede leer | — | — |
| `apps/waiter_app` (Flutter) | **Congelada**. BFF `/auth/login` contra Odoo, URL `10.0.2.2`, claims `org_id` que no coinciden con `orgId` del resto | — | — |
| `apps/kitchen_app` (Flutter) | **Secundaria**. Último código 2026-03-30 | — | — |
| `packages/core` (Dart) | Mantenimiento. 6 de sus repositorios/servicios no los usa nadie; `OrderStatus` no conoce `pending_payment`/`paid` | — | — |
| `apps/waiter_demo/index.html` | **Eliminar**. Config de prod hardcodeada, contraseña en `localStorage` en texto plano, escribe órdenes `closed` directo | — | — |
| `apps/admin`, `apps/client`, `apps/kitchen` (`SPEC.md`) | Mover a `docs/specs/` o borrar | — | — |

Resumen: el producto real son **cuatro apps web + BFF + Functions**. Las tres apps Flutter y
`packages/core` ya no forman parte del camino crítico y `AGENTS.md` lo dice; `CLAUDE.md`,
`README.md`, `docs/ROADMAP.md` y `docs/ARCHITECTURE.md` todavía las describen como operativas.

---

## 3. Cómo se conectan hoy (flujo real)

```mermaid
flowchart TB
  subgraph Clientes
    CW[customer_web<br/>auth anónima]
    WW[waiter_web<br/>PIN → waiterLogin]
    KW[kitchen_web<br/>PIN → kdsLogin]
    AD[admin_app<br/>email/password]
  end

  subgraph Firebase
    FS[(Firestore<br/>orders, order_items, menus…)]
    RT[(RTDB<br/>order_items/{stationId})]
    FN[Cloud Functions<br/>onOrderCreated, onOrderItemUpdated,<br/>confirmManualPayment, *Login, reports…]
  end

  subgraph BFF Cloud Run
    PAY[/payments/init + callback]
    AI[/ai/plan + apply]
    ZV[/zaveli/tools]
    CAT[/catalog, /auth → Odoo]
  end

  CW -- "crea orden (batch, totales calculados en el cliente)" --> FS
  WW -- "crea orden, Cobrar (updateDoc), cerrar" --> FS
  AD -- "estados (updateDoc), callables" --> FS
  KW -- "lee/escribe tickets" --> RT
  KW -- "estado de ítems" --> FS
  FS -- "onOrderCreated: enruta y espeja" --> RT
  FS -- "onOrderItemUpdated: in_preparation / ready" --> FS
  CW -- "tarjeta (apagado)" --> PAY
  PAY -- "approved → confirmed + espejo RTDB + Odoo" --> FS
  AD --> AI
  Zaveli((Zaveli)) --> ZV --> FS
  CAT -. "solo waiter_app Flutter" .-> Odoo[(Odoo opcional)]
```

Lo que está bien integrado: el ciclo pedido → enrutamiento → KDS → `ready` es consistente y vive
en Functions; el PIN y los claims (`orgId`, `role`, `stationId`) aíslan RTDB y Storage; el split
dev/prod con `--mode <projectId>` y el guard de Vite impiden builds cruzados; Odoo quedó opcional
por org.

Lo que no: las **reglas de negocio viven en los clientes**. Estados, totales y pagos se escriben
con `updateDoc`/`writeBatch` desde el navegador, y las reglas de Firestore no validan campos.

---

## 4. Hallazgos, por severidad

### 4.1 Explotables hoy en prod

1. **Un cliente anónimo puede crear órdenes en cualquier org con cualquier contenido.**
   `firestore.rules` `canCreateInOrg` permite `create` a cualquier autenticado sin doc de usuario
   y sin validar campos. Puede poner precios arbitrarios, `status: 'pending'` para saltarse el
   prepago, `payment.status: 'paid'` o el `createdByUid` de otro. Los totales los calcula el
   navegador (`customer_web/src/lib/api.ts`).
2. **Credenciales de Odoo legibles por todo el staff.** `organizations/{orgId}` guarda
   `odooPassword` y la regla da `read` a cualquier usuario de la org (meseros, tablets de cocina).
   El comentario en `app/core/odoo.py` dice "solo BFF/Functions"; no es cierto.
3. **Órdenes de Zaveli y de `client_app` nunca llegan a cocina.** `on-order-created.ts:116-119`
   solo espeja a RTDB si `source` es `waiter` o `qr`; Zaveli escribe `source: 'zaveli'` y
   `client_app` no escribe `source`. La orden queda `confirmed` en Firestore y el KDS (solo RTDB)
   no la ve.
4. **Ingresos con tarjeta no se contabilizan** (ver §1: `approved` vs `paid`).
5. **Fallback de Odoo que nunca se salta** (probable; verificar variables del servicio en
   Cloud Run). `config.py` trae `odoo_url` y `odoo_db` con valores por defecto no vacíos y
   `deploy/env/*.env` no define `ODOO_*`, así que `odoo_client_for_org` devuelve siempre un
   cliente apuntando a `localhost:8069`: cada callback de tarjeta paga reintentos contra nada y
   `/auth/login` y `/admin/sync-catalog` responden 502.
6. **`recoverOrder` sin límite de intentos.** Código `P-XXXX` sobre 29 símbolos (≈707 k
   combinaciones), búsqueda global sin `branchId` obligatorio: se puede reclamar la orden de otro
   cliente por fuerza bruta.
7. **Caché de catálogo del BFF sin clave por org.** `catalog/service.py` `get_products` guarda un
   único `_products_cache` global: el primer tenant que lo llena se sirve a los demás durante el
   TTL. Hoy no hay caller de `GET /catalog/products`, así que es latente.
8. **`waiter_demo`**: contraseña en `localStorage`, apunta a prod.

### 4.2 Latentes (solo con pago con tarjeta activo; en prod `VITE_PAYMENTS_ENABLED=false`)

9. **`POST /payments/init` acepta el monto del cliente** sin comprobar que la orden exista, esté
   en `pending_payment` ni que el monto coincida con `total`. Pagar 0.01 libera la orden.
10. **Callback de PagueloFácil sin firma** y sin verificación server-to-server configurada:
    un GET forjado marca cualquier orden como `confirmed` o `payment_failed`. Ya documentado en
    `docs/PAYMENTS.md` §3 como bloqueante de go-live; sigue abierto.
11. **Mezcla de claims**: el BFF lee `org_id`/`branch_id` (solo en tokens que él mismo emite);
    los tokens de staff llevan `orgId`. Un admin llamando `/admin/sync-catalog` cae en
    `settings.org_id` (tenant equivocado).

### 4.3 Inconsistencias (no son seguridad, pero cuestan bugs)

- `waiter_web` cierra desde `ready` (`closeOrder`), `admin_app` solo desde `delivered`;
  `delivered` solo existe en admin.
- `OrderStatus` distinto en cuatro `types.ts` (admin y customer conocen `paid`/`payment_failed`,
  waiter no; `packages/core` tampoco y convierte lo desconocido en `pending`).
- Lógica de creación de orden duplicada en `customer_web` y `waiter_web` con redondeo distinto.
- El ticket RTDB se construye en `functions/src/orders/kds-ticket.ts` y, a mano, en
  `payments/service.py` (`tableNumber` `"?"` vs `""`, sin FCM).
- Cancelar una orden no cancela ítems ni tickets RTDB.
- `FIREBASE_SCHEMA.md` no documenta `source`, `pickupCode`, `customerName`, `createdByUid`,
  `zaveli.*`, los estados `paid`/`payment_failed`, ni `odoo*` en la org.
- Docs que se contradicen: `INTEGRATION_ARCHITECTURE.md` describe un webhook HMAC
  `/webhooks/paguelofacil` que no existe (el real es `/payments/callback` sin firma, y
  `app/webhooks/` está vacío); `NEXT_STEPS.md` factura vía Odoo, `ODOO_ROLE.md` vía PAC;
  `DEPLOYMENT.md` BFF en VM con docker-compose, los scripts lo despliegan en Cloud Run;
  `CLAUDE.md` pinnea React 18/firebase 10 y `admin_app` usa React 19/firebase 12.
- Índice `collectionGroup: items` para una colección que no existe.
- Sin CI. Sin tests del camino de pago (`handle_callback`, `/payments/init`, `recoverOrder`,
  reportes).

---

## 5. Evaluación de la arquitectura

**La forma es correcta para esta escala y no hay que reescribir nada.** Firebase como capa
operativa en tiempo real (Firestore + RTDB para el KDS + Functions), apps web estáticas en Hosting
y un BFF en Cloud Run para lo que necesita secretos o terceros (pagos, IA, Zaveli, Odoo, y ahora
factura) es un diseño sano, barato y escalable a decenas de restaurantes sin cambiar de
plataforma. El aislamiento por `orgId` existe en todas las colecciones y el split dev/prod está
bien resuelto.

**La debilidad es dónde se aplican las reglas**, no la plataforma. Tres síntomas del mismo
problema: pagos y estados escritos desde el navegador, reglas sin validación de campos, y
duplicación de tipos y lógica entre cuatro apps web sin paquete compartido. Mientras eso siga
así, cada feature nueva (factura, propinas, cancelaciones) se implementa tres veces y queda
expuesta.

### Cambios recomendados, en orden

| # | Cambio | Tamaño | Qué resuelve |
|---|---|---|---|
| 1 | Callable `recordPayment` + trigger `onOrderPaid`; BFF escribe `'paid'`; `waiter_web` y admin dejan de escribir pago | M | §1, hallazgos 4 y el hook de factura |
| 2 | Reglas de Firestore con validación de campos en `orders`/`order_items` (crear: `status` solo `pending`/`pending_payment`, sin `payment.status`, `createdByUid == uid()`; update: campos permitidos por rol). Quitar `odoo*` del doc de org a un subdoc solo-servidor | M | Hallazgos 1 y 2 |
| 3 | Totales calculados en servidor: `onOrderCreated` recalcula `subtotal/tax/total` desde `products` y sobrescribe lo del cliente | M | Hallazgo 1 |
| 4 | Espejar a RTDB por estado (`confirmed` y no en espera de pago), no por `source` | S | Hallazgo 3 (Zaveli, client_app) |
| 5 | `packages-ts/` compartido: tipos, `OrderStatus`, `FirestorePaths`, init de Firebase, `createOrder` | M | §4.3, cada feature una sola vez |
| 6 | Transiciones de estado en un solo sitio (callable `transitionOrder` o trigger) y unificar `ready → delivered → closed` entre admin y waiter | S | §4.3 |
| 7 | Sanear BFF: `odoo_url` vacío por defecto, caché por org, claims `orgId`, `/payments/init` lee monto de la orden, callback con verificación S2S antes de encender tarjeta | S–M | Hallazgos 5, 7, 9–11 |
| 8 | `recoverOrder`: exigir `branchId`, limitar intentos por uid | S | Hallazgo 6 |
| 9 | CI mínimo (build de las 5 webs + `tsc` de functions + pytest unit) y tests de pago | M | Red de seguridad para todo lo anterior |
| 10 | Archivar formalmente Flutter (`apps/*_app`, `packages/core`) y borrar `waiter_demo`; actualizar `CLAUDE.md`, `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `FIREBASE_SCHEMA.md` | S | Que las docs digan la verdad |

Después de 1–4 el sistema está listo para colgar la factura electrónica del evento de pago
(`docs/DIGIFACT_EVALUATION.md`, opción A). Antes de 1–2 no conviene emitir documentos fiscales:
se emitirían facturas sobre totales que el cliente puede manipular.

### Sobre el PAC

La decisión del 2026-07-12 eligió Alanube; el token de sandbox nunca llegó. Digifact queda como
candidato principal porque hay credenciales de prueba en mano y el flujo está verificado. Si el
cliente Digifact se escribe detrás de una interfaz mínima (`certify`, `cancel`, `get`), cambiar
de PAC después es barato; no construir más que eso.

---

## 6. Próximo paso sugerido (solo en dev)

Cambios 1 y 2 de la tabla, en una rama `feat/issue-N-server-side-payment`, desplegados y
probados en `restaurant-os-dev-49096` con el flujo completo (pedido por link → Cobrar en
`waiter_web` → reporte en admin). Nada a prod hasta que se pida.
