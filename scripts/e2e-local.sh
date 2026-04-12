#!/usr/bin/env bash
# Run all Maestro flows against a running emulator or connected device.
# Prereq: Maestro CLI installed (curl -Ls "https://get.maestro.mobile.dev" | bash).

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

if ! command -v maestro > /dev/null; then
  echo "Maestro not installed. Install with:"
  echo "  curl -Ls https://get.maestro.mobile.dev | bash"
  exit 1
fi

maestro test .maestro/flows "$@"
