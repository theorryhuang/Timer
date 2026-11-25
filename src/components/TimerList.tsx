import { formatTime, totalSeconds } from '../lib/sequence'
import { ACCENTS } from '../lib/theme'
import type { WorkoutTimer } from '../lib/types'

export function TimerList({
  timers,
  onNew,
  onEdit,
  onStart,
}: {
  timers: WorkoutTimer[]
  onNew: () => void
  onEdit: (t: WorkoutTimer) => void
  onStart: (t: WorkoutTimer) => void
}) {
  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <header className="flex items-end justify-between px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <h1 className="text-4xl font-bold tracking-tight text-white">Timers</h1>
        <button
          onClick={onNew}
          aria-label="New timer"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 active:bg-orange-600"
        >
          <svg viewBox="0 0 20 20" className="h-6 w-6" fill="currentColor">
            <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
          </svg>
        </button>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {timers.length === 0 && (
          <div className="mt-24 flex flex-col items-center text-center">
            <div className="text-5xl">⏱️</div>
            <h2 className="mt-4 text-xl font-semibold text-white">No timers yet</h2>
            <p className="mt-2 max-w-xs text-sm text-zinc-400">
              Create a timer for each activity — HIIT, Tabata, stretching, anything.
            </p>
            <button onClick={onNew} className="mt-6 rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white active:bg-orange-600">
              Create a timer
            </button>
          </div>
        )}

        {timers.map((t) => (
          <div key={t.id} className="flex items-stretch overflow-hidden rounded-2xl bg-zinc-900">
            <div className={`w-1.5 shrink-0 ${ACCENTS[t.color].bar}`} />
            <button onClick={() => onEdit(t)} className="min-w-0 flex-1 px-4 py-4 text-left active:bg-zinc-800">
              <div className="truncate text-lg font-semibold text-white">{t.name}</div>
              <div className="mt-1 text-sm text-zinc-400">
                {t.sets} × {formatTime(t.phases.work.seconds)} work
                {t.sets > 1 && t.phases.rest.seconds > 0 && <> / {formatTime(t.phases.rest.seconds)} break</>}
              </div>
              <div className="mt-0.5 text-sm text-zinc-500">
                {t.rounds} {t.rounds === 1 ? 'round' : 'rounds'} · <span className="tabular-nums">{formatTime(totalSeconds(t))}</span> total
              </div>
            </button>
            <div className="flex items-center pr-4">
              <button
                onClick={() => onStart(t)}
                aria-label={`Start ${t.name}`}
                className={`flex h-14 w-14 items-center justify-center rounded-full ${ACCENTS[t.color].dot} text-white active:scale-95`}
              >
                <svg viewBox="0 0 20 20" className="ml-0.5 h-7 w-7" fill="currentColor">
                  <path d="M6 4.2a1 1 0 0 1 1.5-.9l9 5.8a1 1 0 0 1 0 1.7l-9 5.8A1 1 0 0 1 6 15.8V4.2Z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
