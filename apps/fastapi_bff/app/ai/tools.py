"""Gemini plan generation (Vertex AI backend, ADC — no API key).

Turns a free-text instruction into a validated BuildPlan. The model only
proposes structure; it never touches Firestore.
"""
from google import genai
from google.genai import types

from app.config import settings
from app.ai.models import BuildPlan, ChatTurn

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        # vertexai=True → authenticate with the Cloud Run service account (ADC).
        _client = genai.Client(
            vertexai=True,
            project=settings.firebase_project_id,
            location=settings.vertex_location,
        )
    return _client


SYSTEM_INSTRUCTION = """\
Eres el asistente de configuración de RestaurantOS. El dueño de un restaurante
te habla en español y tú traduces su intención a un PLAN de construcción
estructurado. NO ejecutas nada: solo describes qué crear.

Reglas:
- Devuelve SOLO los campos del esquema. No inventes cosas que el usuario no pidió.
- `stations`: nombres de estaciones de cocina/bar a crear (ej. ["Cocina", "Bar"]).
  Vacío si no menciona estaciones.
- `menu`: si pide crear un menú, pon su nombre y las categorías mencionadas
  (ej. {"name":"Menú de la casa","categories":["Pizzas","Bebidas"]}). null si no
  pide un menú nuevo.
- `products`: lista de productos a crear, cada uno con name, price, category y
  description (opcional).
    * Si el usuario pide GENERAR un menú/productos con precios (ej. "créame un
      menú de pizzas con precios de Panamá", "agrégale 5 postres típicos"),
      GENERA tú una lista realista de productos con precios apropiados en USD
      para Panamá y una breve descripción de cada uno. Asigna cada producto a su
      categoría.
    * Si el usuario adjunta un CSV/archivo de productos, NO generes esos
      productos: déjalos fuera (el sistema los añade aparte) y solo menciónalos
      en el summary.
    * `image_url`: SOLO si el usuario te da una URL de imagen explícita. NUNCA
      inventes URLs de imágenes; déjalo vacío si no la tienes.
- `tables`: si pide crear mesas, pon {count, capacity, zone}. Ej. "crea 10 mesas"
  → {"count":10,"capacity":4}. "5 mesas para 6 en la terraza" →
  {"count":5,"capacity":6,"zone":"Terraza"}. null si no menciona mesas.
- `summary`: una frase corta en español que resuma lo que vas a crear, para que
  el dueño confirme.
- Usa el contexto de sucursales y menús existentes para no duplicar. Si el
  usuario quiere agregar algo a un menú que YA existe (aparece en el contexto),
  pon en `menu.name` EXACTAMENTE ese nombre existente: el sistema añadirá las
  categorías/productos a ese menú en vez de crear uno nuevo.
- Recuerdas la conversación anterior: si el usuario dice "ahora agrégale…",
  "y también…" o "a ese menú…", refiérete a lo que se habló/creó antes.
"""


def generate_plan(
    message: str,
    context: str,
    has_csv: bool,
    csv_count: int,
    history: list[ChatTurn] | None = None,
) -> BuildPlan:
    """Ask Gemini for a structured BuildPlan. Raises on model/transport error."""
    csv_note = (
        f"\n\nEl usuario adjuntó un CSV con {csv_count} productos; NO los generes tú, "
        "solo menciónalos en el summary."
        if has_csv
        else ""
    )
    prompt = f"Contexto actual del restaurante:\n{context}\n\nInstrucción del dueño:\n{message}{csv_note}"

    # Prior turns give the model conversational memory for follow-ups. Assistant
    # turns are the plan summaries we showed the user.
    contents: list[types.Content] = []
    for turn in history or []:
        role = "user" if turn.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=turn.text)]))
    contents.append(types.Content(role="user", parts=[types.Part(text=prompt)]))

    resp = _get_client().models.generate_content(
        model=settings.gemini_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.1,
            response_mime_type="application/json",
            response_schema=BuildPlan,
        ),
    )
    plan = resp.parsed
    if not isinstance(plan, BuildPlan):
        # Fallback: parse the raw JSON text if the SDK didn't hydrate .parsed.
        plan = BuildPlan.model_validate_json(resp.text)
    return plan
