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

## Pendiente

- Desplegar el BFF con este dominio (Cloud Run) y una URL `https` pública; secreto en Secret Manager.
- Persistir los eventos (hoy solo log + dedupe en memoria) y actuar sobre ellos.
- Menús de más de 20 productos: `ver_menu` corta en 20 (Zaveli admite 20 `amounts`).
