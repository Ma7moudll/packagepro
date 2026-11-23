#!/usr/bin/env bash
set -euo pipefail
: "${BACKEND_URL:?Set the deployed backend URL}"
# A non-2xx response or exhausted connectivity retry must fail deployment.
# This is a backend liveness gate, not a readiness/provider verification claim.
curl --fail --silent --show-error --retry 5 --retry-delay 3 --retry-all-errors \
  --connect-timeout 5 --max-time 30 "${BACKEND_URL%/}/health"
