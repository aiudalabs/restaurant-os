from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Odoo
    odoo_url: str = "http://localhost:8069"
    odoo_db: str = "restaurantes_demo"
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

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    log_level: str = "info"


settings = Settings()
