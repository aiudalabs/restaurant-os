from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.catalog.router import router as catalog_router
from app.payments.router import router as payments_router
from app.core.firebase import firebase_ping
from app.core.odoo import odoo_client

app = FastAPI(
    title="RestaurantOS BFF",
    version="2.0.0",
    description="Backend-for-Frontend: Odoo ↔ Firebase bridge",
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
