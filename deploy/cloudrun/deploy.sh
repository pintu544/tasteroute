#!/usr/bin/env bash
# Deploy TasteRoute to Google Cloud Run (staging or production).
# Usage: deploy.sh <staging|production>
#
# Builds both service images with Cloud Build, pushes them to Artifact
# Registry, then deploys to Cloud Run. The API is deployed first so the
# web image can bake in the API URL (NEXT_PUBLIC_* is build-time).
#
# Required env: GCP_PROJECT
# Optional env: GCP_REGION (default asia-south1), GCP_SA_KEY (service-account
#   JSON; skipped if gcloud is already authenticated, e.g. in CI via OIDC),
#   QLOO_MOCK / LLM_MOCK (default true), IMAGE_TAG (default git short SHA).
#
# T-5: exits 0 with an explicit "pending" log when GCP_PROJECT is unset so
# the pipeline stays green and honest until Pintu provides GCP credentials.
set -euo pipefail

ENV="${1:?usage: deploy.sh <staging|production>}"

if [[ -z "${GCP_PROJECT:-}" ]]; then
  echo "================================================================"
  echo "GCP not configured (T-5 pending) — Cloud Run deploy SKIPPED."
  echo "Environment: ${ENV}. No artifacts were pushed; nothing pretended."
  echo "Set GCP_PROJECT (and GCP_SA_KEY or pre-authenticated gcloud) to enable."
  echo "================================================================"
  exit 0
fi

REGION="${GCP_REGION:-asia-south1}"
TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
REPO="${REGION}-docker.pkg.dev/${GCP_PROJECT}/tasteroute"

echo "==> Project: ${GCP_PROJECT} | Region: ${REGION} | Env: ${ENV} | Tag: ${TAG}"

# Auth (skip if gcloud already has credentials, e.g. CI OIDC).
if [[ -n "${GCP_SA_KEY:-}" ]]; then
  echo "==> Authenticating service account..."
  echo "${GCP_SA_KEY}" | gcloud auth activate-service-account --key-file=-
fi
gcloud config set project "${GCP_PROJECT}" >/dev/null

# Artifact Registry repo (idempotent).
if ! gcloud artifacts repositories describe tasteroute --location="${REGION}" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repo..."
  gcloud artifacts repositories create tasteroute \
    --repository-format=docker --location="${REGION}" \
    --description="TasteRoute service images"
fi

# ---- API image ----
echo "==> Building API image..."
gcloud builds submit --quiet \
  --tag "${REPO}/api:${TAG}" api/

# ---- Deploy API ----
echo "==> Deploying API (${ENV})..."
gcloud run deploy "tasteroute-api-${ENV}" \
  --image "${REPO}/api:${TAG}" \
  --region "${REGION}" --platform managed \
  --allow-unauthenticated \
  --set-env-vars "QLOO_MOCK=${QLOO_MOCK:-true},LLM_MOCK=${LLM_MOCK:-true}" \
  --project "${GCP_PROJECT}"
API_URL="$(gcloud run services describe "tasteroute-api-${ENV}" \
  --region "${REGION}" --format 'value(status.url)')"
echo "==> API URL: ${API_URL}"

# ---- Web image (bakes in the API URL) ----
echo "==> Building web image..."
CB_YAML="$(mktemp)"
cat > "${CB_YAML}" <<EOF
steps:
- name: 'gcr.io/cloud-builders/docker'
  args:
  - 'build'
  - '--build-arg'
  - 'NEXT_PUBLIC_API_URL=${API_URL}'
  - '-t'
  - '${REPO}/web:${TAG}'
  - '.'
  dir: 'web'
images:
- '${REPO}/web:${TAG}'
EOF
gcloud builds submit --quiet --config "${CB_YAML}" .
rm -f "${CB_YAML}"

# ---- Deploy web ----
echo "==> Deploying web (${ENV})..."
gcloud run deploy "tasteroute-web-${ENV}" \
  --image "${REPO}/web:${TAG}" \
  --region "${REGION}" --platform managed \
  --allow-unauthenticated \
  --project "${GCP_PROJECT}"
WEB_URL="$(gcloud run services describe "tasteroute-web-${ENV}" \
  --region "${REGION}" --format 'value(status.url)')"

echo "================================================================"
echo "Deployed ${ENV}:"
echo "  API: ${API_URL}"
echo "  WEB: ${WEB_URL}"
echo "================================================================"
