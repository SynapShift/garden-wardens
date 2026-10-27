#!/usr/bin/env bash
# Reproduce CI locally. Install dependencies with npm ci before running.
# CHROMIUM_PATH selects a system browser; otherwise run npx playwright install chromium.
set -euo pipefail
cd "$(dirname "$0")"
npm run format:check
npm run lint
npm run check
npm run test
npm audit --audit-level=low
npm run build
npm run test:e2e
if [[ -f Dockerfile ]]; then ./tools/check-docker.sh; fi
