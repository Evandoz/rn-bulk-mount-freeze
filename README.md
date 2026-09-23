# Repro for software-mansion/react-native-reanimated#10672

This branch pins `react-native-reanimated@4.5.5` + `react-native-worklets@0.10.1` (the only change vs `main`). On launch the JS side asks for a static flag the native build does not recognise (`Unable to recognize flag: USE_ANIMATION_BACKEND`, repeated), then the process dies with EXC_BAD_ACCESS (SIGSEGV).

# Reanimated 4.2.1 iOS freeze — bulk list (re)mount repro

Minimal standalone repro for:
**software-mansion/react-native-reanimated#10671** — *iOS UI freezes permanently after a bulk list (re)mount: `Exception in HostFunction: <unknown>` at `_maybeFlushUIUpdatesQueue`*.

## Versions (exactly the reported stack)

- react-native 0.83.10 (New Architecture / Fabric)
- react-native-reanimated 4.2.1
- react-native-worklets 0.7.2
- Expo SDK 55 dev client (prebuild, `expo run:ios`)

## Setup

```bash
bun install          # or npm install / yarn
npx expo run:ios     # builds & installs the dev client on a simulator
```

## Recipe (this is what triggers it)

1. The screen shows 40 rows in one commit (each row wraps a Reanimated-animated component).
2. Tap the two tiles to switch between **12 rows** and **0 rows**, i.e. force a full remount of the row set.
   Do **8 rounds × 2 taps = 16 remounts**, roughly 4 s apart. (The tiles are also Reanimated-animated components, like `heroui-native`'s `PressableFeedback`.)
3. Within the first rounds the log shows:

```
ERROR [Error: Exception in HostFunction: <unknown>] name: 'Error', jsEngine: 'Worklets'
    at _maybeFlushUIUpdatesQueue (native)
    at react-native-worklets/src/threads.native.ts:43
    at callMicrotasksOnUIThread_reactNativeWorklets_threadsNativeTs2 (threads.native.ts:52)
    at react-native-worklets/src/runLoop/uiRuntime/requestAnimationFrame.ts:33
    at callGuardDEV_reactNativeWorklets_callGuardNativeTs1 (callGuard.native.ts:12)
```

4. The page then **freezes**: it keeps the last rendered frame (in our app: the group header is present but the rows never mount), the process stays alive, and all further taps are ignored.

## How to tell it is frozen (important)

The failure is **probabilistic**, and short sequences give false negatives — a 2-tap run once looked clean on a configuration that fails within 16 taps. Use a **multi-round soak** plus this probe:

> After the taps, tap any tile. If its selected background no longer moves, the UI runtime's `requestAnimationFrame` loop is dead = frozen.

## What did *not* matter in our testing (same recipe)

| change | result |
| --- | --- |
| `isAnimatedStyleActive={false}` on the rows' animated wrapper | still freezes |
| rows replaced with a plain RN `Pressable` (no Reanimated wrapper) | still freezes |
| chunked mounting (max 4 new rows per frame) | fewer exceptions, still freezes |
| removing a HeroUI `ScrollShadow` wrapper around the scroll container | still freezes |
| ~7 rows per commit instead of 12 | clean across 2 full soak runs |

So the trigger is not the row wrapper itself, but "many newly created elements in one commit" combined with Reanimated activity elsewhere on the screen.

## Verification status (2026-09-23)

- **In the reported app (proprietary, not included here): reproducible, 5/5 runs.** A 16-remount soak (toggle between 0 and 12 rows, ~4 s apart) freezes the UI and logs `Exception in HostFunction: <unknown>` at `_maybeFlushUIUpdatesQueue`; the responsiveness probe confirms the UI runtime is dead.
- **In this minimal app: NOT reproduced, across three fidelity levels** (12 / 24 / 40 rows, plus 4 animated tiles, an animated scroll scrim and an animated tab indicator): 0 exceptions and the probe stayed responsive through every 16-remount soak.
- Discriminators we could isolate in the app: (a) how many elements are created in **one commit** (12 rows froze; ~7 rows stayed clean across 2 full soak runs), and (b) how much Reanimated activity is on screen at the same time (header scroll handler, tiles, bottom navigation, UI-library list chrome).
- We are happy to iterate on this repro — tell us which knob to turn (row count, more animated chrome, adding UI-library components) or what instrumentation would help.
