# Zaveli — herramientas de RestaurantOS para el agente conversacional

Zaveli conversa con los clientes de un restaurante y, cuando el agente necesita algo
de RestaurantOS, llama por HTTP a una URL nuestra con el cuerpo firmado. Nada nuestro
corre en Zaveli y Zaveli no escribe en nuestra base. Fuente de verdad del contrato:
la guía de integración de Zaveli (pasos 0–8). Issue #59.

## Qué hay

- `apps/fastapi_bff/app/zaveli/` — dominio del BFF:
  - `POST /zaveli/tools`: todas las herramientas (el cuerpo dice cuál). Firma HMAC-SHA256
    (`Zaveli-Signature`, ventana de 300 s) verificada sobre los bytes recibidos antes de
    leer el JSON; `Idempotency-Key` debe ser igual a `operation_id` (si no, 400).
    Siempre `200` con `{status, message_code, …}` cuando la llamada es auténtica.
  - `POST /zaveli/events`: eventos firmados, deduplicados por `event_id` (en memoria
    del proceso), `204`. Hoy solo se registran en el log.
  - `GET /zaveli/health`: Firestore alcanzable, proyecto y si hay secreto.
  - `tools/*.json`: la declaración que se registra en Zaveli (`PUT /v1/integration/tools/{name}`).
- `tools/seed_zaveli_demo.py` — restaurante ficticio en dev (`zaveli-demo-org`,
  sucursal `zaveli-demo-branch`, 5 productos, sin estaciones: modo mostrador).
- `scripts/zaveli-endpoint.sh start|stop|status` — corre el BFF en `127.0.0.1:8040`
  contra Firestore **dev** únicamente.

## Herramientas

| Nombre | Efecto | Argumentos | Respuesta |
|---|---|---|---|
| `ver_menu` | read | ninguno | productos activos del menú de la sucursal (máx. 20), `amounts` = precios distintos |
| `crear_pedido` | write | `productos`: un código de `ver_menu` por unidad (1–20); `nombre?`, `notas?` | pedido `pending` para retirar y pagar al retirar; subtotal, impuesto de la sucursal y total calculados aquí con los precios de Firestore |
| `estado_pedido` | read | `pedido`: código `Z-XXXXXXXX` | estado del pedido (en español) y total |

- El negocio sale del contexto firmado: `business_ref` (el `external_ref` del negocio en
  Zaveli) es el `branchId`. Sin sucursal activa: `REJECTED business_not_configured`.
- Un pedido solo se consulta desde el mismo negocio de Zaveli que lo creó
  (`orders.zaveli.businessId`).
- **Idempotencia:** el id del pedido (`orders/zaveli_XXXXXXXX`) y su código salen de un
  hash de `business_id` + `operation_id`. El pedido, sus `order_items` y la respuesta
  exacta (`orders.zaveli.reply`) se crean en una transacción; una repetición devuelve
  esa respuesta y no crea nada. Las lecturas se recalculan (no tienen efecto).
- Las sondas de conformidad (`context.conformance: true`) responden lo mismo sin escribir.
- Campos nuevos en `orders` (como `source`/`pickupCode` de customer_web, fuera de
  `FIREBASE_SCHEMA.md`): `source: "zaveli"`, `pickupCode`, `customerName`,
  `zaveli: {operationId, businessId, conversationId, reply}`.

## Correrlo en local (dev)

```sh
# Una vez: venv del BFF y datos ficticios en dev
uv venv --python 3.12 apps/fastapi_bff/.venv
uv pip install --python apps/fastapi_bff/.venv/bin/python -r apps/fastapi_bff/requirements.txt
ROS_PROJECT=restaurant-os-dev-49096 python3 tools/seed_zaveli_demo.py --yes

# Config local, fuera de Git (apps/fastapi_bff/.zaveli-dev/ está en .gitignore)
#   apps/fastapi_bff/.zaveli-dev/.env
#     FIREBASE_PROJECT_ID=restaurant-os-dev-49096
#     ZAVELI_SIGNING_SECRETS=zsk_…        # el secreto del paso 2; nuevo,anterior en una rotación

scripts/zaveli-endpoint.sh start    # espera a /zaveli/health y comprueba que el proyecto es dev
scripts/zaveli-endpoint.sh status
scripts/zaveli-endpoint.sh stop
```

Firestore se usa con Application Default Credentials (`gcloud auth application-default login`).
El script nunca hereda el `.env` del BFF (que apunta a prod).

Registro en Zaveli: `endpoint_url = http://127.0.0.1:8040/zaveli/tools`,
`events_url = http://127.0.0.1:8040/zaveli/events` (Zaveli en modo desarrollo acepta
`http://127.0.0.1`; en producción exige `https` pública).

## Cómo sabe Zaveli qué restaurante es

Cada restaurante es un **negocio** de Zaveli cuyo `external_ref` es el `branchId` de la
sucursal en RestaurantOS. Zaveli manda esa referencia en cada llamada, dentro del contexto
firmado (`context.business_ref`); el modelo no la escribe ni la puede cambiar.
`_branch_for` (`app/zaveli/service.py`) lee `branches/{business_ref}`, y de ahí salen la
organización, el menú, el impuesto y dónde se crea el pedido.

## Agregar un restaurante

La integración es de la organización de Zaveli: una URL, un secreto y las mismas
herramientas sirven a **todos** sus negocios a la vez, cada uno con su propio chat. Agregar
un restaurante no cambia código ni pide otra conformidad.

1. **RestaurantOS (dev):** una sucursal activa con menú y productos (desde el panel o con
   un seed como `tools/seed_zaveli_demo.py`). Apunta su `branchId`.
2. **Zaveli — el negocio**, con `external_ref` = ese `branchId`:
   ```sh
   set -a; . ~/.zaveli-restaurantos/zaveli.env; set +a
   curl -sS -X POST "$ZAVELI_URL/v1/businesses" \
     -H "Authorization: Bearer $ZAVELI_API_KEY" -H "Content-Type: application/json" \
     -d '{"name": "Otro Restaurante", "timezone": "America/Panama", "data_class": "standard",
          "jurisdiction": "PA", "capabilities": ["integration"], "external_ref": "<branchId>"}' | jq -r .id
   ```
   A un negocio que ya existe: `PUT /v1/businesses/{id}/capabilities/integration` y
   `PUT /v1/businesses/{id}/external-ref` con `{"external_ref": "<branchId>"}`.
3. **Comprobar** que recibe las herramientas (las tres con `included: true`):
   ```sh
   curl -sS "$ZAVELI_URL/v1/businesses/<business_id>/integration" \
     -H "Authorization: Bearer $ZAVELI_API_KEY" | jq
   ```
4. **Su chat web:**
   ```sh
   curl -sS -X POST "$ZAVELI_URL/v1/businesses/<business_id>/channel-connections" \
     -H "Authorization: Bearer $ZAVELI_API_KEY" -H "Content-Type: application/json" \
     -d '{"channel": "webchat"}' | jq -r .id
   ```
   Chat de pruebas: `http://localhost:5183/demo/?connection=<connection_id>`.

Límites:
- Un negocio por sucursal: `external_ref` es único en la organización de Zaveli
  (409 `external_ref_taken`). Dos sucursales de una cadena son dos negocios.
- Las llamadas a las herramientas cuentan en el uso de la organización de Zaveli, sumando
  todos sus negocios.
- El endpoint local lee solo Firestore de dev.
- `ver_menu` devuelve como mucho 20 productos.

## Demo en dev (2026-10-14)

| Qué | Valor |
|---|---|
| Organización / sucursal RestaurantOS | `zaveli-demo-org` / `zaveli-demo-branch` |
| Negocio Zaveli (`business_id`) | `1e81726b-bd89-4afa-aa3b-1ac829d4bcb6` |
| Chat web (`connection_id`) | `fb94c00c-effa-4d32-af88-92f6cfc1d4c4` |
| Panel (admin de la sucursal) | https://restaurant-os-dev-49096.web.app — usuario `admin@zaveli-demo.test` (la contraseña no se guarda en el repo) |

## Pendiente

- Desplegar el BFF con este dominio (Cloud Run) y una URL `https` pública; secreto en Secret Manager.
- Persistir los eventos (hoy solo log + dedupe en memoria) y actuar sobre ellos.
- Menús de más de 20 productos: `ver_menu` corta en 20 (Zaveli admite 20 `amounts`).
