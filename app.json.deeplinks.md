# Deep link configuration

Add these patches to `app.json` to enable universal/app links (skysync.app).

## iOS — associated domains

```json
"ios": {
  "associatedDomains": [
    "applinks:skysync.app"
  ],
  "infoPlist": {
    "NSMicrophoneUsageDescription": "SkySync uses the microphone for Sky Room voice sessions.",
    "NSCameraUsageDescription": "SkySync uses the camera for the AR sky view.",
    "NSLocationWhenInUseUsageDescription": "SkySync uses your location to show the correct sky."
  }
}
```

## Android — intent filters

```json
"android": {
  "intentFilters": [
    {
      "action": "VIEW",
      "data": [
        { "scheme": "skysync" },
        { "scheme": "https", "host": "skysync.app" }
      ],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ]
}
```

## Static files for universal links

### `public/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.app.skysync",
        "paths": ["/room/*", "/object/*", "/constellation/*", "/learn/story/*"]
      }
    ]
  }
}
```

### `public/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.skysync",
      "sha256_cert_fingerprints": ["REPLACE_ME"]
    }
  }
]
```

When the user deploys the marketing site, these files must be served unauth and `Content-Type: application/json`.
