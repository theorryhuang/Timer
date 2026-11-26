# Workout Timer

iOS interval workout timer. React 19 + TypeScript + Tailwind **v3** (Vite), wrapped as a native iOS app with Capacitor 7 (Swift Package Manager, no CocoaPods).

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
- `src/lib/voice.ts` — countdown voice. Plays pre-recorded clips `public/voice/1.m4a`–`60.m4a` and `complete.m4a` through Web Audio, so they start exactly on time. Clips are fetched at app start and decoded in `unlockAudio()`.
- `src/lib/speech.ts` — `speakNumber()`/`speakComplete()` try the clips first and fall back to live text-to-speech (native plugin, or `speechSynthesis` on web) only if a clip isn't loaded.
  - Don't switch the countdown back to live TTS: its variable start delay made numbers bunch up ("fivefour… three, two, one") or get dropped.
  - To regenerate clips: `say -v Samantha -r 210 --file-format=WAVE --data-format=LEI16@22050`, trim leading silence, then `afconvert -f m4af -d aac -b 48000`. macOS voice output is licensed for personal, non-commercial use only; replace the clips before publishing to the App Store.
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
- Deleting timers: **Edit** on the main list shows a trash button per timer (tap, then tap **Delete** to confirm); there's also a **Delete Timer** button at the bottom of the edit screen.
- Run screen: pause/resume, previous/next step, restart from beginning (asks for confirmation), end workout (asks for confirmation). Opening a confirmation pauses; "Keep Going" resumes only if the workout was running before.
- Portrait only, dark UI, screen kept awake during a workout, heavy haptic on each phase change.

## Web hosting

- Hosted on GitHub Pages from `.github/workflows/deploy.yml`: every push to `main` builds and deploys `dist/`. https is required for Wake Lock.
- `vite.config.ts` uses `base: './'` so the build works at the Pages subpath (`/Timer/`) and inside the iOS app. Fetch assets relative to `import.meta.env.BASE_URL`, never from `/`.

## Toolchain gotchas

- **Capacitor 7, not 8**: Capacitor 8 requires Xcode 26; this Mac has Xcode 16.2. With Capacitor 8 the build fails with errors like `missing argument for parameter #2` in plugins. Keep all `@capacitor/*` packages on 7.x and `@capacitor-community/text-to-speech` on 6.x.
- **Config is `capacitor.config.json`**, not `.ts`: the Capacitor 7 CLI can't load a TS config with TypeScript 7.
- **Recreating `ios/`**: `cap add ios --packagemanager SPM` in CLI 7 has a bug (it lowercases the value and then compares it to `'SPM'`), so it falls back to CocoaPods, which isn't installed. Workaround: temporarily change `getPackageManager` in `node_modules/@capacitor/cli/dist/index.js` to also accept `'spm'`, run the add, then restore. After recreating, reapply the AppDelegate audio session and the Info.plist edits (portrait-only, `UIStatusBarStyleLightContent`, `UIViewControllerBasedStatusBarAppearance` false).
- **Older iPhone support (iOS 14+)**: the app is also used from Safari over a plain `http://` LAN link on older phones. So:
  - Stay on **Tailwind v3** (`tailwind.config.js` + `postcss.config.js`). Tailwind v4 needs iOS 16.4+ and broke the app on an older iPhone. Avoid v4-only class names (e.g. `min-w-24`, `size-*`); use arbitrary values like `min-w-[6rem]`.
  - `vite.config.ts` builds for `es2019` / `safari14`; keep it.
  - Never call `crypto.randomUUID()` directly; use `uid()` from `src/lib/types.ts`. `randomUUID` doesn't exist on non-https pages or older iOS.
  - Web Audio: never chain `a.connect(b).connect(c)`; on Safari < 14.1 `connect` returns undefined and throws, so no sound plays.
  - In Safari (not the native app), Web Audio is muted by the silent switch. `unlockAudio()` works around it with `navigator.audioSession.type = 'playback'` (iOS 17+) or a looping silent `<audio>` clip (older iOS). Never switch these back off between workouts: toggling the audio mode interrupted Web Audio on older iPhones.
  - **Screen-on on the web** uses only the Screen Wake Lock API (`wake.ts`; https + iOS 16.4+). Where it's unavailable we do nothing and the phone's Auto-Lock setting applies. Don't bring back hidden-video tricks (NoSleep.js): its looping video has an audio track that fought the silent `<audio>` clip and broke sounds on an iPhone 13 Pro Max.
  - **Every start** (first run, restart, "Do it again") goes through `begin()` in `RunScreen.tsx`: wait for `whenAudioReady()` (audio clock running steadily for 0.5 s, max 3 s), then start the workout clock. On older iPhones audio takes a moment to start after the tap; without this wait the first second's tick was lost.
  - Backup: for 3 s after a start (`allowQueuedStart()`), sounds made while audio is interrupted are held and played when it returns (`soundOutput()` in `voice.ts`), capped at ~1 s of sounds so there's never a burst. All sounds must connect via `soundOutput(c)`, not `c.destination`.
  - **Fresh AudioContext per workout**: `startFreshAudio()` (called in the Start tap and in restart / "Do it again") closes the old context and makes a new one. On iPhones the first run after loading the page always worked but later runs went silent, so contexts are never reused across workouts. Voice buffers are reused. Mid-workout, `unlockAudio()` on any tap still replaces a context that's `interrupted`/`closed`/stuck.
  - **Debugging on a phone**: open the site with `?debug` (e.g. `https://theorryhuang.github.io/Timer/?debug`) to see a live audio readout on the run screen: context state and clock, contexts made, skipped sounds/clips, clips loaded, audioSession type, silent-loop state. Ask for a screenshot instead of guessing.
  - Avoid newer browser built-ins that aren't polyfilled (`structuredClone`, `Array.prototype.at`, `Object.hasOwn`, `replaceAll`, `findLast`).
- **Screen-on / sleep (`src/lib/wake.ts`)**: use `keepScreenOn()` / `allowScreenOff()`, not the KeepAwake plugin directly. On the web this is the Wake Lock API only (https). If the screen locks mid-workout, Safari freezes the page; on return `tick()` jumps to the right step.
- **Suspended audio**: `canPlayNow()` in `voice.ts` skips sounds while the AudioContext is suspended, instead of queueing them (queued sounds burst out together on resume). During a workout, any tap calls `unlockAudio()` + `keepScreenOn()` to re-arm both.
- JS is paused when the app is in the background; on return, `tick()` jumps to the correct step and plays only one transition sound.
