#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RestaurantOS — all-in-one installer.
#
# Provisions the Odoo/BFF side on Google Cloud and wires up automatic backups,
# so the whole ecosystem lives in one GCP project alongside Firebase.
#
#   1. Creates a GCE VM + static IP + firewall (HTTPS in, SSH via IAP only)
#   2. Ships the deploy stack + the FastAPI BFF source to the VM
#   3. Boots Postgres + Odoo 17 + BFF + Caddy (TLS) via Docker Compose
#   4. Provisions GCP-side backups (immutable bucket, Firestore PITR/backups)
#
# Prereqs on your workstation: gcloud + firebase CLIs authenticated; a filled-in
# deploy/.env (copy from deploy/.env.example); a Firebase service account key.
#
# This provisions REAL, billable infrastructure. Read deploy/.env first and run
# from the repo's deploy/ directory:  ./install.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "Missing deploy/.env — copy .env.example and fill it in."; exit 1; }
set -a; . ./.env; set +a
: "${GCP_PROJECT:?}"; : "${GCP_ZONE:?}"; : "${VM_NAME:?}"
: "${FIREBASE_SA_KEY_PATH:?}"; : "${ODOO_DOMAIN:?}"; : "${BFF_DOMAIN:?}"

LOCAL_SA_KEY="${LOCAL_SA_KEY:-../apps/fastapi_bff/serviceAccountKey.json}"
[ -f "$LOCAL_SA_KEY" ] || { echo "Service account key not found at $LOCAL_SA_KEY (set LOCAL_SA_KEY)."; exit 1; }

gcloud config set project "$GCP_PROJECT" >/dev/null
REGION="${GCP_REGION:-us-central1}"

echo "== 1/5  Static IP =="
if ! gcloud compute addresses describe "${VM_NAME}-ip" --region "$REGION" >/dev/null 2>&1; then
  gcloud compute addresses create "${VM_NAME}-ip" --region "$REGION"
fi
VM_IP="$(gcloud compute addresses describe "${VM_NAME}-ip" --region "$REGION" --format='value(address)')"
echo "   VM public IP: $VM_IP"

echo "== 2/5  Firewall (HTTPS/HTTP in; SSH only via IAP) =="
gcloud compute firewall-rules create ros-allow-web \
  --direction=INGRESS --action=ALLOW --rules=tcp:80,tcp:443 \
  --target-tags=restaurantos --source-ranges=0.0.0.0/0 2>/dev/null || true
# 35.235.240.0/20 is Google's IAP range — SSH is not open to the world.
gcloud compute firewall-rules create ros-allow-iap-ssh \
  --direction=INGRESS --action=ALLOW --rules=tcp:22 \
  --target-tags=restaurantos --source-ranges=35.235.240.0/20 2>/dev/null || true

echo "== 3/5  VM =="
if ! gcloud compute instances describe "$VM_NAME" --zone "$GCP_ZONE" >/dev/null 2>&1; then
  gcloud compute instances create "$VM_NAME" \
    --zone="$GCP_ZONE" --machine-type="${VM_MACHINE_TYPE:-e2-medium}" \
    --image-family=debian-12 --image-project=debian-cloud \
    --boot-disk-size="${VM_DISK_GB:-30}GB" --boot-disk-type=pd-balanced \
    --address="$VM_IP" --tags=restaurantos \
    --metadata=enable-oslogin=TRUE
fi

echo "== 4/5  Ship stack + BFF source + secret, then boot on the VM =="
REMOTE=/opt/restaurantos
gcloud compute ssh "$VM_NAME" --zone "$GCP_ZONE" --tunnel-through-iap --command \
  "sudo mkdir -p $REMOTE/deploy $REMOTE/apps $REMOTE/secrets && sudo chown -R \$USER $REMOTE"
gcloud compute scp --zone "$GCP_ZONE" --tunnel-through-iap --recurse \
  ./ "$VM_NAME:$REMOTE/deploy"
gcloud compute scp --zone "$GCP_ZONE" --tunnel-through-iap --recurse \
  ../apps/fastapi_bff "$VM_NAME:$REMOTE/apps/fastapi_bff"
gcloud compute scp --zone "$GCP_ZONE" --tunnel-through-iap \
  "$LOCAL_SA_KEY" "$VM_NAME:$REMOTE/secrets/serviceAccountKey.json"
# Point .env at the on-VM secret path and run the bootstrap.
gcloud compute ssh "$VM_NAME" --zone "$GCP_ZONE" --tunnel-through-iap --command \
  "cd $REMOTE/deploy && sed -i 's|^FIREBASE_SA_KEY_PATH=.*|FIREBASE_SA_KEY_PATH=$REMOTE/secrets/serviceAccountKey.json|' .env && chmod +x *.sh && ./vm-bootstrap.sh"

echo "== 5/5  GCP-side backups =="
./setup-gcp-backups.sh

cat <<EOF

✅ Done.
   Point DNS A records at $VM_IP:
     $ODOO_DOMAIN  → $VM_IP
     $BFF_DOMAIN   → $VM_IP
   TLS is issued automatically by Caddy once DNS resolves.

   Then: open https://$ODOO_DOMAIN, create the Odoo DB, and set the customer web
   app to point payments at https://$BFF_DOMAIN:
     cd ../apps/customer_web
     VITE_PAYMENTS_ENABLED=true VITE_BFF_URL=https://$BFF_DOMAIN npm run build
     firebase deploy --only hosting:customer
EOF
