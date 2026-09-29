#!/usr/bin/env bash
# Deploy the FastAPI BFF to Cloud Run for an environment. docs/ENVIRONMENTS.md
#
#   scripts/deploy-bff.sh <dev|prod>
#
# Reads deploy/env/<env>.env (versioned, no secrets) and, if present,
# deploy/env/<env>.secrets.env (gitignored). Variables are UPDATED, never
# replaced: anything already set on the service and not listed stays as is.
source "$(dirname "$0")/_common.sh"

ENV_NAME="${1:-}"
[ -n "$ENV_NAME" ] || die "Uso: scripts/deploy-bff.sh <dev|prod>"
ENV_FILE="deploy/env/$ENV_NAME.env"
SECRETS_FILE="deploy/env/$ENV_NAME.secrets.env"
[ -f "$ENV_FILE" ] || die "Falta $ENV_FILE (lo crea scripts/bootstrap-env.sh)."

# Deploy settings + container variables, as KEY=VALUE lines (comments/blank skipped).
read_env() { grep -vE '^\s*(#|$)' "$1"; }
value_of() { read_env "$ENV_FILE" | sed -n "s/^$1=//p" | head -1; }

GCP_PROJECT="$(value_of GCP_PROJECT)"
REGION="$(value_of REGION)"
SERVICE="$(value_of SERVICE)"
SERVICE_ACCOUNT="$(value_of SERVICE_ACCOUNT)"
for v in GCP_PROJECT REGION SERVICE SERVICE_ACCOUNT; do
  [ -n "${!v}" ] || die "$ENV_FILE no define $v."
done

VARS="$(read_env "$ENV_FILE" | grep -vE '^(GCP_PROJECT|REGION|SERVICE|SERVICE_ACCOUNT)=')"
if [ -f "$SECRETS_FILE" ]; then
  VARS="$VARS
$(read_env "$SECRETS_FILE")"
  ok "Secretos: $SECRETS_FILE"
else
  ok "Sin $SECRETS_FILE: se conservan los secretos que ya tiene el servicio."
fi
# gcloud list syntax with a custom delimiter (see `gcloud topic escaping`): values may contain commas.
UPDATE="^|^$(printf '%s' "$VARS" | paste -sd '|' -)"

if [ "$ENV_NAME" = "prod" ]; then
  guard_prod "BFF $SERVICE → $GCP_PROJECT" apps/fastapi_bff deploy/env scripts
fi

step "Desplegando el BFF ($SERVICE) a $ENV_NAME ($GCP_PROJECT, $REGION)"
printf '  variables: %s\n' "$(printf '%s\n' "$VARS" | sed 's/=.*//' | paste -sd ' ' -)"
run gcloud run deploy "$SERVICE" \
  --source apps/fastapi_bff \
  --project "$GCP_PROJECT" \
  --region "$REGION" \
  --service-account "$SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --update-env-vars "$UPDATE"

[ "${DRY_RUN:-}" = "1" ] && exit 0
URL="$(gcloud run services describe "$SERVICE" --project "$GCP_PROJECT" --region "$REGION" --format='value(status.url)')"
ok "BFF en $URL"
echo "  Si es la primera vez: pon esa URL en BFF_BASE_URL ($ENV_FILE) y en VITE_BFF_URL"
echo "  (apps/admin_app/.env.$GCP_PROJECT y apps/customer_web/.env.$GCP_PROJECT), y vuelve a desplegar."
