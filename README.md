# SkySync

SkySync is an Android-first Expo app for social stargazing. It turns the earlier lightweight sky map into a richer mobile app with real-time sky simulation, time travel, voice guidance, shared rooms, notes, chat, and educational mythology stories.

## Current features

- real-time virtual sky viewer built with `react-native-svg`
- stars, constellations, planets, satellites, and a meteor radiant
- drag to rotate the sky
- pinch to zoom
- real-time mode and time travel date/time controls
- quick jumps to 1800, 2100, and the current sky
- Earth, Mars, and Moon sky viewpoints
- tap any object to view:
  - name
  - distance from Earth
  - mythology story
  - scientific facts
- voice guide powered by `expo-speech`
- simplified 3D-style object preview
- animated mythology story playback for supported constellations
- badges and daily challenges
- Sky Rooms with shared:
  - time
  - highlights
  - notes
  - custom constellation drawings
- room chat and a global chatroom
- voice lounge preview for coordinating shared observing sessions while native voice stays in beta

## Project structure

- `App.tsx`: entrypoint
- `src/screens/SkySyncHomeScreen.tsx`: primary Android UI
- `src/providers/SkySyncProvider.tsx`: app state, time travel, room sync, and social state
- `src/components/sky/SkyView.tsx`: interactive sky renderer
- `src/components/sky/Star.tsx`: reusable object marker
- `src/components/sky/Constellation.tsx`: reusable sky line segment
- `src/components/sky/ObjectPreview3D.tsx`: rotating 3D-style object preview
- `src/components/sky/StoryPlayer.tsx`: animated mythology story player
- `src/services/skyEngine.ts`: projection and sky simulation logic
- `src/services/mock/roomSyncService.ts`: in-memory room and chat sync
- `src/data/skyData.ts`: static sky catalog and feature content

## Run

1. Install dependencies with `npm install`
2. Start Expo with `npm run start`
3. Open the project in Expo Go or run `npm run android`

## Notes

- The current social sync is mocked in memory so the app works without a backend.
- Voice lounge is presented honestly as a preview and coordination surface, not a shipping native VoIP implementation yet.
- If you want full multiplayer sync next, replace `src/services/mock/roomSyncService.ts` with Firebase Realtime Database or Firestore.
