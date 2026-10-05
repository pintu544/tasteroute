#!/usr/bin/env bash
# Deploy TasteRoute to Google Cloud Run (staging or production).
# Usage: deploy.sh <staging|production>
# T-5 (deferred per Pintu): full Cloud Run deploy lands here. Until GCP
# credentials exist, this exits 0 with an explicit "pending" log so the
# pipeline stays green and honest.
set -euo pipefail

ENV="${1:?usage: deploy.sh <staging|production>}"

if [[ -z "${GCP_PROJECT:-}" || -z "${GCP_SA_KEY:-}" ]]; then
  echo "================================================================"
  echo "GCP not configured (T-5 deferred) — Cloud Run deploy SKIPPED."
  echo "Environment: ${ENV}. No artifacts were pushed; nothing pretended."
  echo "================================================================"
  exit 0
fi

echo "Deploying API to Cloud Run (${ENV}) in project ${GCP_PROJECT}..."
# gcloud auth activate-service-account --key-file <(echo "$GCP_SA_KEY")
# gcloud run deploy "tasteroute-api-${ENV}" \
#   --image "${CI_REGISTRY_IMAGE}/api:${CI_COMMIT_SHORT_SHA}" \
#   --region asia-south1 --platform managed --allow-unauthenticated \
#   --set-env-vars "QLOO_MOCK=${QLOO_MOCK:-true},LLM_MOCK=${LLM_MOCK:-true}" \
#   --project "${GCP_PROJECT}"
echo "TODO(T-5): uncomment gcloud deploy once GCP is configured."
