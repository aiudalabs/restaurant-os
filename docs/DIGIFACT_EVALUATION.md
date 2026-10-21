# Evaluación: integración de Digifact (factura electrónica) en RestaurantOS

Fecha: 2026-10-21. Estado: evaluación, sin código.

## 1. Qué es Digifact (corrección de premisa)

La presentación recibida (`PRESENTACION_CORPORATIVA_261021`) **no es una solución de pago**.
Digifact es un **PAC** (Proveedor de Autorización Calificado) de factura electrónica,
autorizado por la DGI de Panamá como "DIGIFACT SERVICIOS, S.A." (Resolución 201-4219,
listado oficial: https://dgi.mef.gob.pa/_7FacturaElectronica/Proveedorespac). Opera también
en Guatemala, El Salvador, Costa Rica y República Dominicana.

Por tanto no toca `app/payments` ni reemplaza PagueloFácil/Yappy. Cubre el pendiente
**"Factura Fiscal"** de `docs/NEXT_STEPS.md`, que hoy está planteado vía Odoo
(`action_pos_order_invoice`).

## 2. Qué se verificó hoy contra el ambiente de pruebas

Con las credenciales TEST que envió Digifact (RUC `155704849-2-2021`, usuario `PICK&EAT`),
usando la documentación pública https://documentacion.digifact.com/pa/api.md (API V2.0.5,
NUC V2.0.8):

| Operación | Endpoint | Resultado |
|---|---|---|
| Token | `POST /api/login/get_token` | OK. JWT con vigencia de 30 días. Username = `PA.<RUC>.<usuario>` |
| Certificar factura JSON | `POST /api/v2/transform/nuc_json?TAXID=&FORMAT=PDF&USERNAME=` | OK (`code: 1`). Devuelve CUFE, URL del QR de la DGI (ambiente test), PDF en base64 (~300 KB), GUID |
| Duplicado (mismo NumeroDF) | mismo endpoint | Rechazado: `code 3000`, `dCodRes 1002 "Documento duplicado"`. No re-certifica en silencio |
| CPBS inválido (`99`/`9999`) | mismo endpoint | Rechazado: `code 3010`, enum `catBienes` falla. Digifact valida el catálogo CPBS contra el XSD de la DGI |
| Consultar por número | `GET /api/SHAREDINFO ... SHARED_GETDTEINFO_BYNUMDOC` | OK. Devuelve CUFE, `ESTADO_DGI: RECIBIDO_EXITOSAMENTE` |
| Info de RUC | `GET /api/GetInfoRuc?RUC=&TIPO=2` | OK. Devuelve razón social, DV y si el RUC está afiliado al SFE |
| Sucursales del emisor | `SHARED_GetInfoFiscalFEPARTNER` | OK. Lista establecimientos (`NE` 0000, 0001, …) registrados ante la DGI |

El RUC de prueba pertenece a Digifact Servicios S.A., no a Pick&Eat. La factura de prueba
sale con la leyenda "Documento de Prueba" y "sin valor comercial ni fiscal".
No se inspeccionó el portal web `testpa.digifact.com` (es la UI de autogestión; no hace falta
para la integración por API).

Documento de prueba emitido: CUFE
`FE0120000155704849-2-2021-3200012026102100291444430010127955734589`
(1 ítem "Pizza Margarita" x2, ITBMS 7 %, total 21.40, pago efectivo, receptor consumidor final).

### Request mínimo que funcionó (consumidor final)

```json
{
  "Version": "1.00",
  "CountryCode": "PA",
  "Header": {
    "DocType": "01",
    "IssuedDateTime": "2026-10-21T10:41:44-05:00",
    "AdditionalIssueType": 2,
    "AdditionalIssueDocInfo": [
      {"Name": "TipoEmision", "Value": "01"},
      {"Name": "NumeroDF", "Value": "0029144443"},
      {"Name": "PtoFactDF", "Value": "001"},
      {"Name": "CodigoSeguridad", "Value": "795573458"},
      {"Name": "NaturalezaOperacion", "Value": "01"},
      {"Name": "TipoOperacion", "Value": "1"},
      {"Name": "DestinoOperacion", "Value": "1"},
      {"Name": "FormatoGeneracion", "Value": "1"},
      {"Name": "ManeraEntrega", "Value": "1"},
      {"Name": "EnvioContenedor", "Value": "1"},
      {"Name": "ProcesoGeneracion", "Value": "1"},
      {"Name": "TipoTransaccion", "Value": "1"},
      {"Name": "TipoSucursal", "Value": "2"}
    ]
  },
  "Seller": {
    "TaxID": "155704849-2-2021",
    "TaxIDType": "2",
    "TaxIDAdditionalInfo": [{"Name": "DigitoVerificador", "Value": "32"}],
    "Name": "<razón social>",
    "Contact": {"PhoneList": {"Phone": ["997-8242"]}},
    "BranchInfo": {
      "Code": "0001",
      "AddressInfo": {"Address": "…", "City": "Juan Diaz", "District": "Panama", "State": "Panama", "Country": "PA"},
      "AdditionalBranchInfo": [
        {"Name": "CoordEm", "Value": "+8.9213,-79.7068"},
        {"Name": "CodUbi", "Value": "8-8-12"}
      ]
    }
  },
  "Buyer": {
    "TaxID": "CF",
    "TaxIDAdditionalInfo": [{"Name": "TipoReceptor", "Value": "02"}, {"Name": "CodUbi", "Value": "1-1-2"}],
    "Name": null,
    "AdditionlInfo": [{"Name": "PaisReceptorFE", "Value": "PA"}],
    "AddressInfo": {"Address": null, "City": "…", "District": "…", "State": "…", "Country": "PA"}
  },
  "Items": [{
    "Codes": [
      {"Name": "CodigoProd", "Value": "PIZZA-MARG"},
      {"Name": "CodCPBSabr", "Value": "50"},
      {"Name": "CodCPBScmp", "Value": "5019"}
    ],
    "Description": "Pizza Margarita", "Qty": 2, "UnitOfMeasure": "und", "Price": 10.00,
    "Taxes": {"Tax": [{"Code": "01", "Description": "ITBMS", "Amount": 1.40}]},
    "Totals": {"TotalBTaxes": 20.00, "TotalWTaxes": 21.40, "SpecificTotal": 21.40, "TotalItem": 21.40}
  }],
  "Totals": {"QtyItems": 1, "GrandTotal": {"TotalBTaxes": 20.00, "TotalWTaxes": 21.40, "InvoiceTotal": 21.40}},
  "Payments": [{"Type": "02", "Amount": 21.40}],
  "AdditionalDocumentInfo": {"AdditionalInfo": [{"AditionalInfo": [{"Name": "TiempoPago", "Value": "1"}]}]}
}
```

Respuesta relevante: `code`, `message`, `authNumber` (CUFE), `url` (QR DGI), `responseData1/2/3`
(XML/HTML/PDF base64), `additionalInfo.DocumentGUID`, `enrolledTimeStamp`, `infoDetails[]`
(errores `dCodRes`/`dMsgRes`). La API es case-sensitive.

## 3. Por qué importa (contexto legal)

Desde el 1 de enero de 2026 (Resolución 201-6299 de 2025) el Facturador Gratuito de la DGI solo
puede usarse con ingresos brutos anuales ≤ B/. 36,000 **y** < 100 documentos al mes. Un restaurante
normal supera ambos límites, así que necesita un PAC o software certificado. Fuentes: blogs de
proveedores (Alegra, Edicom), no la DGI directamente; verificar con contador.
Consecuencia: la factura electrónica es un requisito de los clientes de RestaurantOS, no un extra.

## 4. Opciones de arquitectura

### A. BFF → Digifact directo (recomendada)

Nuevo dominio `apps/fastapi_bff/app/fiscal/` (`router.py` / `service.py` / `models.py`) que
construye el NUC JSON a partir de la orden en Firestore y llama a Digifact. Cliente HTTP propio
(httpx ya está), credenciales por organización en `organizations/{orgId}` (mismo patrón que
`odooUrl/odooDb/…`, legibles solo por BFF/Admin SDK).

- Funciona para tenants **sin Odoo** (la mayoría hoy).
- Odoo sigue recibiendo el `pos.order` como hasta ahora; se le añade el CUFE en `note`.
- No depende de módulos de terceros ni del flujo de facturación del POS Community, que ya es frágil.

### B. Odoo → Digifact (rechazada)

Odoo no trae localización fiscal de Panamá. Hay módulos de terceros
(`l10n_pa_dgi_edi` de NEXprint, ~US$ 340/versión) que generan el XML y exigen un "conector del
PAC": existen para The Factory HKA y GuruSoft; **no hay conector Digifact** publicado. Además ese
módulo factura sobre `account.move`, no sobre `pos.order`, y la generación de factura desde POS en
Odoo 17 Community ya requiere llamar `action_pos_order_invoice` por API. Resultado: habría que
escribir y mantener un módulo Odoo, y todo tenant necesitaría Odoo. Descartada.

### Tensión con "Odoo = fuente de verdad contable"

Con A, el documento fiscal lo emite Digifact, no Odoo. El `to_invoice: True` que hoy manda el BFF
al crear el `pos.order` generaría un `account.move` que **no** es la factura fiscal. Hay que decidir
entre quitar `to_invoice` o dejar el `account.move` como registro contable interno sin numeración
fiscal. Queda como pregunta abierta.

## 5. Lo que RestaurantOS tiene que resolver (núcleo de la factibilidad)

Los bloqueos no están en la API, están en datos y operación:

1. **Numeración fiscal.** `NumeroDF` es correlativo por punto de facturación (`PtoFactDF`), 10
   dígitos, sin reinicio ni reutilización; Digifact rechaza duplicados (verificado). Hace falta un
   contador transaccional en Firestore por sucursal + punto de facturación. `FIREBASE_SCHEMA.md`
   prohíbe colecciones nuevas, así que el contador va en el doc de `branches` o se pide consenso.
   Idempotencia: persistir el número y el request antes de enviar; en reintento, consultar por
   `SHARED_GETDTEINFO_BYNUMDOC` antes de volver a emitir.
2. **`CodigoSeguridad`**: 9 dígitos aleatorios, distinto de `NumeroDF`, nunca `000000000`.
3. **Datos del emisor que no existen en el schema**: RUC, DV (no hace falta implementar el
   algoritmo: `GetInfoRuc` lo devuelve), razón social, tipo de contribuyente, teléfono. Por
   sucursal: código de establecimiento que **debe coincidir** con uno registrado ante la DGI
   (preflight con `SHARED_GetInfoFiscalFEPARTNER`), `CodUbi` (provincia-distrito-corregimiento,
   catálogo en `GET /api/Pa/Ubicaciones`), coordenadas, dirección estructurada, `PtoFactDF`.
4. **Datos por producto**: código CPBS (`CodCPBSabr` y/o `CodCPBScmp`, obligatorio al menos uno
   para consumidor final; Digifact valida contra el catálogo, verificado) y tasa ITBMS por ítem
   (`00` exento, `01` 7 %). El catálogo CPBS no está en la documentación pública; pedirlo a
   Digifact. Para un restaurante probablemente baste un código por defecto por categoría.
5. **Formas de pago**: efectivo → `02`, tarjeta → `03`/`04`, Yappy → `08` (transferencia) o `99`
   con descripción. Cuál prefiere la DGI para Yappy: sin verificar.
6. **Receptor con RUC** (cliente que pide factura a nombre de empresa): `TipoReceptor 01` + DV,
   validar con `GetInfoRuc` (devuelve `Estado A/I` de afiliación al SFE).
7. **Anulaciones**: `POST /api/CancelFePA` o nota de crédito (`DocType 04`). La doc dice que
   `CancelFePA` solo funciona con credenciales productivas; no probado.
8. **Token**: 30 días. Cachear por org y renovar ante 401.
9. **Retención**: guardar XML y PDF (~300 KB) en Storage por factura; el cliente necesita el CUFE
   y el QR (guía CAFE de Digifact para ticket/carta).
10. **Contingencia**: Digifact tiene guía de "contingencia local" (`TipoEmision 02`); fuera de
    alcance inicial. Si la DGI está caída, Digifact encola (`ESTADO_DGI: EN_COLA_DE_ENVIO`).
11. **Multi-tenant**: cada restaurante es su propio RUC, con su propio contrato y credenciales
    productivas en Digifact. Credenciales en el doc de la organización; cualquier archivo local
    con secretos entra en `.gitignore` y `.gcloudignore`.

## 6. Requisitos no técnicos para producción

- Contrato con Digifact y precio por documento o plan: **desconocido**, preguntar a Denireth Teran
  (asesora comercial, contacto en el PDF). Soporte técnico: soporte-pa@digifact.com, +507 375-5009.
- El restaurante debe estar afiliado al SFE de la DGI (e-Tax 2.0) y entregar a Digifact su firma
  electrónica y contraseña; en test no hace falta.
- Catálogo CPBS y confirmación del código de establecimiento registrado por sucursal.

## 7. Esfuerzo estimado (orden de magnitud)

| Bloque | Estimación |
|---|---|
| BFF `app/fiscal`: cliente Digifact, builder NUC, contador, endpoint `POST /orders/{id}/invoice`, tests | 3–5 días |
| Schema + admin: datos fiscales de org/sucursal, CPBS y tasa por producto, credenciales | 2–4 días |
| Customer web / waiter: "¿Quieres factura?", mostrar CUFE + QR + PDF | 2–3 días |
| Storage de XML/PDF, envío por email | 1–2 días |
| Anulación / nota de crédito, receptor con RUC | 2–3 días (fase 2) |

Total fase 1 (consumidor final, pagos efectivo/tarjeta/Yappy): **~2 sprints**.

## 8. Recomendación

Factible. Ir con la opción A, empezando por factura a consumidor final y la emisión automática al
confirmar el pago (mismo punto donde hoy se enruta a KDS y se sincroniza Odoo, de forma asíncrona
y sin bloquear al cliente). Diferir receptor con RUC, notas de crédito y contingencia. Antes de
escribir código: resolver dónde vive el contador de numeración, pedir el catálogo CPBS y el precio.

## 8. Imprimir la factura (issue #71)

- Botón «Imprimir» junto a «Ver PDF» en `waiter_web` (tarjeta del pedido) y `admin_app`
  (detalle del pedido). Descarga el PDF de Storage como blob, lo carga en un iframe de la
  misma origen y llama a `print()`. Helper: `src/lib/print.ts` en cada app.
- **El navegador nunca imprime en silencio**: `print()` abre el diálogo del sistema. Para que
  vaya directo a la impresora por defecto sin diálogo, el PC de caja debe correr Chrome con
  `--kiosk-printing` (macOS: `open -a "Google Chrome" --args --kiosk-printing`; Windows: agregar
  el flag al acceso directo). El flag solo aplica si Chrome estaba **cerrado del todo**: un Chrome
  ya abierto ignora `--args`. Sin el flag, el botón abre el diálogo de impresión con el PDF cargado.
  La impresión en línea solo se usa en Chrome/Edge de escritorio; en Android, iPhone/iPad, Safari y
  Firefox el botón abre el PDF en una pestaña y se imprime desde el visor.
- Requiere CORS `GET` en el bucket de Storage (`storage.cors.json`, ver `docs/ENVIRONMENTS.md`).
  Aplicado en dev; **pendiente en prod**.
- El PDF que devuelve Digifact es tamaño carta (612×792 pt). Los formatos disponibles en la
  API son `XML`, `PDF` y `HTML`; no hay formato ticket. Un ticket térmico de 80 mm (CAFE en
  formato ticket) queda como tarea aparte.
