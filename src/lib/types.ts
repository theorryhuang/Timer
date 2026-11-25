import type { SoundId } from './sounds'

export type PhaseKind = 'prepare' | 'work' | 'rest' | 'roundRest' | 'cooldown'

export interface PhaseSettings {
  /** Length of the phase in seconds. 0 = phase skipped. */
  seconds: number
  /** Speak "N, N-1, ... one" starting at this many seconds remaining. 0 = off. */
  speakFrom: number
}

export type AccentColor = 'rose' | 'orange' | 'amber' | 'emerald' | 'sky' | 'violet'

export interface WorkoutTimer {
  id: string
  name: string
  color: AccentColor
  phases: Record<PhaseKind, PhaseSettings>
  /** Exercise + break combinations per round. */
  sets: number
  rounds: number
  /** One sound played at every phase change (end of one phase = start of the next). */
  transitionSound: SoundId
  /** Clock sound played every second. */
  tickSound: SoundId
  createdAt: number
  updatedAt: number
}

export const PHASE_ORDER: PhaseKind[] = ['prepare', 'work', 'rest', 'roundRest', 'cooldown']

export const PHASE_LABELS: Record<PhaseKind, string> = {
  prepare: 'Countdown to start',
  work: 'Exercise',
  rest: 'Break',
  roundRest: 'Rest between rounds',
  cooldown: 'Cooldown',
}

/** Short label shown on the running screen. */
export const PHASE_SHORT: Record<PhaseKind, string> = {
  prepare: 'Get Ready',
  work: 'Work',
  rest: 'Break',
  roundRest: 'Round Rest',
  cooldown: 'Cooldown',
}

export function newTimer(): WorkoutTimer {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: '',
    color: 'orange',
    phases: {
      prepare: { seconds: 10, speakFrom: 5 },
      work: { seconds: 40, speakFrom: 3 },
      rest: { seconds: 20, speakFrom: 3 },
      roundRest: { seconds: 60, speakFrom: 5 },
      cooldown: { seconds: 120, speakFrom: 0 },
    },
    sets: 8,
    rounds: 3,
    transitionSound: 'highBeep',
    tickSound: 'tick',
    createdAt: now,
    updatedAt: now,
  }
}
