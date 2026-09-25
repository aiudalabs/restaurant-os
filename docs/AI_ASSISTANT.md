# AI Assistant — "Arma tu restaurante hablando" (propuesta)

> Estado: **propuesta / no implementado**. Fuente de verdad del flujo Odoo↔Firebase sigue
> siendo `INTEGRATION_ARCHITECTURE.md`. Este doc define cómo añadir una capa de IA
> conversacional para construir la configuración (sucursales, estaciones, menús,
> categorías, productos) desde un chat.

## 1. La idea

El dueño abre un chat en el panel admin y escribe en lenguaje natural:

> "Acabo de crear mi sucursal. Créame dos estaciones: cocina y bar. Y un menú que se
> llame *Menú de la casa* con categorías Pizzas y Bebidas. Aquí va un CSV con los
> productos."

La IA entiende la intención, arma un **plan de acciones**, se lo muestra al dueño para
confirmar, y al confirmar **construye todo en Firestore** reusando las mismas operaciones
validadas que ya usa el admin.

## 2. Principio de diseño (no negociable)

**El modelo NUNCA escribe en la base de datos.** Solo traduce lenguaje natural →
*plan estructurado*. La ejecución es **código determinístico** del BFF que reusa el
esquema y las reglas existentes. Esto preserva todas las invariantes del sistema
(aislamiento por org, rutas de Firestore, forma de los documentos) porque las
"herramientas" de la IA son las mismas funciones de servicio que ya existen.

El CSV lo parsea el **BFF** (determinístico), no el modelo. El modelo, a lo sumo,
mapea nombres de columnas si el CSV viene raro.

## 3. Arquitectura

Vive en el **FastAPI BFF** — ya es el puente seguro server-side con Firebase Admin y
corre en Cloud Run con service account. Nuevo dominio `app/ai/`
(`router.py` / `service.py` / `tools.py` / `models.py`), siguiendo la regla de un dominio
por carpeta. El panel admin gana un feature `features/ai-assistant` (panel de chat).

### Flujo (dos fases: proponer → confirmar → ejecutar)

```
Admin (chat + CSV opcional)
   │  POST /ai/plan   (Firebase ID token + mensaje + filas CSV parseadas)
   ▼
BFF  ── verifica token → deriva orgId + contexto (sucursales/menús existentes)
     ── llama Gemini 2.5 Flash con response_schema = BuildPlan
     ── devuelve el PLAN estructurado (no escribe nada todavía)
   ▲
Admin ── muestra el plan como checklist:
         "Voy a crear: 2 estaciones (Cocina, Bar) · 1 menú 'Menú de la casa'
          con Pizzas y Bebidas · 24 productos del CSV"
   │  POST /ai/apply  (plan confirmado)
   ▼
BFF  ── ejecuta cada acción DETERMINÍSTICAMENTE (Firebase Admin, orgId del token)
     ── reporta progreso por acción (✅/❌) y devuelve el resultado
```

### Herramientas / acciones v1 (solo creación)

```
create_stations(names: string[])                         → stations/{id}
create_menu(name: string, categories: string[])          → menus/{id} + categories/*
import_products(menuName|menuId, rows: ProductRow[])      → products/*
```

`ProductRow = { name, price, category, description?, imageUrl? }`.

**Sin herramientas destructivas en v1** (nada de borrar/editar desde la IA). Eso llega en
una fase posterior, siempre detrás del gate de confirmación.

### Modelo y config

- **Gemini 2.5 Flash** (barato, rápido, soporta salida estructurada / function calling).
- `temperature` baja, **salida estructurada** con `response_schema` = `BuildPlan`.
- Un solo llamado al modelo por plan (no loop de function-calling) → costo acotado.
- **Autenticación recomendada: Vertex AI vía ADC** — el BFF ya corre con service account
  en GCP, así que el SDK `google-genai` puede usar el backend Vertex AI **sin API key que
  rotar**. Alternativa: API key de Google AI Studio como secreto en Secret Manager.

## 4. Análisis adversarial (riesgos → mitigación)

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | La IA borra/rompe datos | v1 solo tiene herramientas de **creación**; nada destructivo |
| 2 | Fuga entre tenants (crear en otra org) | `orgId` SIEMPRE del **ID token verificado**, nunca de los args del modelo |
| 3 | Alucinación de datos (precios, productos inventados) | CSV parseado por el BFF; **preview + confirmación humana** antes de escribir |
| 4 | Prompt injection (ej. nombre de producto malicioso) | Herramientas solo-crear + confirm gate → no puede escalar privilegios |
| 5 | Costo / loops infinitos | Un solo llamado (salida estructurada), no loop; modelo Flash; rate-limit por org |
| 6 | Fallo parcial (falla la acción 3 de 5) | Ejecución secuencial idempotente + reporte por acción; reintentar solo la fallida |
| 7 | Duplicados (menú/categoría ya existe) | El plan chequea contexto y marca "usar existente" vs "crear nuevo" |
| 8 | Tamaño abusivo (CSV de 10k filas) | Límite v1 (≤ 500 filas); rechazo temprano con mensaje claro |

## 5. Fases

- **Fase 1 — POC (~medio día):** `/ai/plan` + `/ai/apply` con las 3 acciones + chat mínimo
  en el admin. Dictado por texto (sin CSV todavía).
- **Fase 2 — CSV:** subida de CSV → parse en BFF → preview → import masivo.
- **Fase 3 — más acciones:** editar/eliminar (con confirm), setear PIN de estación,
  cambios de precio masivos, "duplica el menú de la sucursal X en la Y".
- **Fase 4 — UX avanzada:** streaming de respuestas, memoria de conversación, acciones
  multi-paso encadenadas.

## 6. Qué hace falta para construir

- Decidir autenticación del modelo: **Vertex AI (ADC, sin key)** — recomendado — o API key
  de AI Studio (secreto en Secret Manager). No se puede inventar una API key.
- Confirmar el modelo (`gemini-2.5-flash` por defecto).
- `google-genai` como nueva dependencia del BFF (requiere aprobación — no está en el
  listado de versiones fijas de `CLAUDE.md`).

## Fuentes
- https://ai.google.dev/gemini-api/docs/function-calling
- https://github.com/googleapis/python-genai
- https://ai.google.dev/gemini-api/docs/models
