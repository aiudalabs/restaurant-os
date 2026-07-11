#!/usr/bin/env bash
# Nightly Odoo backup: Postgres logical dump + filestore tarball -> GCS.
# Installed as a cron job on the VM by vm-bootstrap.sh. Idempotent, self-contained.
#
# WHY BOTH: Odoo stores attachments (invoices, images, PDFs) on the FILESTORE
# (disk), not in Postgres. A DB-only backup silently loses them — the #1 Odoo
# data-loss trap. We back up both, every night, to an immutable bucket.
set -euo pipefail

cd "$(dirname "$0")"
set -a; [ -f .env ] && . ./.env; set +a

: "${BACKUP_BUCKET:?set BACKUP_BUCKET in .env}"
: "${POSTGRES_USER:?}"; : "${POSTGRES_DB:?}"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
DEST="gs://${BACKUP_BUCKET}/odoo"

echo "[backup] $STAMP -> $DEST"

# 1. Postgres dump (streamed straight to GCS, gzipped, never hits local disk)
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" \
  | gzip \
  | gcloud storage cp - "${DEST}/db/${POSTGRES_DB}_${STAMP}.dump.gz"

# 2. Odoo filestore tarball (attachments)
docker compose exec -T odoo tar czf - -C /var/lib/odoo/filestore . \
  | gcloud storage cp - "${DEST}/filestore/filestore_${STAMP}.tar.gz"

echo "[backup] done. Objects are versioned + retention-locked in the bucket."

# Restore (manual, documented for the operator):
#   DB:        gcloud storage cp gs://BUCKET/odoo/db/FILE - | gunzip \
#                | docker compose exec -T db pg_restore -U USER -d DB --clean
#   Filestore: gcloud storage cp gs://BUCKET/odoo/filestore/FILE - \
#                | docker compose exec -T odoo tar xzf - -C /var/lib/odoo/filestore
