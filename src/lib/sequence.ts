import type { PhaseKind, WorkoutTimer } from './types'

export interface Step {
  kind: PhaseKind
  seconds: number
  round: number
  set: number
}

/**
 * Expand a timer into its flat list of steps:
 * prepare → [work, break]×sets (no break after the last set) → round rest
 * (none after the last round) → … → cooldown. Zero-length phases are skipped.
 */
export function buildSteps(t: WorkoutTimer): Step[] {
  const steps: Step[] = []
  const push = (kind: PhaseKind, round: number, set: number) => {
    const seconds = t.phases[kind].seconds
    if (seconds > 0) steps.push({ kind, seconds, round, set })
  }
  push('prepare', 1, 1)
  for (let r = 1; r <= t.rounds; r++) {
    for (let s = 1; s <= t.sets; s++) {
      push('work', r, s)
      if (s < t.sets) push('rest', r, s)
    }
    if (r < t.rounds) push('roundRest', r, t.sets)
  }
  push('cooldown', t.rounds, t.sets)
  return steps
}

export function totalSeconds(t: WorkoutTimer): number {
  return buildSteps(t).reduce((sum, s) => sum + s.seconds, 0)
}

export function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}
