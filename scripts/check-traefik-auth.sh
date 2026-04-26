#!/bin/sh
# Pre-deploy check: Ensure TRAEFIK_DASHBOARD_AUTH is not the placeholder value.
# Run this in CI/CD or container entrypoint before starting production services.

set -e

if [ -z "$TRAEFIK_DASHBOARD_AUTH" ]; then
  echo "WARNING: TRAEFIK_DASHBOARD_AUTH is not set. Dashboard will be inaccessible."
  exit 0
fi

case "$TRAEFIK_DASHBOARD_AUTH" in
  *REPLACE_WITH*)
    echo "FATAL: TRAEFIK_DASHBOARD_AUTH still contains placeholder 'REPLACE_WITH'."
    echo "       Generate a real htpasswd hash before deploying to production:"
    echo "       htpasswd -nbB admin YOUR_SECURE_PASSWORD"
    exit 1
    ;;
esac

echo "OK: TRAEFIK_DASHBOARD_AUTH appears to be configured."
