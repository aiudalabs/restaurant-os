# RestaurantOS — Despliegue (Firebase + BFF en Cloud Run)

Todo corre en GCP. Firebase (Firestore, RTDB, Auth, Functions, Hosting) es gestionado
por Google; el BFF (`apps/fastapi_bff`) corre en **Cloud Run** (`restaurantos-bff`).
No hay VM, Docker Compose, Postgres ni ERP: el despliegue en una VM con Odoo se retiró
(Odoo se abandonó el 2026-11-05, issue #87).

> Las cifras y algunos flags de `gcloud` están marcados `VERIFICAR`: confírmalos contra
> la doc oficial antes de un paso irreversible (p. ej. bloquear la retención de un
> bucket). Ningún secreto va en el repo.

## 1. Cómo se despliega

La guía operativa vive en `docs/ENVIRONMENTS.md` y `AGENTS.md` (§1, §3). Resumen:

```bash
scripts/deploy.sh dev bff        # BFF a Cloud Run en dev (siempre primero)
scripts/deploy.sh prod bff       # solo desde main limpio y a petición explícita
```

- Variables no secretas: `deploy/env/<dev|prod>.env` (versionado).
- Secretos: `deploy/env/<dev|prod>.secrets.env` (gitignored; plantilla `example.secrets.env`).
  `scripts/deploy-bff.sh` ACTUALIZA variables, nunca reemplaza las que ya tiene el servicio.
- Backups de datos: `deploy/setup-gcp-backups.sh` (bucket inmutable + Firestore PITR/backups).

## 2. Matriz de Backups & DR

| Dato | Mecanismo | Automatización | Frecuencia | Retención | Restaurar |
|---|---|---|---|---|---|
| **Firestore — PITR** | replay a un instante | `--enable-pitr` | 1/min | **7 días** | export/clone con `--snapshot-time` |
| **Firestore — backups gestionados** | schedule nativo | `firestore:backups:schedules:create` | diario/semanal | **máx 14 semanas** | `firestore:databases:restore` |
| **Firestore — export portable** | `gcloud firestore export` | Cloud Scheduler → Cloud Run job | configurable | lifecycle del bucket | `gcloud firestore import` |
| **Realtime Database** | backup diario JSON (data+rules) | consola Firebase (Blaze) | diario | tu bucket | importar JSON |
| **Bucket de backups** | Versioning + Retention Policy + **Bucket Lock (WORM)** | `setup-gcp-backups.sh` | — | tú lo defines (lock = permanente) | protege todo lo anterior |

Notas:
- Firestore **export ≠ backup schedule**; el export cobra **1 lectura por documento**.
- La ventana de **PITR (7 días) se acumula gradualmente** tras habilitarla.
- Backups automáticos de RTDB: solo plan **Blaze**.

La pieza que hace real el "no perder nada" es *bloquear* la retención del bucket
(`--lock-retention-period`, **irreversible**): aunque roben credenciales, los backups
no se pueden borrar ni cifrar. El script lo deja listo pero **no lo bloquea solo**.

## 3. Checklist de seguridad (ordenado por impacto)

1. **Secret Manager** para las credenciales del BFF (CCLW/token de PagueloFácil,
   `INTERNAL_TOKEN`, firmas de Zaveli). Hoy van como variables de Cloud Run: pendiente.
2. **Bloquear el bucket de backups (WORM).**
3. **Service accounts de mínimo privilegio** — una por trabajo, sin `Editor`/`Owner`.
4. **Security rules de Firestore/RTDB** — `firestore.rules` es la frontera de
   autorización del cliente. No regresarlas.
