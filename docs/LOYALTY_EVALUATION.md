# Fidelización y gamificación — evaluación técnica y legal

Fecha: 2026-10-23. Contexto: Pick & Eat pide (a) avisar al cliente cuando su pedido está listo,
(b) teléfono obligatorio, (c) descuentos y (d) un sistema de fidelización/gamificación con QR y
puntos. La duda central es si todo esto se puede sostener sobre apps web instaladas (PWA) o si
obliga a una app móvil nativa.

## 1. Veredicto

Sí se puede sobre PWA, y es lo recomendado para arrancar. Todo lo que pide la fidelización
(identidad del cliente, acumular y canjear puntos, QR, retos, sellos, tarjeta en la billetera
del teléfono, aviso de «pedido listo») funciona hoy desde el navegador. La única pérdida real
frente a una app nativa es la notificación push en iPhone cuando el cliente **no** instaló la
PWA; eso se cubre con WhatsApp (ver `docs/ARCHITECTURE_REVIEW_2026-10.md` y la nota de requests
del 2026-10-22) y con la tarjeta en Apple/Google Wallet, que sí recibe actualizaciones.

Si más adelante hace falta presencia en App Store / Play Store, el camino es envolver
`customer_web` con Capacitor (misma base de código React), no revivir `client_app` en Flutter.

## 2. Qué puede y qué no puede una PWA hoy (verificado 2026-10)

| Capacidad | Android (Chrome) | iPhone (Safari / PWA instalada) | Impacto |
|---|---|---|---|
| Push «pedido listo» | Sí, incluso sin instalar | Solo PWA instalada en pantalla de inicio (iOS ≥ 16.4); permiso tras un toque del usuario | Fallback: WhatsApp |
| Cámara (`getUserMedia`) | Sí | Sí (Safari y PWA instalada) | Escanear QR del cliente desde `waiter_web` |
| `BarcodeDetector` nativo | Sí | **No** (deshabilitado por defecto hasta iOS 26.x) | Usar librería JS/WASM (p. ej. jsQR o ZXing); dependencia nueva, consultar antes de agregar |
| Tarjeta en Google Wallet | Enlace «Add to Google Wallet» con JWT firmado desde web | — | Sin app; cuenta en Google Wallet Business Console |
| Tarjeta en Apple Wallet | — | `.pkpass` descargado desde web; actualizaciones vía APNs + web service | Sin app; requiere Apple Developer Program (pago anual) y certificado Pass Type ID |
| Instalación | Prompt nativo (ya tenemos `InstallCard`) | Manual «Añadir a inicio»; desde iOS 26 abre como app por defecto | Ya resuelto por `customerManifest` por sucursal |
| Identidad persistente | Firebase Auth: anónimo → `linkWithCredential` con teléfono (OTP) | Igual | Roadmap fase 3 ya lo contempla |
| Offline / almacenamiento | Sí | Sí, con límites de Safari | Irrelevante para este caso |

Conclusión técnica: nada de la lista exige una app nativa.

## 3. Diseño propuesto sobre lo que ya existe

### Identidad
- Paso 0: teléfono obligatorio al pedir (`customerPhone`), recordado por sesión.
- Paso 1: verificación OTP opcional (Firebase Phone Auth) para «guardar mis puntos». El
  anónimo se enlaza al teléfono; el `uid` no cambia, así que los pedidos previos de la sesión
  quedan asociados.
- Colección `customers/{uid}` (ya prevista en `docs/ROADMAP.md` fase 3): teléfono, nombre,
  consentimientos, saldo de puntos, nivel, visitas, totalSpent.

### Acumulación (sin QR)
- Los puntos se otorgan en el servidor, en `onOrderPaid` (ya es el único evento de «pagado»).
  1 punto por B/. 1 pagado (parámetro por organización). Idempotente por `orderId`.
- Ledger `loyalty_events/{id}` append-only (`earn`, `redeem`, `expire`, `adjust`) con `orderId`,
  `uid`, `points`, `by`, `at`. El saldo en `customers` se recalcula del ledger. El cliente nunca
  escribe puntos: reglas de Firestore solo lectura de lo propio.

### QR: tres usos distintos
1. **QR de sucursal → entrada** (ya existe): el cliente escanea en mesa/lobby y pide.
2. **QR del cliente**: `customer_web` muestra un QR con un token firmado de corta duración
   (y el mismo QR va en la tarjeta de Wallet). El mesero lo escanea desde `waiter_web` para
   asociar un pedido tomado en mostrador o mesa al cliente y así sumar puntos o aplicar un canje.
3. **QR en el ticket (CAFE)**: para pedidos sin app, un QR con `orderId` + firma permite
   reclamar los puntos después desde el navegador. Útil si la caja factura sin RestaurantOS;
   diferible.

### Canje
- Recompensas configurables por organización (`rewards`): «100 puntos = B/. 5», «producto X
  gratis», «10 % en la próxima». El canje genera un descuento que calcula el servidor en
  `computeTotals` y viaja a la factura (campo de descuento del NUC; hoy `Discounts: None`).
  Esto es la misma pieza que piden como «descuentos»: una sola implementación.

### Gamificación sin azar (recomendada para v1)
- Sellos/«stamp card» visual (p. ej. 8 cafés → 1 gratis).
- Rachas (3 semanas seguidas) y retos deterministas («prueba 3 platos distintos este mes»).
- Niveles por gasto (bronce/plata/oro) con beneficios fijos.
- Referidos con código (ambos ganan puntos).
- Cumpleaños: puntos extra el día indicado.

### Gamificación con azar (ruleta, raspadito, sorteos)
Ver sección 4. Técnicamente trivial; legalmente es otro régimen.

## 4. Marco legal en Panamá

### Promociones con azar — Junta de Control de Juegos (MEF)
Toda promoción en la que el premio dependa de la suerte (incluye premios instantáneos y canjes
con azar) requiere autorización previa de la Junta de Control de Juegos mediante resolución.
Trámite por apoderado legal con memorial (mecánica, duración ≤ 1 año, premios y valor de
mercado, fecha y lugar del sorteo), certificación del Registro Público, papel habilitado con
B/. 8 en timbres; plazo indicado de 6 días hábiles. Base: Decreto Ley 2 de 1998 y Resolución 59
de 1999. Fuentes de terceros mencionan además fianza por el valor de los premios y sorteo ante
notario; son antiguas, confirmar con la Junta (JCJ@mef.gob.pa).

Implicación: una «ruleta de premios» en la app es una promoción con azar. Hacerla sin resolución
es riesgo del restaurante, no de la plataforma, pero el producto debe dejarlo claro. Para v1:
solo mecánicas deterministas (puntos, sellos, retos, niveles), que no dependen de la suerte.
Dejar la ruleta como módulo que se activa por organización cuando esa organización tenga su
resolución, con la fecha de vigencia como parámetro.

### Datos personales — Ley 81 de 2019
Consentimiento previo, informado e inequívoco; finalidad determinada; derecho a revocar y a
que se eliminen los datos. Para nosotros:
- Aviso de privacidad en `customer_web` al pedir el teléfono (finalidad: avisar del pedido y,
  si acepta, fidelización/promociones).
- Opt-in separado para mensajes promocionales por WhatsApp/push; el aviso de «pedido listo»
  entra en la finalidad del servicio.
- Guardar el consentimiento con fecha en `customers`; función para borrar/anonimizar un cliente
  a petición.
- El responsable del tratamiento es el restaurante (cada organización); RestaurantOS es
  encargado. Conviene reflejarlo en los términos del SaaS.

### Fiscal
El canje de puntos es un descuento en la factura electrónica (total de descuento D06, ITBMS
sobre el neto). Un producto «gratis» por puntos se factura con descuento del 100 % de esa
línea. El tratamiento contable de los puntos acumulados (pasivo) es tema del contador del
restaurante; no afecta al software.

## 5. PWA vs. app nativa vs. envoltorio

| | PWA (hoy) | Capacitor sobre `customer_web` | App nativa (Flutter `client_app`) |
|---|---|---|---|
| Código | Uno (React) | Uno + capa nativa delgada | Dos bases (web + Flutter), `client_app` está desactualizada |
| Push iPhone | Solo instalada | Sí, siempre (FCM/APNs) | Sí |
| Tiendas | No | Sí (App Store + Play) | Sí |
| Fricción de uso | Cero (QR → pedir) | Instalar primero | Instalar primero |
| Costo recurrente | Hosting | Apple Developer anual + publicación | Igual + mantener Flutter |
| Tamaño | — | M (configurar, firmar, publicar) | XL |

Recomendación: PWA ahora. Capacitor solo si el restaurante quiere estar en las tiendas o si
el porcentaje de iPhone sin PWA instalada hace que WhatsApp no alcance.

## 6. Hoja de ruta sugerida (tamaños según `docs/ROADMAP.md`)

| Fase | Qué | Tamaño | Depende de |
|---|---|---|---|
| 0 | Teléfono obligatorio + aviso de privacidad + botón WhatsApp manual en mesero/KDS | S | — |
| 1 | `customers`, puntos automáticos en `onOrderPaid`, saldo visible en la pantalla de seguimiento, canje como descuento en `computeTotals` y en el NUC | M | Fase 0, decisión sobre «descuentos» |
| 2 | Web Push «pedido listo» (Android y PWA iOS) | M | Fase 0 |
| 3 | QR del cliente + escáner en `waiter_web` (librería JS/WASM) + tarjeta Google/Apple Wallet | M | Fase 1 |
| 4 | Sellos, rachas, retos, niveles, referidos (configurables por organización, sin azar) | M | Fase 1 |
| 5 | Ruleta/sorteos por organización con resolución de la Junta | L + legal | Fase 4 |

Prerrequisitos de proyecto: mergear #69/#70/#72; cambios de esquema (`customers`,
`loyalty_events`, `rewards`) requieren actualizar `FIREBASE_SCHEMA.md` por consenso.

## 7. Riesgos y preguntas abiertas

- Ruleta sin autorización: riesgo legal del restaurante. Resolver con la Junta antes de prometerla.
- Fraude de puntos: todo cálculo en servidor, ledger inmutable, un canje por `orderId`, límite
  de puntos por día por cliente.
- Multi-tenant: puntos por organización, nunca cruzados entre restaurantes salvo que se decida
  un programa de cadena.
- Apple Wallet: costo anual de Apple Developer Program y mantenimiento de certificados; evaluar
  si Google Wallet + PWA basta para el público de Pick & Eat.
- Qué entiende Pereda por «descuentos» (promocional, manual en caja o códigos): cambia la fase 1.

## Fuentes

- Autorización de Promociones Comerciales, Panamá Digital (JCJ/MEF): https://www.panamadigital.gob.pa/InformacionTramite/autorizacion-de-promociones-comerciales
- Secretaría Ejecutiva Junta de Control de Juegos, MEF: https://www.mef.gob.pa/secretaria-ejecutiva-junta-de-control-de-juegos/
- Decreto Ley 2 de 1998: https://www.mef.gob.pa/wp-content/uploads/2021/03/JCJ_Ley-2-de-10-feb-1998-Gaceta-23484.pdf
- Ley 81 de 26 de marzo de 2019: https://www.sinaproc.gob.pa/wp-content/uploads/2026/08/Ley-81-de-26-de-marzo-de-2019.pdf
- Web Push en iOS (PWA instalada, iOS ≥ 16.4): https://lumapush.com/blog/safari-ios-web-push-notifications-guide y https://tappwa.com/blog/ios-pwa-limitations-2026
- BarcodeDetector, soporte por navegador: https://caniuse.com/mdn-api_barcodedetector
- Google Wallet, tarjetas de lealtad desde web (JWT): https://developers.google.com/wallet/retail/loyalty-cards/web
- Apple Wallet passes y actualizaciones: https://docs.pushwoosh.com/product/messaging-channels/apple-wallet-passes/
