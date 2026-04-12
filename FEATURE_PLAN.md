# SkySync v2 — Full Feature Completion Plan

This document covers five parallel workstreams that lift SkySync from a polished indie app to a production-ready platform. Every item is scoped, justified, and ordered.

---

## Workstream A — Real VoIP Voice Lounge

### Goal

Replace the coordination-only Voice Lounge with production-grade voice chat: real audio streams, per-participant mic state, mute/PTT, spatial indicators, and reliable Firebase-signalled rooms.

### Stack choice

- **LiveKit** (`livekit-client` for JS, `@livekit/react-native` for native). Free, self-hostable, proven SFU.
- **Why not WebRTC direct**: peer-to-peer scales to 4–6; SkySync rooms target 8–20.
- **Why not Agora/Twilio**: paid, closed, per-minute costs. LiveKit Cloud has a generous free tier.
- **Signalling**: LiveKit's built-in WebSocket signalling. Room token minting is the only backend concern.

### Architecture

```
┌──────────────┐  room create/join   ┌──────────────────┐
│ SkySync App  │ ──────────────────▶ │ /livekit/token   │  (Cloud Function)
└──────┬───────┘                     └────────┬─────────┘
       │ LiveKit JWT                          │ LIVEKIT_API_SECRET
       ▼                                      ▼
┌──────────────┐     audio RTP     ┌────────────────────┐
│ livekit-rn   │ ◀───────────────▶ │ LiveKit SFU         │
└──────────────┘                   └────────────────────┘
       ▲
       │ presence/mute state
       ▼
┌──────────────┐
│ Firestore    │ (still source of truth for room metadata + chat)
└──────────────┘
```

### Deliverables

1. **`src/services/voice/livekitService.ts`** — thin wrapper around LiveKit Room: connect, disconnect, publish mic, mute/unmute, set PTT, attach remote tracks, emit participant events.
2. **`src/services/voice/tokenProvider.ts`** — fetches short-lived LiveKit JWT; dev stub signs locally, prod calls `/livekit/token` Cloud Function.
3. **`src/providers/VoiceProvider.tsx`** — React context exposing `{ connected, participants, localMuted, activeSpeaker, connect, leave, toggleMute, setPTT }`. Swallows native-module errors so Expo Go still runs.
4. **`src/components/sections/VoiceLounge.tsx`** — rewritten UI: participant tiles with VU meter, mute indicator, speaking halo, press-to-talk button, leave button, connection quality chip.
5. **`src/components/voice/ParticipantTile.tsx`** — single-participant card with avatar, mic state, audio level bar.
6. **`src/hooks/useAudioLevel.ts`** — exposes `AudioTrack.getStats()` level for the VU meter at 30 fps.
7. **`app.json`** — register `@livekit/react-native-expo-plugin` and `@config-plugins/react-native-webrtc` with mic permission strings.
8. **`functions/livekit-token.ts`** — minimal Firebase Cloud Function signing LiveKit tokens (documented, commented for user to deploy).

### Edge cases handled

- Native module missing (Expo Go) → `VoiceProvider.connect` throws `VOICE_UNAVAILABLE`; UI falls back to coordination-only card with install-dev-client hint.
- Mic permission denied → surface retry CTA; never crash.
- Join/leave race conditions → idempotent connect guarded by ref.
- Participant list drift between LiveKit and Firestore → Firestore is authoritative for "who is in the room"; LiveKit is only for live audio.

### Out of scope (explicitly)

- Video.
- Noise suppression / Krisp integration.
- Spatial audio tied to sky view (future roadmap).

---

## Workstream B — 3D AR Overlay

### Goal

Replace the compass + SVG overlay with true handheld planetarium AR: live camera feed, 3D celestial sphere with ~5 000 stars, proper device orientation (quaternion) projecting the sky onto the camera frustum, tap-to-select.

### Stack choice

- **`expo-three`** + **`three.js`** + **`expo-gl`** for GPU rendering.
- **`expo-camera`** for the background texture (camera preview behind the GL view).
- **`expo-sensors`** `DeviceMotion` for attitude quaternion (`rotation.alpha/beta/gamma` converted to intrinsic ZXY quaternion).
- Everything runs on the GPU via a single `BufferGeometry` with per-star attributes (magnitude → pointSize, color → vertexColor).

### Architecture

```
┌─────────────────────────────────────┐
│ ThreeSkyScene                        │
│  ┌────────────────────────────────┐  │
│  │ <Camera/>  (background preview)│  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ <GLView/>                      │  │
│  │  • THREE.Scene                 │  │
│  │    – Stars  (Points + shader) │  │
│  │    – Planets (meshes)          │  │
│  │    – Constellation lines       │  │
│  │  • PerspectiveCamera driven    │  │
│  │    by device quaternion        │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Reticle + HUD (absolute RN)    │  │
│  └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Deliverables

1. **`src/components/sky/ThreeSkyScene.tsx`** — main GLView host. Owns scene, camera, renderer, animation loop. Accepts `objects`, `orientation`, `onSelect`.
2. **`src/components/sky/StarField3D.ts`** — factory that builds the Points object from the catalog. Custom vertex shader for size attenuation.
3. **`src/components/sky/PlanetMeshes.ts`** — builds `MeshBasicMaterial` spheres for planets/Moon with emissive tint.
4. **`src/components/sky/ConstellationLines3D.ts`** — `LineSegments` with faint blue material.
5. **`src/hooks/useAttitudeQuaternion.ts`** — subscribes to `DeviceMotion`, outputs `THREE.Quaternion`. Handles magnetic-north rotation + intrinsic→world frame conversion. Throttled to 60 Hz via `requestAnimationFrame`.
6. **`src/components/sky/ARScreen.tsx`** — full-screen AR view with camera background, GL foreground, reticle, tap-to-select raycast, back button, info card slide-up.
7. **`src/services/sky/catalogTo3D.ts`** — converts RA/Dec from the (live) catalog to unit sphere XYZ. Stars sit on radius 100; planets on radius 80 (so they occlude stars when drawn first).
8. **`app/(tabs)/index.tsx`** — "AR" button now navigates to `/ar`; legacy compass overlay kept as fallback toggle.
9. **`app/ar.tsx`** — new stack route hosting `ARScreen`.

### Performance budget

- 5 000 stars in a single Points call, per-star attributes → < 2 ms draw.
- No per-frame JS allocations.
- Animation loop uses `gl.endFrameEXP()`; target 60 fps on mid-range Android.

### Edge cases

- Camera permission denied → GL scene still renders over starfield background (dark blue radial gradient).
- `expo-gl` unavailable (web) → show "AR requires native build" hint.
- Magnetometer noise → 1-Euro filter on quaternion.
- Device doesn't support DeviceMotion → fall back to drag-to-pan manual camera.

---

## Workstream C — Lint, Formatting, CI, E2E Testing

### Goal

Make the project contribution-ready and regression-proof.

### Deliverables

#### Lint + format

1. **`.eslintrc.cjs`** — extends `eslint-config-expo`, `@typescript-eslint/recommended`, `plugin:react-hooks/recommended`. Custom rules: no default exports in components (except screens), no unused vars with `_` prefix exception, hook exhaustive deps as error.
2. **`.prettierrc`** — `printWidth: 110`, single quotes false, trailing commas all, semi true.
3. **`.eslintignore`** / **`.prettierignore`** — exclude `node_modules`, `dist`, `.expo`, `android`, `ios`.
4. **`package.json` scripts** — `lint`, `lint:fix`, `format`, `format:check`.

#### CI

5. **`.github/workflows/ci.yml`** — runs on PR + main push:
   - `check-typescript` job: `tsc --noEmit`
   - `check-lint` job: `npm run lint` + `npm run format:check`
   - `check-tests` job: `npm test -- --ci --coverage` with Codecov upload
   - `check-e2e` job: Maestro flows on an Android emulator via `reactivecircus/android-emulator-runner`
6. **`.github/workflows/ci.yml`** jobs run in parallel; all must pass to merge.
7. **`.github/dependabot.yml`** — weekly npm + github-actions updates.
8. Update existing `.github/workflows/android-apk.yml` to gate on the new `ci.yml` via `workflow_run`.

#### Hooks

9. **Husky + lint-staged**: `pre-commit` runs `eslint --fix` + `prettier --write` on staged files. `pre-push` runs `tsc --noEmit`.

#### E2E

10. **`.maestro/flows/`** — Maestro YAML flows:
    - `onboarding.yaml` — first launch → grant perms → land on sky
    - `select_object.yaml` — tap Sirius → modal opens → see distance
    - `create_room.yaml` — create room → copy code → leave room
    - `challenge_complete.yaml` — complete daily challenge → XP increments
    - `time_travel.yaml` — jump to 2100 → confirm date label
11. **`.maestro/config.yaml`** — default device profile.
12. **`scripts/e2e-local.sh`** — convenience script: `maestro test .maestro/flows`.

#### Coverage

13. Update Jest config to emit `coverage/lcov.info`. Add Codecov badge in README.

### Out of scope

- Detox. Maestro is simpler, faster, and covers mobile E2E without a native build config explosion.

---

## Workstream D — Deep Navigation

### Current state

Expo Router already ships 5 tabs: `index`, `explore`, `social`, `learn`, `profile`. Navigation is technically multi-screen but flat — every interesting destination is an inline modal or drawer. There's no deep stack, no object detail route, no URL-shareable room.

### Goal

Proper stack-per-tab with URL-addressable destinations.

### Destination inventory (new)

| Route                 | Purpose                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| `/ar`                 | Full-screen 3D AR (Workstream B)                                           |
| `/object/[id]`        | Object detail: facts, 3D preview, observe-tonight panel, add-to-highlights |
| `/constellation/[id]` | Constellation: star list, story player, trace-it tutorial                  |
| `/room/[code]`        | Single-room view with chat, participants, shared sky, voice lounge         |
| `/room/create`        | Create-room wizard (name, privacy, voice)                                  |
| `/room/join`          | Code entry                                                                 |
| `/notifications`      | Inbox: new room invites, story recommendations, streak reminders           |
| `/search`             | Full-text search across stars/planets/constellations/stories               |
| `/profile/badges`     | Badge grid with unlock dates                                               |
| `/profile/history`    | Discovery log: every object ever viewed                                    |
| `/settings/account`   | Firebase account, sign-out, delete data                                    |
| `/settings/observing` | Observer location, light-pollution mode, units                             |
| `/settings/privacy`   | Data export, legal links                                                   |
| `/learn/story/[id]`   | Story player deep link                                                     |

### Deliverables

1. **`app/_layout.tsx`** — promote to nested Stack: root Stack with `(tabs)`, `object/[id]`, `constellation/[id]`, `room/[code]`, `ar`, `search`, `notifications`, `settings` groups.
2. **`app/object/[id].tsx`** — new screen consuming `useLocalSearchParams`.
3. **`app/constellation/[id].tsx`** — new.
4. **`app/room/[code].tsx`** — new. Replaces the inline `RoomSection` render inside home.
5. **`app/room/create.tsx`** / **`app/room/join.tsx`** — wizard screens.
6. **`app/notifications.tsx`** — consumes notification store.
7. **`app/search.tsx`** — global search with Fuse.js-style fuzzy matcher over catalog.
8. **`app/settings/_layout.tsx`** + `account.tsx`, `observing.tsx`, `privacy.tsx`.
9. **`app/learn/story/[id].tsx`** — dedicated story screen, autoplays.
10. **`src/navigation/linking.ts`** — Expo Linking config for deep links (`skysync://room/ABC123`, universal links via `apple-app-site-association` + `assetlinks.json`).
11. **`src/components/TabBar.tsx`** — already exists; extend with badge indicators for notifications + room.
12. **Object modal → route migration**: `ObjectDetailModal` retained as a compact preview; tapping "More" pushes `/object/[id]`.
13. **Shareable URLs**: Room invite shares `skysync://room/ABC123` + `https://skysync.app/room/ABC123`.

### Navigation principles

- Every screen is URL-addressable.
- Tabs are roots; modals are for confirmations only.
- Back button always returns to the triggering tab, not the root.
- `<Link />` used throughout (no imperative `router.push` except in handlers).

---

## Workstream E — Live Astronomy Data

### Goal

Replace the static catalog with real-time astronomical calculations. Planets, Moon, Sun all computed live. Satellites (ISS, Starlink highlights) tracked from TLE. Stars from a proper 9-mag catalog. Weather / sky conditions from a free API.

### Stack choice

- **`astronomy-engine`** (npm, MIT, MSL-accurate) — replaces our home-grown J2000 math. Fully client-side; no network required.
- **`satellite.js`** — SGP4 propagation for satellites from TLE.
- **CelesTrak TLE feeds** — public TLEs (`https://celestrak.org/NORAD/elements/stations.txt` etc.). Cached 12 h.
- **Open-Meteo** — free, no-key weather API for cloud cover, humidity, moon phase.
- **HYG v3 extended** — expand from the current ~500 stars to ~8 900 (mag ≤ 6.5). JSON asset, lazy-loaded, compressed.

### Deliverables

1. **`src/services/astronomy/engineAdapter.ts`** — thin wrapper around `astronomy-engine`:
   - `planetEquatorial(body, date, observer)` → `{ ra, dec, distanceAU, magnitude, illumination }`
   - `sunEquatorial(date, observer)`, `moonEquatorial(date, observer)` (phase, illumination)
   - `riseTransitSet(body, date, observer)` — next rise/transit/set times.
2. **`src/services/astronomy/satelliteService.ts`** — periodically fetches TLE sets, caches to AsyncStorage, propagates with `satellite.js` every second. Exposes `getSatellites(date, observer) → Satellite[]`.
3. **`src/services/astronomy/catalogService.ts`** — loads HYG v3 subset lazily. Streaming JSON parse to avoid 8 MB JS parse stall. Returns `StarRecord[]` filtered by magnitude + visibility window.
4. **`src/services/astronomy/weatherService.ts`** — Open-Meteo wrapper; returns `{ cloudCoverPct, humidityPct, moonIllumination, seeingEstimate, bortleEstimate }`. Cached 30 min.
5. **`src/services/astronomy/observingConditions.ts`** — combines weather + moon + light pollution to produce an "Observe Tonight" score 0-100 and a textual recommendation.
6. **`src/services/skyEngine.ts`** — rewritten: consumes adapter outputs instead of hardcoded objects. Preserves current projection for the SVG fallback. Exports two parallel APIs:
   - `renderSkyObjects(transform)` — unchanged signature, now live.
   - `renderSkyObjects3D(transform)` — new, returns unit-sphere vectors for Workstream B.
7. **`src/data/hygSubset.json`** — 8 900 star records (pre-processed). Build script.
8. **`scripts/buildHygSubset.js`** — downloads HYG v3, filters to mag ≤ 6.5, writes JSON with minimal fields (`id, name, ra, dec, mag, ci`).
9. **`src/services/astronomy/__tests__/engineAdapter.test.ts`** — regression tests: Jupiter at known epoch, Moon phase on a known full moon.
10. **`src/services/astronomy/__tests__/satelliteService.test.ts`** — ISS position on known date vs. Heavens-Above fixture.
11. **`src/data/skyData.ts`** — gutted: now only holds mythology, badges, daily challenges, curated "featured" lists. Numeric sky data is gone.
12. **Offline mode** — all astronomy math still works offline (client-side). Only satellites + weather degrade to "last cached" gracefully.

### Performance

- HYG subset is memoized at load; rendering pass runs in < 8 ms for all 8 900 stars (pure math).
- Satellites are recomputed at 1 Hz, not every frame.
- Weather pulled max every 30 min per observer location bucket (rounded to 0.1°).

### Out of scope

- Deep-sky objects (Messier/NGC). Placeholder hooks included for later.

---

## Cross-cutting concerns

### Type system

New union `type SkyBody = Star | Planet | Satellite | DeepSky | Mythic;` with discriminated `kind`. Existing `SkyObject` kept as legacy alias pointing to the union for one release.

### Data migration

- `AsyncStorage` keys unchanged.
- Object IDs for planets/stars remain stable (e.g., `jupiter`, `hip-32349` for Sirius).
- Discovery history is reconciled on startup: unknown IDs → "legacy discovery" bucket, never lost.

### Rollout

Branch order (stacked):

1. `feat/live-astronomy` (Workstream E) — underpins everything.
2. `feat/navigation-depth` (Workstream D) — needs object/[id] for AR tap-through.
3. `feat/ar-3d` (Workstream B).
4. `feat/voice-real` (Workstream A).
5. `feat/ci-quality` (Workstream C) — last, because it gates everything else and we want the new code to pass.

### Risk register

| Risk                                          | Mitigation                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| LiveKit native module breaks Expo Go          | Guarded dynamic require, dev-client docs                                      |
| `expo-three` FPS collapses on low-end Android | Toggle to SVG-2D fallback; cap star count at 3 000 on devices with < 4 GB RAM |
| Satellite TLEs stale                          | 12 h cache + "updated Xh ago" badge                                           |
| HYG subset bloats bundle                      | Lazy load from remote CDN after first run, then cache                         |
| Maestro flaky on CI                           | Retry 3× + video capture on fail                                              |

---

## Acceptance criteria

A feature is DONE when all of the following hold:

- [ ] Code merged behind no feature flag.
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] `npm test` green with ≥ 70 % coverage of new modules.
- [ ] Matching Maestro flow added and passing on CI.
- [ ] User-visible copy reviewed — no "preview", "beta", "coming soon" strings on shipped surfaces.
- [ ] Expo Go still boots and shows graceful fallback for native-only features.
