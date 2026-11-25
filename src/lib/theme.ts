import type { AccentColor, PhaseKind } from './types'

export const ACCENTS: Record<AccentColor, { dot: string; bar: string; text: string }> = {
  rose: { dot: 'bg-rose-500', bar: 'bg-rose-500', text: 'text-rose-400' },
  orange: { dot: 'bg-orange-500', bar: 'bg-orange-500', text: 'text-orange-400' },
  amber: { dot: 'bg-amber-400', bar: 'bg-amber-400', text: 'text-amber-300' },
  emerald: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-400' },
  sky: { dot: 'bg-sky-500', bar: 'bg-sky-500', text: 'text-sky-400' },
  violet: { dot: 'bg-violet-500', bar: 'bg-violet-500', text: 'text-violet-400' },
}

/** Full-screen background while a phase is running. */
export const PHASE_BG: Record<PhaseKind, string> = {
  prepare: 'bg-amber-500',
  work: 'bg-rose-600',
  rest: 'bg-sky-600',
  roundRest: 'bg-indigo-600',
  cooldown: 'bg-teal-600',
}

/** Small dot color for a phase in the editor. */
export const PHASE_DOT: Record<PhaseKind, string> = {
  prepare: 'bg-amber-400',
  work: 'bg-rose-500',
  rest: 'bg-sky-500',
  roundRest: 'bg-indigo-500',
  cooldown: 'bg-teal-500',
}
