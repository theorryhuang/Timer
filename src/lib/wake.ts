import { KeepAwake } from '@capacitor-community/keep-awake'
import { Capacitor } from '@capacitor/core'

/**
 * Keep the screen on during a workout.
 * Native app: the KeepAwake plugin.
 * Safari: the Screen Wake Lock API (iOS 16.4+, https only). Where it isn't
 * available (plain http, older iOS) we do nothing: the screen follows the phone's
 * Auto-Lock setting. No hidden-video tricks — they interfered with audio on iOS.
 */
const native = Capacitor.isNativePlatform()

interface Sentinel extends EventTarget {
  released: boolean
  release(): Promise<void>
}
type WakeLockApi = { request(type: 'screen'): Promise<Sentinel> }

let lock: Sentinel | null = null
let wanted = false
let requesting = false

function requestLock() {
  const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock
  if (!api || requesting || (lock && !lock.released)) return
  requesting = true
  api
    .request('screen')
    .then((s) => {
      requesting = false
      if (!wanted) {
        void s.release().catch(() => {})
        return
      }
      lock = s
      s.addEventListener('release', () => {
        if (lock === s) lock = null
      })
    })
    .catch(() => {
      requesting = false
    })
}

// iOS drops the lock when the page is hidden; take it again on return.
if (!native && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') requestLock()
  })
}

export function keepScreenOn() {
  if (native) {
    void KeepAwake.keepAwake().catch(() => {})
    return
  }
  wanted = true
  requestLock()
}

export function allowScreenOff() {
  if (native) {
    void KeepAwake.allowSleep().catch(() => {})
    return
  }
  wanted = false
  void lock?.release().catch(() => {})
  lock = null
}
