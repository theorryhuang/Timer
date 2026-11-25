import { KeepAwake } from '@capacitor-community/keep-awake'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildSteps, formatTime } from '../lib/sequence'
import { playSound } from '../lib/sounds'
import { speak, speakNumber, stopSpeaking } from '../lib/speech'
import { PHASE_BG } from '../lib/theme'
import { PHASE_SHORT, type WorkoutTimer } from '../lib/types'

interface Engine {
  idx: number
  /** performance.now() when the current running stretch began. */
  startedAt: number
  /** ms already elapsed in the current step before startedAt (from pauses). */
  carried: number
  running: boolean
  done: boolean
  /** Last number spoken in this step, so each is said once. */
  lastSpoken: number
  /** Last whole second ticked in this step, so each second ticks once. */
  lastTick: number
}

const haptic = () => void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})

export function RunScreen({ timer, onExit }: { timer: WorkoutTimer; onExit: () => void }) {
  const steps = useMemo(() => buildSteps(timer), [timer])
  const eng = useRef<Engine>({ idx: 0, startedAt: performance.now(), carried: 0, running: true, done: false, lastSpoken: -1, lastTick: -1 })
  const [, force] = useState(0)
  /** Which confirmation sheet is open. The workout is paused while one is showing. */
  const [confirm, setConfirm] = useState<null | 'exit' | 'reset'>(null)
  const wasRunning = useRef(false)

  const elapsedNow = () => {
    const e = eng.current
    return e.carried + (e.running ? performance.now() - e.startedAt : 0)
  }

  const tick = useCallback(() => {
    const e = eng.current
    if (!e.running || e.done) return
    const now = performance.now()
    let elapsed = e.carried + now - e.startedAt
    let step = steps[e.idx]
    let transitioned = false
    const fromIdx = e.idx

    // Advance through any finished steps (more than one only if the app was suspended).
    while (elapsed >= step.seconds * 1000) {
      const overshoot = elapsed - step.seconds * 1000
      if (e.idx + 1 >= steps.length) {
        e.done = true
        e.running = false
        const d = playSound(timer.transitionSound)
        setTimeout(() => speak('Workout complete'), Math.max(300, d * 1000 + 100))
        haptic()
        void KeepAwake.allowSleep().catch(() => {})
        force((n) => n + 1)
        return
      }
      e.idx++
      e.carried = 0
      e.startedAt = now - overshoot
      e.lastSpoken = -1
      e.lastTick = -1
      elapsed = overshoot
      step = steps[e.idx]
      transitioned = true
    }

    if (transitioned) {
      playSound(timer.transitionSound)
      haptic()
      if (e.idx - fromIdx > 1) stopSpeaking()
    }

    // Voice countdown: if the phase is shorter than the countdown, it simply starts at the phase length.
    const remainingSec = Math.ceil((step.seconds * 1000 - elapsed) / 1000)
    const from = timer.phases[step.kind].speakFrom
    if (from > 0 && remainingSec >= 1 && remainingSec <= from && remainingSec !== e.lastSpoken) {
      e.lastSpoken = remainingSec
      speakNumber(remainingSec)
    }

    // Clock tick on every new second (not at the instant a phase starts — the transition sound covers that).
    if (remainingSec !== e.lastTick) {
      if (!transitioned && remainingSec >= 1 && remainingSec < step.seconds) playSound(timer.tickSound)
      e.lastTick = remainingSec
    }

    force((n) => n + 1)
  }, [steps, timer])

  useEffect(() => {
    void KeepAwake.keepAwake().catch(() => {})
    playSound(timer.transitionSound)
    eng.current.startedAt = performance.now()
    tick()
    const id = setInterval(tick, 50)
    return () => {
      clearInterval(id)
      stopSpeaking()
      void KeepAwake.allowSleep().catch(() => {})
    }
  }, [tick, steps, timer])

  const pause = () => {
    const e = eng.current
    if (!e.running) return
    e.carried += performance.now() - e.startedAt
    e.running = false
    stopSpeaking()
    force((n) => n + 1)
  }

  const resume = () => {
    const e = eng.current
    if (e.running || e.done) return
    e.startedAt = performance.now()
    e.running = true
    force((n) => n + 1)
  }

  const goTo = (i: number) => {
    const e = eng.current
    if (i < 0 || i >= steps.length) return
    stopSpeaking()
    e.idx = i
    e.carried = 0
    e.startedAt = performance.now()
    e.lastSpoken = -1
    e.lastTick = -1
    e.done = false
    if (e.running) playSound(timer.transitionSound)
    haptic()
    tick()
    force((n) => n + 1)
  }

  const openConfirm = (kind: 'exit' | 'reset') => {
    wasRunning.current = eng.current.running
    pause()
    setConfirm(kind)
  }

  const restart = () => {
    eng.current.running = true
    goTo(0)
    void KeepAwake.keepAwake().catch(() => {})
  }

  // ---- derived display values ----
  const e = eng.current
  const step = steps[e.idx]
  const elapsed = e.done ? step.seconds * 1000 : Math.min(elapsedNow(), step.seconds * 1000)
  const remainingMs = step.seconds * 1000 - elapsed
  const progress = step.seconds > 0 ? elapsed / (step.seconds * 1000) : 1
  const next = steps[e.idx + 1]
  const totalMs = steps.reduce((s, x) => s + x.seconds * 1000, 0)
  const doneMs = steps.slice(0, e.idx).reduce((s, x) => s + x.seconds * 1000, 0) + elapsed
  const totalRemaining = (totalMs - doneMs) / 1000

  const R = 140
  const C = 2 * Math.PI * R

  if (e.done) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-zinc-950 px-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center text-white">
        <div className="text-6xl">🏁</div>
        <h1 className="text-4xl font-bold">Workout complete</h1>
        <p className="text-zinc-400">
          {timer.name} · {formatTime(totalMs / 1000)}
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
          <button onClick={restart} className="rounded-2xl bg-white py-4 text-lg font-semibold text-zinc-900 active:bg-zinc-200">
            Do it again
          </button>
          <button onClick={onExit} className="rounded-2xl bg-zinc-800 py-4 text-lg font-semibold active:bg-zinc-700">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative flex h-full flex-col text-white transition-colors duration-500 ${PHASE_BG[step.kind]} pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]`}
    >
      {/* overall progress */}
      <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-black/20">
        <div className="h-full rounded-full bg-white/90" style={{ width: `${(doneMs / totalMs) * 100}%` }} />
      </div>

      <header className="flex items-center justify-between px-4 pt-3">
        <div className="flex gap-2">
          <button
            onClick={() => openConfirm('exit')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 active:bg-black/30"
            aria-label="End workout"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
              <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
          <button
            onClick={() => openConfirm('reset')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 active:bg-black/30"
            aria-label="Restart workout"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 10a6.5 6.5 0 1 0 2-4.7" />
              <path d="M3.5 3v3.5H7" />
            </svg>
          </button>
        </div>
        <div className="truncate px-3 text-center text-sm font-semibold text-white/80">{timer.name}</div>
        <div className="text-right text-sm tabular-nums text-white/80">
          <div className="text-[10px] uppercase tracking-wider text-white/60">Left</div>
          {formatTime(Math.ceil(totalRemaining))}
        </div>
      </header>

      <div className="flex justify-center gap-3 px-4 pt-4">
        <Stat label="Round" value={`${step.round}/${timer.rounds}`} />
        <Stat label="Set" value={`${step.set}/${timer.sets}`} />
      </div>

      {/* main ring */}
      <div className="flex flex-1 items-center justify-center">
        <div className="relative aspect-square w-[min(80vw,46vh)]">
          <svg viewBox="0 0 320 320" className="h-full w-full -rotate-90">
            <circle cx="160" cy="160" r={R} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="18" />
            <circle
              cx="160"
              cy="160"
              r={R}
              fill="none"
              stroke="white"
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * progress}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold uppercase tracking-widest">{PHASE_SHORT[step.kind]}</div>
            <div className="text-[clamp(4rem,22vw,7rem)] font-bold leading-none tabular-nums">{formatTime(Math.ceil(remainingMs / 1000))}</div>
            {!e.running && <div className="mt-2 text-sm font-semibold uppercase tracking-widest text-white/80">Paused</div>}
          </div>
        </div>
      </div>

      <div className="mx-4 mb-5 rounded-2xl bg-black/20 px-4 py-3 text-center">
        {next ? (
          <span className="text-white/90">
            Next: <span className="font-semibold">{PHASE_SHORT[next.kind]}</span> · {formatTime(next.seconds)}
          </span>
        ) : (
          <span className="text-white/90">Last one — finish strong!</span>
        )}
      </div>

      {/* controls */}
      <div className="flex items-center justify-center gap-8 px-4">
        <CtrlButton label="Previous" onClick={() => goTo(elapsed > 3000 || e.idx === 0 ? e.idx : e.idx - 1)}>
          <path d="M6 5a1 1 0 0 1 1 1v3.3l7.4-4.6A1 1 0 0 1 16 5.5v9a1 1 0 0 1-1.6.8L7 10.7V14a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Z" />
        </CtrlButton>
        <button
          onClick={e.running ? pause : resume}
          aria-label={e.running ? 'Pause' : 'Resume'}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg active:scale-95"
        >
          {e.running ? (
            <svg viewBox="0 0 20 20" className="h-10 w-10" fill="currentColor">
              <path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="ml-1 h-10 w-10" fill="currentColor">
              <path d="M6 4.2a1 1 0 0 1 1.5-.9l9 5.8a1 1 0 0 1 0 1.7l-9 5.8A1 1 0 0 1 6 15.8V4.2Z" />
            </svg>
          )}
        </button>
        <CtrlButton label="Next" onClick={() => goTo(e.idx + 1)} disabled={!next}>
          <path d="M14 5a1 1 0 0 0-1 1v3.3L5.6 4.7A1 1 0 0 0 4 5.5v9a1 1 0 0 0 1.6.8l7.4-4.6V14a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" />
        </CtrlButton>
      </div>

      {confirm && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/60 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="w-full space-y-3">
            {confirm === 'exit' ? (
              <button
                onClick={onExit}
                className="w-full rounded-2xl bg-zinc-900 py-4 text-lg font-semibold text-rose-400 active:bg-zinc-800"
              >
                End Workout
              </button>
            ) : (
              <button
                onClick={() => {
                  setConfirm(null)
                  restart()
                }}
                className="w-full rounded-2xl bg-zinc-900 py-4 text-lg font-semibold text-orange-400 active:bg-zinc-800"
              >
                Restart from Beginning
              </button>
            )}
            <button
              onClick={() => {
                setConfirm(null)
                if (wasRunning.current) resume()
              }}
              className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-zinc-900 active:bg-zinc-200"
            >
              Keep Going
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-2xl bg-black/20 px-4 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function CtrlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-16 w-16 items-center justify-center rounded-full bg-black/20 active:bg-black/30 disabled:opacity-30"
    >
      <svg viewBox="0 0 20 20" className="h-7 w-7" fill="currentColor">
        {children}
      </svg>
    </button>
  )
}
