#!/usr/bin/env bash
# Prepare a Firebase/GCP project as a new RestaurantOS environment. docs/ENVIRONMENTS.md
#
#   scripts/bootstrap-env.sh <alias> <projectId> [sitePrefix]
#   e.g. scripts/bootstrap-env.sh dev restaurant-os-dev
#
# Before running: the project exists, Firebase is added to it and billing
# (Blaze) is linked — console steps, see docs/ENVIRONMENTS.md §2.
#
# Idempotent: every step checks first and skips what already exists, so it can
# be re-run after fixing a failed step. DRY_RUN=1 prints what it would create.
#
# Mirrors production (restaurant-os-68c79): Firestore nam5, RTDB us-central1,
# Storage US-EAST1, Auth email + anonymous, same BFF service-account roles.
source "$(dirname "$0")/_common.sh"

ALIAS="${1:-}"
PROJECT="${2:-}"
PREFIX="${3:-$PROJECT}"
[ -n "$ALIAS" ] && [ -n "$PROJECT" ] || die "Uso: scripts/bootstrap-env.sh <alias> <projectId> [sitePrefix]"
[ "$ALIAS" != "prod" ] || die "prod ya existe (restaurant-os-68c79). Este script es para ambientes nuevos."

FIRESTORE_LOCATION="nam5"
RTDB_LOCATION="us-central1"
STORAGE_LOCATION="US-EAST1"
REGION="us-central1"
BFF_SERVICE="restaurantos-bff"
APIS=(
  firebase.googleapis.com firestore.googleapis.com firebasedatabase.googleapis.com
  firebasestorage.googleapis.com storage.googleapis.com firebasehosting.googleapis.com
  firebaserules.googleapis.com identitytoolkit.googleapis.com cloudfunctions.googleapis.com
  cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com
  eventarc.googleapis.com pubsub.googleapis.com iam.googleapis.com iamcredentials.googleapis.com
  aiplatform.googleapis.com
)
# Same roles the production BFF service account has.
BFF_ROLES=(
  roles/aiplatform.user roles/datastore.user roles/firebaseauth.admin
  roles/firebasedatabase.admin roles/iam.serviceAccountTokenCreator roles/storage.admin
)

token() { gcloud auth print-access-token; }
api() { # api METHOD URL [JSON]  → body on stdout, fails on HTTP >= 400
  local method="$1" url="$2" body="${3:-}"
  curl -sS --fail-with-body -X "$method" "$url" \
    -H "Authorization: Bearer $(token)" -H "x-goog-user-project: $PROJECT" \
    -H "Content-Type: application/json" ${body:+-d "$body"}
}

# ── 0. Preconditions ────────────────────────────────────────────────────────
step "0. Proyecto $PROJECT"
gcloud projects describe "$PROJECT" --format='value(projectId)' >/dev/null 2>&1 \
  || die "El proyecto $PROJECT no existe o no tienes acceso. Créalo en la consola (docs/ENVIRONMENTS.md §2)."
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
ok "existe (número $PROJECT_NUMBER)"
[ "$(gcloud billing projects describe "$PROJECT" --format='value(billingEnabled)' 2>/dev/null)" = "True" ] \
  || die "El proyecto no tiene facturación (plan Blaze). Vincúlala en la consola: functions y Cloud Run la necesitan."
ok "facturación activa"
$FIREBASE apps:list --project "$PROJECT" >/dev/null 2>&1 \
  || die "Firebase no está agregado a $PROJECT. En console.firebase.google.com → Agregar proyecto → elige $PROJECT."
ok "Firebase agregado"

# ── 1. APIs ─────────────────────────────────────────────────────────────────
step "1. APIs"
run gcloud services enable "${APIS[@]}" --project "$PROJECT"
ok "${#APIS[@]} APIs habilitadas"

# ── 2. Firestore ────────────────────────────────────────────────────────────
step "2. Firestore ($FIRESTORE_LOCATION)"
if gcloud firestore databases describe --database='(default)' --project "$PROJECT" >/dev/null 2>&1; then
  ok "ya existe"
else
  run gcloud firestore databases create --location="$FIRESTORE_LOCATION" --project "$PROJECT"
  ok "creada"
fi

# ── 3. Realtime Database (default instance, like `firebase init database`) ──
step "3. Realtime Database ($RTDB_LOCATION)"
RTDB_ID="$PROJECT-default-rtdb"
RTDB_URL="https://$RTDB_ID.firebaseio.com"
if $FIREBASE database:instances:list --project "$PROJECT" 2>/dev/null | grep -q "$RTDB_ID"; then
  ok "ya existe ($RTDB_ID)"
else
  run api POST "https://firebasedatabase.googleapis.com/v1beta/projects/$PROJECT/locations/$RTDB_LOCATION/instances?databaseId=$RTDB_ID" \
    '{"type":"default_database"}' >/dev/null
  ok "creada ($RTDB_ID)"
fi

# ── 4. Storage (default Firebase bucket) ────────────────────────────────────
step "4. Storage ($STORAGE_LOCATION)"
BUCKET="$PROJECT.firebasestorage.app"
if api GET "https://firebasestorage.googleapis.com/v1beta/projects/$PROJECT/buckets" 2>/dev/null | grep -q "$BUCKET"; then
  ok "ya existe ($BUCKET)"
else
  run api POST "https://firebasestorage.googleapis.com/v1beta/projects/$PROJECT/defaultBucket" \
    "{\"location\":\"$STORAGE_LOCATION\"}" >/dev/null \
    || die "No se pudo crear el bucket. Créalo en la consola: Storage → Comenzar ($STORAGE_LOCATION) y vuelve a correr el script."
  ok "creado ($BUCKET)"
fi

# ── 5. Auth: email/password + anonymous ─────────────────────────────────────
step "5. Authentication (email + anónimo)"
run api PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired,signIn.anonymous.enabled" \
  '{"signIn":{"email":{"enabled":true,"passwordRequired":true},"anonymous":{"enabled":true}}}' >/dev/null \
  || die "No se pudo configurar Auth. En la consola: Authentication → Comenzar, activa Correo/contraseña y Anónimo, y vuelve a correr el script."
ok "activados"

# ── 6. Web app + its public config ──────────────────────────────────────────
step "6. App web de Firebase"
APP_ID="$($FIREBASE apps:list WEB --project "$PROJECT" --json 2>/dev/null \
  | python3 -c "import json,sys; r=json.load(sys.stdin).get('result',[]); print(r[0]['appId'] if r else '')")"
if [ -z "$APP_ID" ]; then
  [ "${DRY_RUN:-}" = "1" ] && { run $FIREBASE apps:create WEB "RestaurantOS Web" --project "$PROJECT"; die "DRY_RUN: sin app web no se puede seguir."; }
  APP_ID="$($FIREBASE apps:create WEB "RestaurantOS Web" --project "$PROJECT" --json \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['appId'])")"
  ok "creada ($APP_ID)"
else
  ok "ya existe ($APP_ID)"
fi
SDK_JSON="$($FIREBASE apps:sdkconfig WEB "$APP_ID" --project "$PROJECT" --json)"

# ── 7. Hosting sites ────────────────────────────────────────────────────────
step "7. Sitios de Hosting"
SITES_JSON="$($FIREBASE hosting:sites:list --project "$PROJECT" --json 2>/dev/null || echo '{}')"
SITE_ADMIN="$PROJECT"; SITE_CUSTOMER="$PREFIX-pedir"; SITE_KDS="$PREFIX-cocina"
SITE_WAITER="$PREFIX-mesero"; SITE_LANDING="$PREFIX-inicio"
for pair in "admin:$SITE_ADMIN" "customer:$SITE_CUSTOMER" "kds:$SITE_KDS" "waiter:$SITE_WAITER" "landing:$SITE_LANDING"; do
  target="${pair%%:*}"; site="${pair#*:}"
  if printf '%s' "$SITES_JSON" | grep -q "sites/$site\""; then
    ok "$target → $site (ya existe)"
  else
    run $FIREBASE hosting:sites:create "$site" --project "$PROJECT" >/dev/null \
      || die "No se pudo crear el sitio '$site' (el nombre es global y puede estar tomado). Prueba con otro sitePrefix."
    ok "$target → $site (creado)"
  fi
done

# ── 8. BFF service account roles ────────────────────────────────────────────
step "8. Cuenta de servicio del BFF"
SA="$(gcloud iam service-accounts list --project "$PROJECT" --filter='email~^firebase-adminsdk' --format='value(email)' | head -1)"
[ -n "$SA" ] || die "No encontré la cuenta firebase-adminsdk-… en $PROJECT (se crea al agregar Firebase)."
for role in "${BFF_ROLES[@]}"; do
  run gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="$role" --condition=None --quiet >/dev/null
done
ok "$SA con ${#BFF_ROLES[@]} roles"

# ── 8b. Service agents for 2nd-gen functions (onOrderItemUpdated: Eventarc/Pub/Sub) ──
# In a brand-new project `firebase deploy` fails with "We failed to modify the IAM
# policy" because the Pub/Sub service agent does not exist yet. Create the agents
# and grant the roles the CLI asks for.
step "8b. Agentes de servicio para functions de 2.ª generación"
run gcloud beta services identity create --service=pubsub.googleapis.com --project "$PROJECT" >/dev/null
run gcloud beta services identity create --service=eventarc.googleapis.com --project "$PROJECT" >/dev/null
run gcloud projects add-iam-policy-binding "$PROJECT" --condition=None --quiet \
  --member="serviceAccount:service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role=roles/iam.serviceAccountTokenCreator >/dev/null
run gcloud projects add-iam-policy-binding "$PROJECT" --condition=None --quiet \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role=roles/run.invoker >/dev/null
run gcloud projects add-iam-policy-binding "$PROJECT" --condition=None --quiet \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role=roles/eventarc.eventReceiver >/dev/null
run gcloud projects add-iam-policy-binding "$PROJECT" --condition=None --quiet \
  --member="serviceAccount:service-$PROJECT_NUMBER@gcp-sa-eventarc.iam.gserviceaccount.com" --role=roles/eventarc.serviceAgent >/dev/null
# New projects no longer give the Compute default SA (used by Cloud Build for functions)
# access to the sources bucket: "Build failed: Access to bucket gcf-sources-… denied".
run gcloud projects add-iam-policy-binding "$PROJECT" --condition=None --quiet \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role=roles/cloudbuild.builds.builder >/dev/null
ok "Pub/Sub, Eventarc y Cloud Build listos"

# ── 8c. Runtime accounts of the functions: same roles as production ─────────
# New projects no longer grant roles to default service accounts, so functions
# failed with PERMISSION_DENIED on Firestore (createOrganization). Prod has:
#   <project>@appspot  (1st gen) datastore.user, firebase.admin, serviceUsageConsumer
#   <number>-compute    (2nd gen) datastore.user, logging.logWriter (+ the ones in 8b)
step "8c. Cuentas con las que corren las functions"
for role in roles/datastore.user roles/firebase.admin roles/serviceusage.serviceUsageConsumer; do
  run gcloud projects add-iam-policy-binding "$PROJECT" --condition=None --quiet \
    --member="serviceAccount:$PROJECT@appspot.gserviceaccount.com" --role="$role" >/dev/null
done
for role in roles/datastore.user roles/logging.logWriter; do
  run gcloud projects add-iam-policy-binding "$PROJECT" --condition=None --quiet \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="$role" >/dev/null
done
ok "appspot (1.ª gen) y compute (2.ª gen) con los roles de producción"

# ── 9. Config files for this environment ────────────────────────────────────
step "9. Archivos de configuración"
BFF_URL="https://$BFF_SERVICE-$PROJECT_NUMBER.$REGION.run.app"   # Cloud Run deterministic URL
[ "${DRY_RUN:-}" = "1" ] && { ok "DRY_RUN: no se escriben archivos"; exit 0; }
ALIAS="$ALIAS" PROJECT="$PROJECT" RTDB_URL="$RTDB_URL" BFF_URL="$BFF_URL" SA="$SA" REGION="$REGION" \
BFF_SERVICE="$BFF_SERVICE" SDK_JSON="$SDK_JSON" SITE_ADMIN="$SITE_ADMIN" SITE_CUSTOMER="$SITE_CUSTOMER" \
SITE_KDS="$SITE_KDS" SITE_WAITER="$SITE_WAITER" SITE_LANDING="$SITE_LANDING" \
  python3 scripts/_write_env_files.py

step "Listo. Siguientes pasos (docs/ENVIRONMENTS.md §3):"
echo "  1. Revisa y commitea los archivos generados (git status)."
echo "  2. scripts/deploy.sh $ALIAS all      # reglas, functions y los 5 sitios"
echo "     luego, una vez: $FIREBASE functions:artifacts:setpolicy --project $ALIAS --days 1 --force"
echo "  3. scripts/deploy.sh $ALIAS bff      # el BFF"
echo "  4. Regístrate en la landing de $ALIAS para crear la primera organización."
