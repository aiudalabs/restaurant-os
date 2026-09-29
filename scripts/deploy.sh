#!/usr/bin/env bash
# Deploy Firebase (hosting, functions, rules) to an environment. docs/ENVIRONMENTS.md
#
#   scripts/deploy.sh <dev|prod> [all|web|functions|rules|bff|<lista --only>]
#
#   all        reglas + índices + functions + los 5 sitios (default)
#   web        los 5 sitios de Hosting (admin, customer, kds, waiter, landing)
#   functions  todas las Cloud Functions
#   rules      Firestore (reglas + índices), RTDB y Storage
#   bff        el BFF en Cloud Run (scripts/deploy-bff.sh)
#   otro       se pasa tal cual a --only, p. ej. "hosting:customer,functions:customerManifest"
#
# Each web app is built for the target project automatically (firebase.json
# predeploy → vite build --mode $GCLOUD_PROJECT → apps/<app>/.env.<projectId>).
source "$(dirname "$0")/_common.sh"

ENV_NAME="${1:-}"
WHAT="${2:-all}"
[ -n "$ENV_NAME" ] || die "Uso: scripts/deploy.sh <dev|prod> [all|web|functions|rules|bff|<lista --only>]"
[ "$WHAT" = "bff" ] && exec "$ROOT/scripts/deploy-bff.sh" "$ENV_NAME"

PROJECT="$(project_of "$ENV_NAME")"
[ -n "$PROJECT" ] || die "El ambiente '$ENV_NAME' no está en .firebaserc. ¿Corriste scripts/bootstrap-env.sh?"

case "$WHAT" in
  all) ONLY="firestore:rules,firestore:indexes,database,storage,functions,hosting" ;;
  web) ONLY="hosting" ;;
  functions) ONLY="functions" ;;
  rules) ONLY="firestore:rules,firestore:indexes,database,storage" ;;
  *) ONLY="$WHAT" ;;
esac

if [ "$ENV_NAME" = "prod" ]; then
  guard_prod "$ONLY → $PROJECT" \
    apps/admin_app apps/customer_web apps/kitchen_web apps/waiter_web apps/landing \
    functions firestore.rules firestore.indexes.json database.rules.json storage.rules \
    firebase.json .firebaserc scripts
fi

step "Desplegando «${ONLY}» a $ENV_NAME ($PROJECT)"
run $FIREBASE deploy --project "$ENV_NAME" --only "$ONLY"
ok "Listo: $ENV_NAME ($PROJECT)"
