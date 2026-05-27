#!/bin/sh
set -eu

if [ -z "${API_BASE_URL:-}" ]; then
  if [ -n "${VERCEL_PROJECT_PRODUCTION_URL:-}" ]; then
    API_BASE_URL="https://${VERCEL_PROJECT_PRODUCTION_URL}/api"
  elif [ -n "${VERCEL_URL:-}" ]; then
    API_BASE_URL="https://${VERCEL_URL}/api"
  else
    API_BASE_URL="http://localhost:8081/api"
  fi
fi

printf "window.__APP_CONFIG__ = {\n  apiBaseUrl: '%s'\n};\n" "$API_BASE_URL" > src/assets/runtime-config.js
npm run build
