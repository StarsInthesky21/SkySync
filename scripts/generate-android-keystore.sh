#!/usr/bin/env bash
# Generate a fresh Android upload keystore locally. The keystore and chosen
# passwords MUST be saved somewhere permanent (password manager + offsite
# backup) — losing them means you can't push updates to Play.

set -euo pipefail

cd "$(dirname "$0")/.."

KEYSTORE_PATH="credentials/skysync-upload-key.jks"
KEY_ALIAS="skysync-upload"

if [ -f "$KEYSTORE_PATH" ]; then
    echo "[generate-keystore] $KEYSTORE_PATH already exists. Refusing to overwrite."
    echo "[generate-keystore] If you really want a new one, delete the file first — but make sure"
    echo "[generate-keystore] you have a backup and understand Play App Signing implications."
    exit 1
fi

if ! command -v keytool >/dev/null 2>&1; then
    echo "keytool not found. Install a JDK (e.g. Temurin 17)." >&2
    exit 1
fi

mkdir -p credentials

keytool -genkeypair -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000

echo ""
echo "[generate-keystore] Keystore created at $KEYSTORE_PATH"
echo "[generate-keystore] Next steps:"
echo "  1. Store the keystore password and key password in a password manager."
echo "  2. Upload a backup copy of $KEYSTORE_PATH to encrypted offsite storage."
echo "  3. Copy credentials/credentials.json.example to credentials/credentials.json"
echo "     and fill in the passwords you chose."
echo "  4. Run: keytool -list -v -keystore $KEYSTORE_PATH -alias $KEY_ALIAS"
echo "     to get the SHA-1/SHA-256 fingerprints — add them to Firebase project settings."
