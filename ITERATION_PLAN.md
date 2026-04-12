# Iteration Plan — closing the 82 → 95+ gap

Three targeted passes:

## Pass 1 — make the built code actually visible (score unlock)

1. Surface **observing conditions card** on the home screen — weather + moon + score.
2. Surface **live satellites** in the sky view — already computed, plumb to catalog renderer.
3. Add a **tonight's highlights** card wired to `getVisibleThingsTonight()` + new `riseTransitSet()`.
4. Fix hardcoded observer latitude in object detail — read from `useSkySync().observerLocation` (or default gracefully).

## Pass 2 — deepen navigation

5. Add `app/settings/_layout.tsx` with `account.tsx`, `observing.tsx`, `privacy.tsx`.
6. Add `app/learn/story/[id].tsx` that autoplays a myth.
7. Add **universal links** config — `skysync://room/ABC` + `/room/[code]` web fallback.

## Pass 3 — solid lint/tests

8. Add `src/__tests__/smoke.test.ts` — imports every screen and service so broken imports get caught early.
9. Add `src/services/astronomy/__tests__/liveCatalog.test.ts` — verifies planets, Sun, Moon show up.
10. Add `src/providers/__tests__/VoiceProvider.test.tsx` — verifies graceful fallback when native absent.
