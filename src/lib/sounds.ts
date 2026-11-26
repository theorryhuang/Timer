import { Capacitor } from '@capacitor/core'
import { canPlayNow, loadVoice, markUnlocked, soundOutput } from './voice'

/**
 * Synthesized transition sounds (Web Audio). No audio files needed.
 * Each sound schedules itself `offset` seconds from now and returns its length.
 */

export type SoundId =
  | 'none'
  | 'beep'
  | 'highBeep'
  | 'lowBeep'
  | 'doubleBeep'
  | 'tripleBeep'
  | 'longBeep'
  | 'chime'
  | 'descend'
  | 'bell'
  | 'whistle'
  | 'buzzer'
  | 'gong'
  | 'tick'
  | 'click'
  | 'woodblock'
  | 'ding'

export const SOUND_OPTIONS: { id: SoundId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'beep', label: 'Beep' },
  { id: 'highBeep', label: 'High beep' },
  { id: 'lowBeep', label: 'Low beep' },
  { id: 'doubleBeep', label: 'Double beep' },
  { id: 'tripleBeep', label: 'Triple beep' },
  { id: 'longBeep', label: 'Long beep' },
  { id: 'chime', label: 'Chime (rising)' },
  { id: 'descend', label: 'Chime (falling)' },
  { id: 'bell', label: 'Bell' },
  { id: 'whistle', label: 'Whistle' },
  { id: 'buzzer', label: 'Buzzer' },
  { id: 'gong', label: 'Gong' },
]

/** Short, quiet sounds suitable for playing every second. */
export const TICK_OPTIONS: { id: SoundId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'tick', label: 'Clock tick' },
  { id: 'click', label: 'Click' },
  { id: 'woodblock', label: 'Wood block' },
  { id: 'ding', label: 'Soft ding' },
]

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  return ctx
}

/**
 * iOS Safari mutes Web Audio when the silent switch is on. Playing an <audio>
 * element switches the page to "media playback", which makes Web Audio audible
 * too. So during a workout we loop a silent clip. iOS 17+ has a direct API for this.
 * Not needed in the native app: AppDelegate sets the audio session there.
 */
let keepAlive: HTMLAudioElement | null = null

function silentWavUrl(): string {
  const rate = 8000
  const samples = rate / 2 // 0.5 s
  const buf = new ArrayBuffer(44 + samples)
  const v = new DataView(buf)
  const str = (o: number, t: string) => {
    for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i))
  }
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, rate, true)
  v.setUint32(28, rate, true)
  v.setUint16(32, 1, true)
  v.setUint16(34, 8, true) // 8-bit
  str(36, 'data')
  v.setUint32(40, samples, true)
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128) // 8-bit silence
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

function bypassSilentSwitch() {
  if (Capacitor.isNativePlatform()) return
  const nav = navigator as Navigator & { audioSession?: { type: string } }
  if (nav.audioSession) {
    if (nav.audioSession.type !== 'playback') nav.audioSession.type = 'playback'
    return
  }
  if (!keepAlive) {
    keepAlive = document.createElement('audio')
    keepAlive.setAttribute('x-webkit-airplay', 'deny')
    keepAlive.setAttribute('playsinline', '')
    keepAlive.preload = 'auto'
    keepAlive.loop = true
    keepAlive.src = silentWavUrl()
  }
  if (keepAlive.paused) void keepAlive.play()?.catch(() => {})
}

/**
 * Note: we deliberately never switch the audio mode back after a workout
 * (no audioSession 'auto', no pausing for its own sake). Switching it on and off
 * between workouts interrupted Web Audio on older iPhones.
 */

/** When the context last went from running to not running (0 = it's running). */
let notRunningSince = 0
/** Must be called from a user gesture (tap) so iOS allows audio. */
export function unlockAudio() {
  bypassSilentSwitch()
  // A context iOS left "interrupted" (or that stayed suspended through an earlier tap)
  // often never recovers on older iOS. Replace it; this runs inside a tap, so the new one may start.
  if (ctx) {
    const state = ctx.state as string
    if (state === 'running') notRunningSince = 0
    else if (!notRunningSince) notRunningSince = performance.now()
    const stuck = state === 'interrupted' || state === 'closed' || (notRunningSince > 0 && performance.now() - notRunningSince > 1500)
    if (stuck) {
      try {
        void ctx.close()
      } catch {
        // ignore
      }
      ctx = null
      notRunningSince = 0
    }
  }
  const c = getCtx()
  markUnlocked()
  if (c.state !== 'running') void c.resume()
  // Play a silent buffer: required by older iOS WebKit to fully unlock.
  const buf = c.createBuffer(1, 1, 22050)
  const src = c.createBufferSource()
  src.buffer = buf
  src.connect(c.destination)
  src.start(0)
  void loadVoice(c)
}

/**
 * Resolves once the audio clock has been running steadily for `stableMs`
 * (or after `timeoutMs`). On older iPhones audio takes a moment to start after the
 * tap, and starting the screen-on video can interrupt it again right after; starting
 * the workout clock during either lost the first second's tick.
 */
export function whenAudioReady(stableMs = 500, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    const c = getCtx()
    const start = performance.now()
    let lastTime = -1
    let stableSince = 0
    let clockAtStable = 0
    const check = () => {
      const now = performance.now()
      const advancing = c.state === 'running' && lastTime >= 0 && c.currentTime >= lastTime
      if (!advancing) stableSince = 0
      else if (!stableSince) {
        stableSince = now
        clockAtStable = c.currentTime
      }
      // "Running" alone isn't enough: the audio clock must really have moved forward.
      const steady = stableSince > 0 && now - stableSince >= stableMs && c.currentTime - clockAtStable >= (stableMs / 1000) * 0.5
      if (steady || now - start > timeoutMs) {
        resolve()
        return
      }
      lastTime = c.state === 'running' ? c.currentTime : -1
      if (c.state !== 'running') {
        try {
          void c.resume()
        } catch {
          // ignore
        }
      }
      setTimeout(check, 40)
    }
    check()
  })
}

interface ToneOpts {
  freq: number
  start: number
  dur: number
  type?: OscillatorType
  gain?: number
  endFreq?: number
  /** Exponential decay (bell-like) instead of flat envelope. */
  decay?: boolean
  vibrato?: number
}

function tone(c: AudioContext, o: ToneOpts) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, o.start)
  if (o.endFreq) osc.frequency.exponentialRampToValueAtTime(o.endFreq, o.start + o.dur)

  if (o.vibrato) {
    const lfo = c.createOscillator()
    const lfoGain = c.createGain()
    lfo.frequency.value = o.vibrato
    lfoGain.gain.value = o.freq * 0.04
    // No .connect() chaining: it returns undefined (and throws) on Safari < 14.1.
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    lfo.start(o.start)
    lfo.stop(o.start + o.dur)
  }

  const peak = o.gain ?? 0.5
  g.gain.setValueAtTime(0.0001, o.start)
  g.gain.exponentialRampToValueAtTime(peak, o.start + 0.01)
  if (o.decay) {
    g.gain.exponentialRampToValueAtTime(0.0001, o.start + o.dur)
  } else {
    g.gain.setValueAtTime(peak, o.start + Math.max(0.01, o.dur - 0.03))
    g.gain.exponentialRampToValueAtTime(0.0001, o.start + o.dur)
  }
  osc.connect(g)
  g.connect(soundOutput(c))
  osc.start(o.start)
  osc.stop(o.start + o.dur + 0.02)
}

/** Plays a sound `offset` seconds from now. Returns its duration in seconds. */
export function playSound(id: SoundId, offset = 0): number {
  if (id === 'none') return 0
  // iOS can pause the silent loop (calls, notifications); try to restart it.
  if (keepAlive?.paused) void keepAlive.play()?.catch(() => {})
  const c = getCtx()
  if (!canPlayNow(c)) return 0
  const t = c.currentTime + offset

  switch (id) {
    case 'beep':
      tone(c, { freq: 880, start: t, dur: 0.18 })
      return 0.18
    case 'highBeep':
      tone(c, { freq: 1320, start: t, dur: 0.3 })
      return 0.3
    case 'lowBeep':
      tone(c, { freq: 440, start: t, dur: 0.3, type: 'triangle', gain: 0.7 })
      return 0.3
    case 'doubleBeep':
      tone(c, { freq: 988, start: t, dur: 0.14 })
      tone(c, { freq: 988, start: t + 0.2, dur: 0.14 })
      return 0.34
    case 'tripleBeep':
      for (let i = 0; i < 3; i++) tone(c, { freq: 988, start: t + i * 0.18, dur: 0.12 })
      return 0.48
    case 'longBeep':
      tone(c, { freq: 880, start: t, dur: 0.8 })
      return 0.8
    case 'chime':
      tone(c, { freq: 659, start: t, dur: 0.5, decay: true })
      tone(c, { freq: 988, start: t + 0.15, dur: 0.7, decay: true })
      return 0.85
    case 'descend':
      tone(c, { freq: 988, start: t, dur: 0.5, decay: true })
      tone(c, { freq: 659, start: t + 0.15, dur: 0.7, decay: true })
      return 0.85
    case 'bell':
      tone(c, { freq: 1047, start: t, dur: 1.6, decay: true, gain: 0.5 })
      tone(c, { freq: 2093, start: t, dur: 1.0, decay: true, gain: 0.15 })
      tone(c, { freq: 2637, start: t, dur: 0.6, decay: true, gain: 0.08 })
      return 1.6
    case 'whistle':
      tone(c, { freq: 2100, start: t, dur: 0.55, vibrato: 28, gain: 0.35 })
      return 0.55
    case 'buzzer':
      tone(c, { freq: 150, start: t, dur: 0.7, type: 'sawtooth', gain: 0.35 })
      tone(c, { freq: 153, start: t, dur: 0.7, type: 'square', gain: 0.15 })
      return 0.7
    case 'gong':
      tone(c, { freq: 98, start: t, dur: 2.5, decay: true, gain: 0.8 })
      tone(c, { freq: 196, start: t, dur: 2.0, decay: true, gain: 0.35 })
      tone(c, { freq: 293, start: t, dur: 1.4, decay: true, gain: 0.2 })
      return 2.5
    case 'tick':
      tone(c, { freq: 2400, start: t, dur: 0.03, type: 'square', gain: 0.12, decay: true })
      tone(c, { freq: 1100, start: t, dur: 0.04, gain: 0.2, decay: true })
      return 0.04
    case 'click':
      tone(c, { freq: 1500, start: t, dur: 0.02, type: 'triangle', gain: 0.35, decay: true })
      return 0.02
    case 'woodblock':
      tone(c, { freq: 820, start: t, dur: 0.09, gain: 0.45, decay: true })
      tone(c, { freq: 1640, start: t, dur: 0.05, gain: 0.12, decay: true })
      return 0.09
    case 'ding':
      tone(c, { freq: 1760, start: t, dur: 0.35, gain: 0.22, decay: true })
      return 0.35
  }
}
