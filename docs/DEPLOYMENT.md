# RestaurantOS — Despliegue del ecosistema (Odoo + Firebase) en un solo lugar

**Objetivo:** todo el ecosistema en un solo proveedor, con seguridad y **backups
automáticos — sin perder nada**.

> Las cifras de costo y algunos flags de `gcloud` están marcados `VERIFICAR`:
> confírmalos contra la doc oficial antes de un paso irreversible (p.ej. bloquear
> la retención de un bucket). Ningún secreto va en el repo.

---

## 1. Recomendación: Google Cloud (GCP)

**Sí, GCP es el lugar correcto — y en realidad la decisión ya está tomada por ti.**

Firebase (Firestore, Realtime Database, Auth, Cloud Functions) es un producto
**gestionado por Google y no se puede auto-hospedar ni mover** fuera de su
infraestructura (Auth ni siquiera exporta los hashes de contraseña). Por lo tanto,
"todo en un solo lugar" significa **traer Odoo a GCP**, no sacar Firebase de ahí.

```
                    ┌──────────────  GCP (un solo proyecto)  ──────────────┐
                    │                                                      │
   Apps  ───────────┼──►  Firebase (gestionado)      Compute Engine VM     │
  (customer_web,    │     · Firestore                ┌──────────────────┐  │
   waiter, KDS,     │     · Realtime DB              │ Docker Compose   │  │
   admin)           │     · Auth                     │  · Postgres 16   │  │
                    │     · Cloud Functions          │  · Odoo 17       │  │
                    │                                 │  · FastAPI BFF   │  │
                    │                                 │  · Caddy (TLS)   │  │
                    │                                 └──────────────────┘  │
                    │            ▼ backups automáticos ▼                    │
                    │     ┌──────────────────────────────────────┐         │
                    │     │  GCS bucket inmutable (WORM)          │         │
                    │     │  · pg_dump + filestore (nightly)      │         │
                    │     │  · Firestore export/backup + PITR     │         │
                    │     │  · RTDB daily backup                  │         │
                    │     │  · snapshots de disco de la VM        │         │
                    │     └──────────────────────────────────────┘         │
                    └──────────────────────────────────────────────────────┘
```

### Patrón para Odoo 17

Recomendado para un restaurante chico-mediano cuyo objetivo es **no perder datos**:

| Opción | Veredicto |
|---|---|
| **(a) VM + Docker (Postgres+Odoo+BFF+Caddy)** — "caja all-in-one" | ✅ **Elegido para empezar.** Simple, un solo lugar, un solo script. Los backups de la DB son responsabilidad tuya → los automatizamos (abajo). |
| (b) Cloud Run + Cloud SQL + GCS filestore | ❌ Odoo encaja mal en Cloud Run (workers largos, cron `ir.cron`, websockets, y Odoo Community **no** tiene backend de filestore en GCS nativo). Añade fragilidad, no seguridad. |
| **(c) VM (Odoo+Caddy) + Cloud SQL (Postgres)** | ⭐ **Upgrade recomendado para producción seria** — ver §6. Cloud SQL da backups automáticos + PITR gestionados; menos RPO. |

> **Trampa crítica de Odoo:** los adjuntos (facturas, imágenes, PDFs) viven en el
> **filestore en disco**, *no* en Postgres. Un backup solo de la DB **pierde los
> adjuntos**. Por eso respaldamos **DB + filestore**.

---

## 2. Instalación all-in-one

Todo el stack de Odoo/BFF + backups se levanta con un script.

```bash
# 1. Prerrequisitos: gcloud y firebase CLIs autenticados
#    y una service account key de Firebase (apps/fastapi_bff/serviceAccountKey.json)

cd deploy
cp .env.example .env          # 2. edita .env (dominios, passwords, CCLW, bucket…)
./install.sh                  # 3. provisiona VM + IP + firewall, despliega el stack,
                              #    y configura los backups GCP
```

`install.sh` hace:
1. IP estática + VM (`e2-medium`) + firewall (**443 abierto; SSH solo por IAP**).
2. Copia el stack y el código del BFF a la VM.
3. `docker compose up` → Postgres + Odoo + BFF + Caddy (TLS automático Let's Encrypt).
4. Llama a `setup-gcp-backups.sh` (bucket inmutable + Firestore PITR/backups).

Al terminar, apunta los **A records** de tus dominios a la IP que imprime, y activa
los pagos en la web app (§ del doc de pagos).

Archivos en `deploy/`: `install.sh` (orquestador), `vm-bootstrap.sh` (corre en la
VM), `docker-compose.yml`, `Caddyfile`, `odoo.conf.template`, `backup.sh` (cron
nightly), `setup-gcp-backups.sh`, `.env.example`.

---

## 3. Matriz de Backups & DR (verificada)

| Dato | Mecanismo | Automatización | Frecuencia | Retención | Restaurar |
|---|---|---|---|---|---|
| **Odoo Postgres** (en la VM) | `pg_dump -Fc` → GCS | cron en la VM (`backup.sh`, 02:30) | diario | lifecycle del bucket | `pg_restore` |
| **Odoo filestore** (adjuntos) | `tar` → GCS | mismo cron | diario | del bucket | `tar x` en `/var/lib/odoo/filestore` |
| **VM completa** (OS+filestore) | snapshot de disco | `resource-policies` snapshot schedule `VERIFICAR` | diario | retención configurada | crear disco desde snapshot |
| **Firestore — PITR** | replay a un instante | `--enable-pitr` | 1/min | **7 días** | export/clone con `--snapshot-time` |
| **Firestore — backups gestionados** | schedule nativo | `firestore:backups:schedules:create` | diario/semanal | **máx 14 semanas** | `firestore:databases:restore` |
| **Firestore — export portable** | `gcloud firestore export` | Cloud Scheduler → Cloud Run job | configurable | lifecycle del bucket | `gcloud firestore import` |
| **Realtime Database** | backup diario JSON (data+rules) | consola Firebase (Blaze) | diario | tu bucket | importar JSON |
| **Bucket de backups** | Versioning + Retention Policy + **Bucket Lock (WORM)** | `setup-gcp-backups.sh` | — | tú lo defines (lock = permanente) | protege todo lo anterior |

Notas (verificadas por investigación con fuentes):
- Firestore **export ≠ backup schedule**; el export cobra **1 lectura por documento**.
- La ventana de **PITR (7 días) se acumula gradualmente** tras habilitarla.
- Backups automáticos de RTDB: solo plan **Blaze** (pagas el storage GCS, no un extra).
- Cloud SQL (si migras a §6): backups automáticos (1–365) + **PITR 1–7 días** (Enterprise) o 1–35 (Enterprise Plus).

**La pieza que hace real el "no perder nada":** *bloquear* la retención del bucket
(`--lock-retention-period`, **irreversible**). Con eso, aunque roben credenciales o
haya ransomware, los backups **no se pueden borrar ni cifrar** — el candado vive en
la capa de storage. El script lo deja listo pero **no lo bloquea solo** (es permanente).

---

## 4. Checklist de seguridad (ordenado por impacto)

1. **Secret Manager** para todas las credenciales (Odoo master, password de DB,
   CCLW/token de PagueloFácil, service account JSON). Nunca en el repo ni en `.env`
   en disco a largo plazo. *Una master password filtrada = Odoo comprometido.*
2. **Bloquear el bucket de backups (WORM)** — versioning + retention policy locked.
   Es lo que hace que los backups sobrevivan a ransomware/credenciales robadas.
3. **Service accounts de mínimo privilegio** — una SA por trabajo (la de export de
   Firestore solo `datastore.importExportAdmin` + escribir al bucket). Sin `Editor`/`Owner`.
4. **Red: Postgres nunca público; SSH solo por IAP** — el firewall abre 443 al proxy
   y 22 solo al rango de IAP (`35.235.240.0/20`), no a `0.0.0.0/0`.
5. **Proxy TLS para Odoo** — Caddy (Let's Encrypt automático); `proxy_mode = True`.
   Odoo nunca en HTTP plano.
6. **Security rules de Firestore/RTDB** — ya están en el repo (`firestore.rules`); son
   la frontera de autorización del cliente. No regresarlas.
7. **Auto-updates del SO** (`unattended-upgrades`) y versión de Odoo fijada.

---

## 5. Costo mensual aproximado (ESTIMADO — verificar en la calculadora oficial)

Supuestos: 1 cadena, volumen bajo-medio, `us-central1`, on-demand, Firebase se factura aparte.

| Ítem | Config | ~USD/mes |
|---|---|---|
| Compute Engine (Odoo+BFF+proxy) | `e2-medium` + ~30 GB disco | ~$24 + ~$5 |
| GCS backups (versionado+locked) | decenas de GB | ~$1–5 |
| Firestore/RTDB backups+export | poco dato | ~$1–5 |
| Egress / misc | ligero | ~$5 |
| **Total (agregado a Firebase existente)** | | **≈ $40–55/mes** |
| *(+ Cloud SQL si haces el upgrade §6)* | 1 vCPU/3.75 GB + SSD | *+ ~$30–45* |

Los *committed-use discounts* (1 año −25%, 3 años −52%) bajan el compute una vez estable.

---

## 6. Upgrade a producción seria: Cloud SQL para Postgres

Cuando el volumen lo justifique, saca Postgres de la VM a **Cloud SQL** (backups y
PITR gestionados = menor RPO, menor riesgo). Comandos base (`VERIFICAR` flags):

```bash
gcloud sql instances create odoo-pg \
  --database-version=POSTGRES_16 --tier=db-custom-1-3840 \
  --region=$GCP_REGION --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-point-in-time-recovery --retained-transaction-log-days=7 \
  --no-assign-ip --network=$VPC        # IP privada, sin exposición pública
# Restaurar a un instante:
gcloud sql instances clone odoo-pg odoo-pg-restored --point-in-time 'RFC3339_TS'
```
Luego apunta `db_host`/`ODOO_URL` del stack a la IP privada de Cloud SQL y quita el
servicio `db` del `docker-compose.yml`. El filestore sigue respaldándose desde la VM.

---

## Fuentes / incertidumbres

- Firebase no auto-hospedable: firebase.google.com/docs/auth ; selfhosting.sh/replace/firebase
- Cloud SQL backups/PITR: cloud.google.com/sql/docs/postgres/backup-recovery/{backups,pitr}
- Firestore backups/PITR/export: firebase.google.com/docs/firestore/{backups,pitr}
- Bucket Lock (WORM): cloud.google.com/storage/docs/bucket-lock
- RTDB backups: firebase.google.com/docs/database/backups
- Costos: cifras de agregadores de terceros — **estimados**, verificar en cloud.google.com/products/calculator.
- Flags marcados `VERIFICAR` (retención/lock del bucket, snapshot schedule) — confirmar contra `gcloud` actual.
