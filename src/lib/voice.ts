/**
 * Pre-recorded voice clips (public/voice/*.m4a: "1"–"60" and "complete"),
 * played through Web Audio so they start exactly when triggered.
 * Live text-to-speech has a variable start delay, which made the countdown
 * bunch up ("fivefour… three, two, one") or skip numbers.
 *
 * Clips were made on macOS with `say -v Samantha`, leading silence trimmed.
 * Apple's licence allows macOS voice output for personal, non-commercial use:
 * replace these files before publishing the app.
 */

export const MAX_CLIP_NUMBER = 60
const KEYS = [...Array.from({ length: MAX_CLIP_NUMBER }, (_, i) => String(i + 1)), 'complete']

const raw = new Map<string, Promise<ArrayBuffer | null>>()
const buffers = new Map<string, AudioBuffer>()
let ctx: AudioContext | null = null
let decoding: Promise<void> | null = null
let current: AudioBufferSourceNode | null = null

function fetchRaw(key: string) {
  let p = raw.get(key)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}voice/${key}.m4a`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null)
    raw.set(key, p)
  }
  return p
}

/** Download the clip files early (no audio context needed). */
export function prefetchVoice() {
  KEYS.forEach(fetchRaw)
}

/** Older Safari only has the callback form of decodeAudioData. */
function decode(c: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const p = c.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined
    if (p && typeof p.then === 'function') p.then(resolve, reject)
  })
}

/** Decode all clips into the given context. Safe to call repeatedly. */
export function loadVoice(c: AudioContext): Promise<void> {
  if (ctx && ctx !== c) {
    // Switched to a fresh context: drop nodes that belonged to the old one.
    current = null
    waiting.length = 0
  }
  ctx = c
  if (!decoding) {
    // KEYS starts at "1", so the most-used small numbers are ready first.
    decoding = (async () => {
      for (const key of KEYS) {
        if (buffers.has(key)) continue
        const data = await fetchRaw(key)
        if (!data) continue
        try {
          // decodeAudioData detaches the buffer, so pass a copy.
          buffers.set(key, await decode(c, data.slice(0)))
        } catch {
          // leave missing; text-to-speech fallback covers it
        }
      }
    })()
  }
  return decoding
}

let unlockedAt = 0
let skippedClips = 0

/** For the ?debug readout. */
export function voiceDebug() {
  return { clips: buffers.size, skippedClips }
}

/** Record that audio was just unlocked by a tap (resume() is then in flight and will succeed). */
export function markUnlocked() {
  unlockedAt = performance.now()
}

/**
 * Whether a sound scheduled now will play on time. A suspended context (screen
 * locked, call, Safari backgrounded) doesn't advance its clock, so anything
 * scheduled meanwhile plays in a burst once it resumes — the "rushed numbers" bug.
 * So when suspended we try to resume and tell the caller to skip this sound,
 * except right after a tap-unlock.
 */
export function canPlayNow(c: AudioContext): boolean {
  if (c.state === 'running') return true
  try {
    void c.resume()
  } catch {
    // ignore
  }
  const now = performance.now()
  return now - unlockedAt < 1000 || now < startupUntil
}

let startupUntil = 0

/**
 * For the first few seconds of a workout, sounds made while audio is briefly
 * interrupted are held and played when it comes back, instead of being dropped
 * (older iPhones interrupt audio right as a workout starts).
 */
export function allowQueuedStart(ms = 3000) {
  startupUntil = performance.now() + ms
}

const waiting: { node: GainNode; at: number }[] = []

/**
 * Where a new sound connects. While the context isn't running, each sound goes
 * through its own gain node; held sounds older than ~1 s are cut off when a new
 * one arrives, so an interruption never releases a long burst.
 */
export function soundOutput(c: AudioContext): AudioNode {
  if (c.state === 'running') {
    waiting.length = 0
    return c.destination
  }
  const now = performance.now()
  while (waiting.length && now - waiting[0].at > 1100) {
    const old = waiting.shift()
    try {
      old?.node.disconnect()
    } catch {
      // ignore
    }
  }
  const bus = c.createGain()
  bus.connect(c.destination)
  waiting.push({ node: bus, at: now })
  return bus
}

/** Play a clip now. Returns false if it isn't loaded (caller falls back to TTS). */
export function playClip(key: string): boolean {
  const buf = buffers.get(key)
  if (!ctx || !buf) return false
  stopClip()
  // Clip is loaded but audio is suspended: skip it (return true) rather than let it play late.
  if (!canPlayNow(ctx)) {
    skippedClips++
    return true
  }
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  gain.gain.value = 1
  src.buffer = buf
  src.connect(gain)
  gain.connect(soundOutput(ctx))
  src.start(0)
  current = src
  src.onended = () => {
    if (current === src) current = null
  }
  return true
}

export function stopClip() {
  if (current) {
    try {
      current.stop()
    } catch {
      // already stopped
    }
    current = null
  }
}
