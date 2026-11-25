# Workout Timer

iOS interval workout timer. React 19 + TypeScript + Tailwind v4 (Vite), wrapped as a native iOS app with Capacitor 7 (Swift Package Manager, no CocoaPods).

## Commands

```bash
npm run dev                      # browser preview at http://localhost:5173 (browser speech, no haptics/keep-awake)
npm run build                    # tsc + vite build → dist/
npm run sync                     # build + copy into ios/
npm run ios                      # build + sync + open Xcode (needed for real device / signing)
npm run build && npx cap run ios --target <simulator-id>   # build & launch in simulator
npx cap run ios --list           # list simulator IDs
```

Always run `npm run build` after changes to check types; then `npx cap sync ios` (or `cap run`) before testing on iOS.

## Layout

- `src/App.tsx` — view state machine: list → edit → run. Owns the timer list and persists it.
- `src/components/TimerList.tsx` — home screen; play button calls `unlockAudio()`/`unlockSpeech()` inside the tap (iOS requires a user gesture).
- `src/components/TimerEditor.tsx` — create/edit form, duplicate, delete.
- `src/components/RunScreen.tsx` — workout engine + UI. Engine state lives in a ref (`Engine`); a 50 ms `setInterval` calls `tick()`. Time is computed from `performance.now()` (start time + carried ms from pauses), not by counting ticks, so it doesn't drift.
- `src/components/inputs.tsx` — `NumberField` and `DurationField` (min/sec boxes); typed values are saved when the field loses focus.
- `src/components/SoundPicker.tsx` — bottom-sheet sound list; tapping previews.
- `src/lib/types.ts` — `WorkoutTimer`, `PhaseSettings`, defaults (`newTimer()`).
- `src/lib/sequence.ts` — `buildSteps()` expands a timer into a flat list of steps; `formatTime()`.
- `src/lib/sounds.ts` — all sounds generated with the Web Audio API (no audio files). `playSound(id, offset)` returns the duration.
- `src/lib/speech.ts` — native TTS via `@capacitor-community/text-to-speech`, `speechSynthesis` fallback on web.
- `src/lib/storage.ts` — `@capacitor/preferences`, key `workout-timers.v1`. On load, saved timers are merged over `newTimer()` defaults, so new fields get defaults automatically.
- `ios/App/App/AppDelegate.swift` — sets `AVAudioSession` to `.playback` + `.mixWithOthers` (sounds play with the silent switch on, over the user's music).

## Product rules (decided with the user — keep these)

- Each timer has: countdown to start, exercise, break, sets per round, rest between rounds, rounds, cooldown. A phase set to 0:00 is skipped.
- Step order: prepare → (work, break) × sets — no break after the last set — → round rest (not after the last round) → … → cooldown.
- **All values are typed** on the numeric keypad. No sliders, wheels, or drag/scroll pickers for numbers.
- **Voice countdown** is set per phase (`speakFrom`, 0 = off). It speaks the remaining seconds as words. If a phase is shorter than `speakFrom`, it counts the whole phase.
- **Sounds are per timer, not per phase:**
  - `transitionSound` — one sound at workout start and at every phase change (played once per change, not as separate end + start sounds). It also plays at the end, followed by the spoken "Workout complete".
  - `tickSound` — clock tick every second, including while the voice is counting. Not played at the moment a phase starts (the transition sound covers that).
  - There is **no** finish sound (removed on purpose).
- Run screen: pause/resume, previous/next step, restart from beginning (asks for confirmation), end workout (asks for confirmation). Opening a confirmation pauses; "Keep Going" resumes only if the workout was running before.
- Portrait only, dark UI, screen kept awake during a workout, heavy haptic on each phase change.

## Toolchain gotchas

- **Capacitor 7, not 8**: Capacitor 8 requires Xcode 26; this Mac has Xcode 16.2. With Capacitor 8 the build fails with errors like `missing argument for parameter #2` in plugins. Keep all `@capacitor/*` packages on 7.x and `@capacitor-community/text-to-speech` on 6.x.
- **Config is `capacitor.config.json`**, not `.ts`: the Capacitor 7 CLI can't load a TS config with TypeScript 7.
- **Recreating `ios/`**: `cap add ios --packagemanager SPM` in CLI 7 has a bug (it lowercases the value and then compares it to `'SPM'`), so it falls back to CocoaPods, which isn't installed. Workaround: temporarily change `getPackageManager` in `node_modules/@capacitor/cli/dist/index.js` to also accept `'spm'`, run the add, then restore. After recreating, reapply the AppDelegate audio session and the Info.plist edits (portrait-only, `UIStatusBarStyleLightContent`, `UIViewControllerBasedStatusBarAppearance` false).
- JS is paused when the app is in the background; on return, `tick()` jumps to the correct step and plays only one transition sound.
