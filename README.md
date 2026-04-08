# SkySync

SkySync is a cross-platform React Native app concept for social AR stargazing. This MVP ships a modular Expo/TypeScript foundation with:

- real-time sky viewport abstraction ready to swap with ARKit and ARCore
- tappable celestial objects with facts, mythology, and distance metadata
- time travel simulation for past and future sky positions
- basic Sky Rooms with shared pins, live friend pointer indicators, and room switching
- guided discovery cards, space events feed, achievements, and astrophotography prompts

## Stack

- Expo + React Native + TypeScript
- `react-native-svg` for constellation overlays
- mocked sensor and room sync services behind provider boundaries

## Project structure

- `App.tsx`: app entrypoint
- `src/screens`: screen composition
- `src/components`: UI modules
- `src/providers`: global state and orchestration
- `src/services`: sky calculations and realtime room adapters
- `src/data`: seed data and MVP catalogs
- `src/types`: shared domain types

## Run

1. Install dependencies with `npm install`
2. Start the dev server with `npm run start`
3. Launch on iOS or Android with `npm run ios` or `npm run android`

## Production integration path

- Replace `useSkyOrientation` with `expo-sensors` or native AR pose tracking.
- Replace `SkyViewport` with a native scene bridge backed by ARKit on iOS and ARCore on Android.
- Replace `roomSyncService` with Firebase or Supabase realtime channels.
- Connect `skyEngine` to live ephemeris data from NASA/JPL and star catalogs from Gaia or Hipparcos.
- Route assistant prompts through your preferred LLM API with the current sky context attached.
