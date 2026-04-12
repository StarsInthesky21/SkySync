#!/usr/bin/env bash
# Build and install the SkySync development client for native-module testing
# (LiveKit voice, camera AR, expo-gl 3D scene).
#
# Prerequisites:
#   - `npm install -g eas-cli`
#   - `eas login` (free Expo account is fine)
#   - A real Android device plugged in via USB with Developer Mode enabled,
#     OR an Android emulator running.
#   - For iOS: Xcode and a paid Apple Developer account (or a Mac with a free
#     account + 7-day signing).
#
# Usage:
#   ./scripts/build-dev-client.sh android
#   ./scripts/build-dev-client.sh ios

set -euo pipefail

PLATFORM="${1:-android}"
PROFILE="development"

cd "$(dirname "$0")/.."

if ! command -v eas >/dev/null 2>&1; then
    echo "eas-cli not found. Install with: npm install -g eas-cli"
    exit 1
fi

echo "[build-dev-client] Platform=$PLATFORM Profile=$PROFILE"
echo "[build-dev-client] Triggering EAS cloud build..."
eas build --profile "$PROFILE" --platform "$PLATFORM" --non-interactive --wait

echo "[build-dev-client] Done. Install the resulting APK/IPA on your test device,"
echo "then run: npm run start  (it will auto-open in the dev client)"
