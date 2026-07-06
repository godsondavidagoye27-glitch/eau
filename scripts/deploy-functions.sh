#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] || [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF. Set these in Actions secrets."
  exit 1
fi

echo "Logging into Supabase CLI..."
supabase login --token "$SUPABASE_ACCESS_TOKEN"

mkdir -p supabase/functions

# Deploy each function file matching supabase-functions-*.ts
for f in ../supabase-functions-*.ts ./supabase-functions-*.ts supabase-functions-*.ts; do
  if [ ! -f "$f" ]; then
    continue
  fi
  name=$(basename "$f" .ts)
  fn=${name#supabase-functions-}
  mkdir -p supabase/functions/$fn
  echo "Copying $f -> supabase/functions/$fn/index.ts"
  cp "$f" supabase/functions/$fn/index.ts
  echo "Deploying function: $fn"
  supabase functions deploy $fn --project-ref "$SUPABASE_PROJECT_REF" || {
    echo "Deployment of $fn failed"; exit 1
  }
done

# Optionally set project secrets if provided as environment variables
SECRETS=("SUPABASE_SERVICE_ROLE_KEY" "ADMIN_API_SECRET" "AFTERSHIP_API_KEY" "SHIPENGINE_API_KEY" "SUPABASE_STORAGE_BUCKET" "BULK_JOB_PREFIX")
for key in "${SECRETS[@]}"; do
  val=${!key:-}
  if [ -n "$val" ]; then
    echo "Setting project secret: $key"
    supabase secrets set "$key=$val" --project-ref "$SUPABASE_PROJECT_REF" || echo "Failed to set secret $key"
  fi
done

echo "Deploy complete."
