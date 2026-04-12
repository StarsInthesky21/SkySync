# Signing credentials

This directory stores signing artifacts for Android/iOS release builds. The
`.gitignore` excludes everything except the example files and this README.

## Preferred: EAS-managed credentials

Easiest and safest — let EAS generate and store the upload keystore and
distribution cert on Expo's servers, encrypted with your account key.

```
eas credentials
# Select Android → production → Set up a new keystore (auto-generate)
# Select iOS     → production → Set up new distribution certificate
```

With this flow you never handle the private key yourself. `eas build --profile production`
will fetch credentials at build time. This is what the `credentialsSource: remote`
setting in [eas.json](../eas.json) uses.

## Alternative: self-managed (local)

Only do this if you have a specific reason to keep keys outside EAS (e.g.
corporate policy, Play App Signing already enrolled on another CI, etc.)

### Generate the Android upload keystore

```
keytool -genkeypair -v \
  -keystore credentials/skysync-upload-key.jks \
  -alias skysync-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for a keystore password, key password, and identity info.
**Record these in a password manager — losing them locks you out of Play Store
updates forever.**

### Fetch the SHA-1 and SHA-256 fingerprints

```
keytool -list -v -keystore credentials/skysync-upload-key.jks -alias skysync-upload
```

Add both to Firebase → Project Settings → Android app → SHA certificate
fingerprints (required for Dynamic Links / Play App Signing verification).

### iOS distribution certificate

```
# On your Mac, via Xcode:
#   Xcode → Settings → Accounts → Manage Certificates → + → Apple Distribution
#   Then export to credentials/SkySync_Distribution.p12
#
# Generate a provisioning profile in Apple Developer Portal:
#   Identifiers → com.skysync.app → Profiles → + → App Store
#   Download to credentials/SkySync.mobileprovision
```

### Wire self-managed credentials

1. Copy the template:
   ```
   cp credentials/credentials.json.example credentials/credentials.json
   ```
2. Fill in the passwords and ensure the keystore/p12/profile paths are correct.
3. Change [eas.json](../eas.json) `credentialsSource` from `"remote"` to
   `"local"` on the `production` profile.

## Firebase Admin / Play Store upload key

For `eas submit --profile production --platform android` to push to Play:

1. Google Play Console → Setup → API access → link Google Cloud project
2. Create a service account with "Service Account User" role
3. Grant it "Release manager" permission on the app in Play Console
4. Download the JSON key → save as `credentials/play-service-account.json`

## Rotation

- EAS-managed: `eas credentials`, regenerate.
- Self-managed: regenerate the keystore/cert, update Play App Signing, bump
  `versionCode` in `app.json`.
