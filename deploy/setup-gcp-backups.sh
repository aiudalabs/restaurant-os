#!/usr/bin/env bash
# Provisions the GCP-side data protection: an immutable (WORM) backup bucket, and
# Firebase/Firestore + RTDB backups. Run from a workstation with gcloud + firebase
# CLI authenticated. Safe to re-run (idempotent where the APIs allow).
#
# Flags marked "VERIFY" changed across gcloud versions — confirm against current
# docs before a locked (irreversible) operation. This script does NOT lock the
# retention policy automatically, because bucket-lock is PERMANENT; it prints the
# command for you to run deliberately.
set -euo pipefail
cd "$(dirname "$0")"
set -a; [ -f .env ] && . ./.env; set +a

: "${GCP_PROJECT:?}"; : "${GCP_REGION:?}"; : "${BACKUP_BUCKET:?}"
RET_DAYS="${BACKUP_RETENTION_DAYS:-30}"
gcloud config set project "$GCP_PROJECT" >/dev/null

echo "== 1. Immutable backup bucket: gs://$BACKUP_BUCKET =="
if ! gcloud storage buckets describe "gs://$BACKUP_BUCKET" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$BACKUP_BUCKET" \
    --location="$GCP_REGION" --uniform-bucket-level-access
fi
# Object versioning: keep overwritten/deleted versions (defends against mistakes).
gcloud storage buckets update "gs://$BACKUP_BUCKET" --versioning
# Retention policy: objects can't be deleted before RET_DAYS.  VERIFY flag name.
gcloud storage buckets update "gs://$BACKUP_BUCKET" \
  --retention-period="${RET_DAYS}d" || echo "  (verify --retention-period syntax)"
# Lifecycle: expire noncurrent versions after RET_DAYS to control cost.
cat > /tmp/ros-lifecycle.json <<JSON
{"rule":[{"action":{"type":"Delete"},"condition":{"daysSinceNoncurrentTime":${RET_DAYS}}}]}
JSON
gcloud storage buckets update "gs://$BACKUP_BUCKET" --lifecycle-file=/tmp/ros-lifecycle.json
echo "  To make backups TRULY immutable (WORM, ransomware-proof), LOCK it (PERMANENT):"
echo "    gcloud storage buckets update gs://$BACKUP_BUCKET --lock-retention-period"

echo "== 2. Firestore protection =="
# Point-in-time recovery: 7-day window (builds up gradually after enabling).
gcloud firestore databases update --database='(default)' --enable-pitr \
  || echo "  (PITR may already be enabled / verify flag)"
# Managed daily backup schedule, retained 14 weeks (max).
firebase firestore:backups:schedules:create --project "$GCP_PROJECT" \
  --database '(default)' --recurrence DAILY --retention 14w \
  || echo "  (a daily schedule may already exist)"
# Portable export to the immutable bucket (a schedulable, restorable copy).
echo "  Portable export (schedule via Cloud Scheduler; run manually to test):"
echo "    gcloud firestore export gs://$BACKUP_BUCKET/firestore/\$(date +%F)"

echo "== 3. Realtime Database backups (manual, one-time) =="
echo "  RTDB automated daily backups have no CLI. Enable in the console (Blaze):"
echo "  Firebase Console -> Realtime Database -> Backups -> point to gs://$BACKUP_BUCKET"

echo "== 4. VM disk snapshot schedule (belt-and-suspenders: OS + filestore) =="
echo "  gcloud compute resource-policies create snapshot-schedule ros-daily-snap \\"
echo "    --region=$GCP_REGION --max-retention-days=$RET_DAYS \\"
echo "    --daily-schedule --start-time=07:00 --on-source-disk-delete=keep-auto-snapshots"
echo "  then attach it:  gcloud compute disks add-resource-policies <VM_DISK> ..."

echo "== done. Review the printed manual/locking steps above. =="
