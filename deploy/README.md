# deploy/ — All-in-one del ecosistema (Odoo + BFF + backups) en GCP

Documentación completa: **`docs/DEPLOYMENT.md`**.

```bash
cd deploy
cp .env.example .env     # edita dominios, passwords, CCLW, bucket…
./install.sh             # provisiona VM + firewall, levanta el stack, configura backups
```

| Archivo | Qué es |
|---|---|
| `install.sh` | Orquestador all-in-one (corre en tu workstation con gcloud). |
| `vm-bootstrap.sh` | Se copia y corre **en la VM**: Docker + `compose up` + cron de backup. |
| `docker-compose.yml` | Postgres 16 + Odoo 17 + FastAPI BFF + Caddy (TLS). |
| `Caddyfile` | Reverse proxy TLS (Let's Encrypt automático) para Odoo y el BFF. |
| `odoo.conf.template` | Config de Odoo (proxy_mode); se renderiza en la VM desde `.env`. |
| `backup.sh` | Cron nightly: `pg_dump` + tar del filestore → bucket GCS inmutable. |
| `setup-gcp-backups.sh` | Bucket WORM + Firestore PITR/backups + notas RTDB/snapshots. |
| `.env.example` | Todas las variables (copiar a `.env`; nunca commitear `.env`). |

**Nunca se commitea** `.env`, la service account key, ni `odoo.conf` renderizado.
