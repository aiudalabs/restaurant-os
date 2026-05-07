import os
import firebase_admin
from firebase_admin import auth, credentials, firestore as fb_firestore

from app.config import settings

_app: firebase_admin.App | None = None


def get_firebase_app() -> firebase_admin.App:
    global _app
    if _app is not None:
        return _app

    project_id = settings.firebase_project_id
    cred_path = settings.google_application_credentials

    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        _app = firebase_admin.initialize_app(cred, {"projectId": project_id})
    else:
        # ADC (gcloud auth application-default login) + service account ID for token signing
        adc = credentials.ApplicationDefault()
        options: dict = {"projectId": project_id}
        if settings.firebase_service_account:
            options["serviceAccountId"] = settings.firebase_service_account
        _app = firebase_admin.initialize_app(adc, options)

    return _app


def get_firestore():
    get_firebase_app()
    return fb_firestore.client()


def create_custom_token(uid: str, claims: dict) -> str:
    get_firebase_app()
    token_bytes = auth.create_custom_token(uid, claims)
    return token_bytes.decode("utf-8")


def verify_id_token(id_token: str) -> dict:
    get_firebase_app()
    return auth.verify_id_token(id_token)


def revoke_refresh_tokens(uid: str) -> None:
    get_firebase_app()
    auth.revoke_refresh_tokens(uid)


def firebase_ping() -> bool:
    try:
        db = get_firestore()
        db.collection("_health").limit(1).get()
        return True
    except Exception:
        return False
