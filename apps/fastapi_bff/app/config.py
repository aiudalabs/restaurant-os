from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Odoo — SINGLE-TENANT FALLBACK only. In multi-tenant, each org's Odoo
    # connection is read from organizations/{orgId} (odooUrl/odooDb/odooUser/
    # odooPassword) via app.core.odoo.odoo_client_for_org(). These env values are
    # used when an org has no Odoo configured (dev / one-tenant deploy). Empty by
    # default: a tenant without Odoo simply skips the sync (ODOO_ROLE.md).
    odoo_url: str = ""
    odoo_db: str = ""
    odoo_user: str = "admin"
    odoo_password: str = "admin"

    # Firebase
    google_application_credentials: str = ""
    firebase_project_id: str = ""
    firebase_service_account: str = ""  # required for custom token signing with ADC
    firebase_rtdb_url: str = ""  # e.g. https://<project>-default-rtdb.firebaseio.com

    # App
    org_id: str = "org_demo_001"
    branch_id: str = "branch_main_001"
    secret_key: str = "cambiar-en-produccion"

    # PagueloFácil
    paguelofacil_cclw: str = ""
    paguelofacil_env: str = "sandbox"
    # Public URL where PagueloFácil can POST the callback.
    # In dev: use ngrok (ngrok http 8000) or set to http://10.0.2.2:8000 for Android emulator.
    bff_base_url: str = "http://10.0.2.2:8000"
    # Where to send the customer's browser back to after paying (the web app).
    customer_app_url: str = "https://restaurant-os-pedir.web.app"
    # Admin dashboard origin — calls the AI assistant endpoints cross-origin.
    admin_app_url: str = "https://restaurant-os-68c79.web.app"
    # Firebase Hosting preview channels of the admin site (e.g. …--m3-verde-abc123.web.app)
    admin_preview_origin_regex: str = r"https://restaurant-os-68c79--[a-z0-9-]+\.web\.app"
    # Server-to-server verification (go-live hardening). The PagueloFácil callback
    # is NOT signed, so before releasing an order to the kitchen we should re-check
    # the transaction against PagueloFácil's REST API. Provide the access token +
    # the verified status endpoint to enable it. Leave blank in sandbox/demo.
    # TODO(go-live): confirm the exact REST status URL in PagueloFácil's docs.
    paguelofacil_access_token: str = ""
    paguelofacil_verify_url: str = ""  # e.g. https://secure.paguelofacil.com/rest/...

    # AI assistant (Vertex AI via ADC — no API key). Uses the Cloud Run service
    # account; the project must have aiplatform.googleapis.com enabled and the SA
    # needs roles/aiplatform.user. See docs/AI_ASSISTANT.md.
    # "global" endpoint serves the newest models; "gemini-flash-latest" always
    # resolves to the latest Flash (Gemini 3.x today). Pin to gemini-3.5-flash if
    # you need version stability.
    vertex_location: str = "global"
    gemini_model: str = "gemini-flash-latest"
    ai_max_csv_rows: int = 500

    # Zaveli (agente conversacional) — signing secrets (zsk_…) of the tool and
    # event calls, comma-separated: during a rotation the new one and the previous
    # one. Empty = every call is refused (401). Never commit it. See app/zaveli/.
    zaveli_signing_secrets: str = ""

    # Fiscal (factura electrónica vía Digifact, PAC de la DGI). Las credenciales
    # de cada org viven en organizations/{orgId}/private/digifact; aquí solo
    # las URLs de los ambientes y el token con el que las Cloud Functions
    # llaman a los endpoints internos (/fiscal/...). Ver docs/DIGIFACT_EVALUATION.md.
    digifact_test_url: str = "https://testnucpa.digifact.com/api"
    digifact_prod_url: str = "https://nucpa.digifact.com/api"
    internal_token: str = ""  # empty = internal endpoints refuse every call
    firebase_storage_bucket: str = ""  # default: <project>.firebasestorage.app

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    log_level: str = "info"


settings = Settings()
