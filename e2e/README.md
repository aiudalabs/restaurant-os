# e2e: recorridos Playwright contra DEV (Pick & Eat)

Batería de punta a punta que maneja las apps **realmente desplegadas en dev** con un navegador y comprueba el
estado en Firestore/RTDB por REST. Solo dev (`restaurant-os-dev-49096`); **nunca prod**. No corre en CI.

| App | URL |
|---|---|
| Cliente | https://restaurant-os-dev-pedir.web.app/?org=07OfcB2trnuJlb7XBIZn&branch=rnYMQIjihcRQYFwCmPND |
| Mesero | https://restaurant-os-dev-mesero.web.app/?branch=rnYMQIjihcRQYFwCmPND |
| Cocina | https://restaurant-os-dev-cocina.web.app/?station=fiscal-demo-cocina |
| Admin | https://restaurant-os-dev-49096.web.app |

## Cómo correrla

Requisitos: Node 20+, Google Chrome instalado (o `E2E_CHANNEL=chromium` tras `npx playwright install chromium`) y
`gcloud` con sesión de `admin@aiudalabs.com` (`gcloud auth login`).

```bash
make e2e-dev                         # instala (npm ci) y corre los 6 recorridos
cd e2e && npx playwright test tests/03-mesero-efectivo-descuento.spec.mjs   # uno solo
E2E_HEADED=1 make e2e-dev            # con ventana, para mirar
make e2e-dev-cleanup                 # solo limpieza, tras una corrida interrumpida
```

Un recorrido tarda 1 a 3 minutos; el de factura espera hasta 3 minutos a Digifact. No hay `sleep`: se usa la
auto-espera de Playwright y `expect.poll` contra Firestore.

## Qué hace cada recorrido (`tests/`)

1. `01-pedido-al-retirar-cocina`: el cliente pide desde el menú y elige pagar al retirar, ve su número `P-XXXX`, el
   pedido aparece en el KDS, cocina lo prepara y lo marca listo, el seguimiento muestra «Listo para retirar».
2. `02-yappy-manual-confirmacion`: pedido pagado por Yappy manual queda en «Esperando pago», el mesero toca «Pago
   recibido» y el pedido pasa a cocina (la UI del cliente no ofrece Yappy en esa sucursal: ver «Hallazgos»).
3. `03-mesero-efectivo-descuento`: el mesero crea un pedido por nombre, aplica un descuento configurado, cobra en
   efectivo; los totales se contrastan con un cálculo independiente (por línea, centavos).
4. `04-factura-con-ruc`: el cliente pide factura con RUC, el mesero cobra, se espera `fiscal.status = issued` con
   número, CUFE y PDF (Digifact de pruebas).
5. `05-admin-pedidos`: login del admin y la pantalla Pedidos lista y detalla un pedido.
6. `06-club-puntos`: tras un pedido cobrado, el seguimiento anuncia los puntos y Mi Club muestra puntos, sello y nivel.

## Qué crea y cómo lo deja

`global-setup.mjs` crea **solo en dev**, con Identity Toolkit/Firestore REST y el token de gcloud (patrón de
`tools/reset_user_password.py`, con `x-goog-user-project`):

- un admin y un mesero temporales (`users/{uid}` con `e2eTemp: true`; los claims los pone el trigger
  `syncStaffClaims`; se espera con sondeo de `accounts:lookup`),
- el PIN del mesero y de la estación `fiscal-demo-cocina` con las callables `setWaiterPin` / `setStationPin`
  (iniciando sesión como el admin temporal),
- un descuento `e2e-temp-…` en `organizations/{org}.discounts` solo si la organización no tiene uno activo sin cédula.

Contraseñas y PINs son aleatorios, viven solo en `process.env` de la corrida y no se imprimen ni se escriben a disco.
Las trazas y el video están desactivados porque grabarían los PINs que se teclean; las capturas solo se guardan al
fallar. Todo pedido de la batería se llama `E2E-<corrida>-<flujo>`.

**Limpieza** (`global-teardown.mjs`, también `npm run cleanup` y también si el setup falla): borra pedidos
`E2E-…`, sus `order_items`, `audit_log`, `loyalty_events/members/vouchers`, tickets del KDS en RTDB, PDF/XML de factura
en Storage, las sesiones anónimas de los clientes, los usuarios temporales con su `staff_pins`, y quita el descuento
de prueba. Cada recurso se anota **antes** en `e2e/.auth/manifest.json` (ignorado por git) y la limpieza además
barre por marcas, así que sirve tras un crash. Al terminar cuenta los restos y **falla la corrida si no son 0**.

### Lo único existente que se toca (y se restaura)

`setStationPin` **reemplaza** `kds_pins/fiscal-demo-cocina`. El setup guarda el documento original tal cual en el
manifest y el teardown lo **restaura byte a byte** (nunca lo borra). Mientras corre la batería el PIN real de esa
estación **no funciona**; no la corras mientras alguien use ese KDS. Si la corrida muere, `npm run cleanup` lo restaura.

### Efectos que no se pueden deshacer

Cada pedido cobrado en la organización pide factura (`fiscal.enabled`). Por eso una corrida consume correlativos
de `branches/{id}.fiscal.nextNumber` de la sucursal real, crea documentos en el sandbox de Digifact (sin valor
fiscal, `env: test`) y puede refrescar el token de `private/digifact`. Se borran los PDF/XML de Storage y el pedido,
pero el correlativo y lo del PAC permanecen.

## Fuera de alcance (no automatizable)

- Escaneo de QR y de cámara (QR de socio del Club, `MemberScanSheet`).
- Yappy real (solo se prueba la confirmación manual del mesero).
- Google Wallet.
- Impresión (`printPdf`).
- Pago con tarjeta (PagueloFácil): `VITE_PAYMENTS_ENABLED=false` en dev.

## Hallazgos conocidos

- La sucursal de Pick & Eat en dev tiene `yappyHandle: ""` y `allowPayAtPickup: false`, y la tarjeta está
  desactivada, así que la UI del cliente solo ofrece «Al retirar» (por el respaldo «nada configurado»). El recorrido 2
  siembra el pedido Yappy por REST con la sesión anónima de un cliente (las reglas sí se aplican, con la misma forma
  que escribe `createOrder`) y comprueba el resto por la UI real.
- **Yappy manual no llega al KDS en dev** (el recorrido 2 falla a propósito). `confirmManualPayment` deja el pedido
  `confirmed`/`paid`, pero `onOrderPaid` (función v2, corre como `807685538005-compute@developer.gserviceaccount.com`)
  escribe a RTDB con credenciales inválidas (`@firebase/database: FIREBASE WARNING: Provided authentication
  credentials ... are invalid`), no espeja el ticket y nunca llega a `audit_log`, puntos ni factura. Las funciones v1
  corren como `restaurant-os-dev-49096@appspot.gserviceaccount.com` (`roles/firebase.admin`); la cuenta de cómputo
  solo tiene `datastore.user`. Antes de desplegar `onOrderPaid` a prod hay que dar a su cuenta de servicio acceso a RTDB.
- Un pedido con descuento no se puede facturar: el BFF lanza `FiscalConfigError` («estructura NUC Discounts pendiente,
  issue #81») y `fiscal.status` queda en `error`. El recorrido 3 lo registra como caracterización.
- El admin con rol `admin` ve todas las sucursales de la organización (no solo sus `branchIds`) y arranca en la
  primera; el recorrido 5 elige «Pick & Eat» en el selector.

## Archivos

`playwright.config.mjs`, `global-setup.mjs`, `global-teardown.mjs`, `cleanup.mjs`, `lib/` (`env`, `gcp`,
`manifest`, `cleanup`, `ui`), `tests/*.spec.mjs`. Sin dependencias salvo `@playwright/test`.
