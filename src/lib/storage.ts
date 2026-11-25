import { Preferences } from '@capacitor/preferences'
import { newTimer, type WorkoutTimer } from './types'

const KEY = 'workout-timers.v1'

export async function loadTimers(): Promise<WorkoutTimer[]> {
  const { value } = await Preferences.get({ key: KEY })
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as WorkoutTimer[]
    // Fill any fields added in later versions with defaults.
    return parsed.map((t) => {
      const d = newTimer()
      return { ...d, ...t, phases: { ...d.phases, ...t.phases } }
    })
  } catch {
    return []
  }
}

export async function saveTimers(timers: WorkoutTimer[]) {
  await Preferences.set({ key: KEY, value: JSON.stringify(timers) })
}
