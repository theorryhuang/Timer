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

/** Must be called from a user gesture (tap) so iOS allows audio. */
export function unlockAudio() {
  const c = getCtx()
  if (c.state !== 'running') void c.resume()
  // Play a silent buffer: required by older iOS WebKit to fully unlock.
  const buf = c.createBuffer(1, 1, 22050)
  const src = c.createBufferSource()
  src.buffer = buf
  src.connect(c.destination)
  src.start(0)
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
    lfo.connect(lfoGain).connect(osc.frequency)
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
  osc.connect(g).connect(c.destination)
  osc.start(o.start)
  osc.stop(o.start + o.dur + 0.02)
}

/** Plays a sound `offset` seconds from now. Returns its duration in seconds. */
export function playSound(id: SoundId, offset = 0): number {
  if (id === 'none') return 0
  const c = getCtx()
  if (c.state !== 'running') void c.resume()
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
