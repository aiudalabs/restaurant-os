"""Gemini plan generation (Vertex AI backend, ADC — no API key).

Turns a free-text instruction into a validated BuildPlan. The model only
proposes structure; it never touches Firestore.
"""
from google import genai
from google.genai import types

from app.config import settings
from app.ai.models import BuildPlan

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
- Devuelve SOLO los campos del esquema. No inventes datos que el usuario no pidió.
- `stations`: nombres de estaciones de cocina/bar a crear (ej. ["Cocina", "Bar"]).
  Vacío si no menciona estaciones.
- `menu`: si pide crear un menú, pon su nombre y las categorías mencionadas
  (ej. {"name":"Menú de la casa","categories":["Pizzas","Bebidas"]}). null si no
  pide un menú nuevo.
- `products`: SOLO productos que el usuario dicte explícitamente en el texto con
  su precio (ej. "agrega una pizza margarita a 8.50"). Si el usuario menciona un
  CSV o archivo de productos, NO inventes esos productos: déjalos fuera, el
  sistema los añade aparte. Deja `products` vacío si no dicta productos con precio.
- `summary`: una frase corta en español que resuma lo que vas a crear, para que
  el dueño confirme (ej. "Crear 2 estaciones, el menú 'Menú de la casa' con
  Pizzas y Bebidas, y 24 productos del CSV").
- Usa el contexto de sucursales y menús existentes para no duplicar.
"""


def generate_plan(message: str, context: str, has_csv: bool, csv_count: int) -> BuildPlan:
    """Ask Gemini for a structured BuildPlan. Raises on model/transport error."""
    csv_note = (
        f"\n\nEl usuario adjuntó un CSV con {csv_count} productos; NO los generes tú, "
        "solo menciónalos en el summary."
        if has_csv
        else ""
    )
    prompt = f"Contexto actual del restaurante:\n{context}\n\nInstrucción del dueño:\n{message}{csv_note}"

    resp = _get_client().models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
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
