from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.catalog.router import router as catalog_router
from app.payments.router import router as payments_router
from app.ai.router import router as ai_router
from app.zaveli.router import router as zaveli_router
from app.fiscal.router import router as fiscal_router
from app.config import settings
from app.core.firebase import firebase_ping
from app.core.odoo import odoo_client

app = FastAPI(
    title="RestaurantOS BFF",
    version="2.0.0",
    description="Backend-for-Frontend: Odoo ↔ Firebase bridge",
)

# The customer web app calls /payments/init from the browser (cross-origin).
# No cookies are used, so we don't need credentialed CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.customer_app_url,
        settings.admin_app_url,
        "http://localhost:5175",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    # Preview channels get a random host per channel; match them by pattern
    # (restricted to this project's admin site) instead of listing each one.
    allow_origin_regex=settings.admin_preview_origin_regex,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(payments_router)
app.include_router(ai_router)
app.include_router(zaveli_router)
app.include_router(fiscal_router)


@app.get("/health")
def health():
    # Odoo is optional (per-org backoffice): without an env fallback it is simply
    # "not_configured", not a degraded service.
    odoo_state = "not_configured" if not settings.odoo_url else ("ok" if odoo_client.ping() else "unreachable")
    firebase_ok = firebase_ping()
    status = "ok" if (firebase_ok and odoo_state != "unreachable") else "degraded"
    return {
        "status": status,
        "odoo": odoo_state,
        "firebase": "ok" if firebase_ok else "unreachable",
        "version": "2.0.0",
    }
