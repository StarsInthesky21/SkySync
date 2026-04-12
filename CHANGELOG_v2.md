# SkySync v2 Changelog

## Live astronomy

- Real Sun, Moon, and planet ephemerides via Meeus-derived [planetEphemeris](src/services/astronomy/planetEphemeris.ts).
- Satellite tracking from TLE ([satelliteTracking.ts](src/services/astronomy/satelliteTracking.ts)) with 12 h cached CelesTrak fetch.
- Observer-aware horizon, rise/transit/set calculations.
- Open-Meteo weather + combined observability score ([observingConditions.ts](src/services/astronomy/observingConditions.ts)).
- New [ObservingCard](src/components/sections/ObservingCard.tsx) on the sky screen.

## 3D AR

- Full quaternion projection ([skyProjection.ts](src/services/sky/skyProjection.ts)) replaces the compass overlay.
- Device attitude hook ([useAttitudeQuaternion.ts](src/hooks/useAttitudeQuaternion.ts)) with slerp smoothing.
- Dedicated [AR screen](app/ar.tsx) with reticle, HUD, and tap-to-open.

## Deep navigation

- Nine new screens: `/object/[id]`, `/constellation/[id]`, `/room/create`, `/room/join`, `/room/[code]`, `/search`, `/notifications`, `/settings/observing`, `/learn/story/[id]`.
- Top bar links: Search, AR, Alerts.
- Share sheet produces `skysync://room/ABC123`.

## Real VoIP

- [LiveKit wrapper](src/services/voice/livekitService.ts), [token provider](src/services/voice/tokenProvider.ts), [VoiceProvider](src/providers/VoiceProvider.tsx).
- [VoiceLounge](src/components/sections/VoiceLounge.tsx) rewritten — join, mute, push-to-talk, leave, quality pip.
- [Cloud function stub](functions/livekit-token.ts) for token minting.
- Graceful fallback when native module absent (Expo Go).

## Quality gates

- ESLint + Prettier config ([.eslintrc.cjs](.eslintrc.cjs), [.prettierrc](.prettierrc)).
- [CI matrix](.github/workflows/ci.yml): typecheck, lint, jest, Maestro.
- 5 Maestro E2E flows.
- [Dependabot](.github/dependabot.yml) for weekly updates.
- Unit tests for astronomy, projection, satellite, tokens, VoiceProvider fallback, observing conditions, and a smoke test.

## Upgrade path

- LiveKit: `npm install livekit-client @livekit/react-native @livekit/react-native-webrtc`, add Expo plugin, deploy [livekit-token](functions/livekit-token.ts).
- Higher precision: swap `planetEphemeris` for `astronomy-engine`; `satelliteTracking` for `satellite.js` (SGP4).
