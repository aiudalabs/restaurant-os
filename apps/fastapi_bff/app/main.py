from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.catalog.router import router as catalog_router
from app.payments.router import router as payments_router
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
        "http://localhost:5175",
        "http://localhost:4173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(payments_router)


@app.get("/health")
def health():
    odoo_ok = odoo_client.ping()
    firebase_ok = firebase_ping()
    status = "ok" if (odoo_ok and firebase_ok) else "degraded"
    return {
        "status": status,
        "odoo": "ok" if odoo_ok else "unreachable",
        "firebase": "ok" if firebase_ok else "unreachable",
        "version": "2.0.0",
    }
