#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[erro] Arquivo .env não encontrado em: $ENV_FILE" >&2
  exit 1
fi

dotenv_get() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 0
  fi

  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

API_VERSION="$(dotenv_get WHATSAPP_API_VERSION)"
GRAPH_BASE="$(dotenv_get WHATSAPP_GRAPH_API_BASE_URL)"
TOKEN="$(dotenv_get WHATSAPP_ACCESS_TOKEN)"
PHONE_NUMBER_ID="$(dotenv_get WHATSAPP_PHONE_NUMBER_ID)"
WABA_ID="$(dotenv_get WHATSAPP_BUSINESS_ACCOUNT_ID)"
APP_ID="$(dotenv_get WHATSAPP_APP_ID)"

API_VERSION="${API_VERSION:-v25.0}"
GRAPH_BASE="${GRAPH_BASE:-https://graph.facebook.com}"

require_var() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "[erro] Variável obrigatória ausente no .env: $name" >&2
    exit 1
  fi
}

require_var "WHATSAPP_ACCESS_TOKEN" "$TOKEN"
require_var "WHATSAPP_PHONE_NUMBER_ID" "$PHONE_NUMBER_ID"
require_var "WHATSAPP_BUSINESS_ACCOUNT_ID" "$WABA_ID"

AUTH_HEADER="Authorization: Bearer $TOKEN"

pretty_json() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}

run_check() {
  local title="$1"
  local url="$2"

  echo
  echo "=================================================="
  echo "$title"
  echo "GET $url"
  echo "=================================================="

  local response
  response="$(curl -sS -X GET "$url" -H "$AUTH_HEADER")"
  printf '%s\n' "$response" | pretty_json
}

echo "[meta-debug] .env carregado: $ENV_FILE"
echo "[meta-debug] Graph API: ${GRAPH_BASE}/${API_VERSION}"
echo "[meta-debug] App ID: ${APP_ID:-<vazio>}"
echo "[meta-debug] WABA ID: $WABA_ID"
echo "[meta-debug] Phone Number ID: $PHONE_NUMBER_ID"
echo "[meta-debug] Token: <carregado>"

run_check \
  "1) Phone Number ID access" \
  "${GRAPH_BASE}/${API_VERSION}/${PHONE_NUMBER_ID}?fields=id,display_phone_number,verified_name,quality_rating"

run_check \
  "2) WABA phone numbers" \
  "${GRAPH_BASE}/${API_VERSION}/${WABA_ID}/phone_numbers"

run_check \
  "3) WABA subscribed apps" \
  "${GRAPH_BASE}/${API_VERSION}/${WABA_ID}/subscribed_apps"

echo
cat <<'MSG'
Sugestão se o app não aparecer em subscribed_apps:

curl -X POST "https://graph.facebook.com/<API_VERSION>/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <WHATSAPP_ACCESS_TOKEN>"
MSG
