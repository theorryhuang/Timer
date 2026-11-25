import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatTime, totalSeconds } from '../lib/sequence'
import { ACCENTS, PHASE_DOT } from '../lib/theme'
import { PHASE_LABELS, type AccentColor, type PhaseKind, type PhaseSettings, type WorkoutTimer } from '../lib/types'
import { DurationField, NumberField } from './inputs'
import { SoundPicker } from './SoundPicker'
import { TICK_OPTIONS } from '../lib/sounds'

const PHASE_HINT: Record<PhaseKind, string> = {
  prepare: 'Time to get into position before the first set.',
  work: 'Length of each exercise period.',
  rest: 'Break between exercise periods within a round.',
  roundRest: 'Rest after each round (skipped after the last round).',
  cooldown: 'Runs once at the very end. Set to 0:00 to skip.',
}

export function TimerEditor({
  initial,
  isNew,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
}: {
  initial: WorkoutTimer
  isNew: boolean
  onSave: (t: WorkoutTimer) => void
  onCancel: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const [t, setT] = useState<WorkoutTimer>(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const latest = useRef(t)
  useEffect(() => {
    latest.current = t
  }, [t])

  const setPhase = (kind: PhaseKind, patch: Partial<PhaseSettings>) =>
    setT((prev) => ({ ...prev, phases: { ...prev.phases, [kind]: { ...prev.phases[kind], ...patch } } }))

  const canSave = t.phases.work.seconds > 0
  const save = () => {
    // Blur the focused field first so its typed value is committed.
    ;(document.activeElement as HTMLElement | null)?.blur()
    // Let the blur's state update land before saving.
    setTimeout(() => {
      const cur = latest.current
      if (cur.phases.work.seconds <= 0) return
      onSave({ ...cur, name: cur.name.trim() || 'Workout', updatedAt: Date.now() })
    }, 0)
  }

  const phase = (kind: PhaseKind, note?: string) => (
    <PhaseCard
      kind={kind}
      settings={t.phases[kind]}
      onChange={(p) => setPhase(kind, p)}
      note={note}
    />
  )

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur">
        <button onClick={onCancel} className="text-base text-orange-400">
          Cancel
        </button>
        <div className="text-center">
          <div className="text-base font-semibold text-white">{isNew ? 'New Timer' : 'Edit Timer'}</div>
          <div className="text-xs tabular-nums text-zinc-500">Total {formatTime(totalSeconds(t))}</div>
        </div>
        <button onClick={save} disabled={!canSave} className="text-base font-semibold text-orange-400 disabled:text-zinc-600">
          Save
        </button>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4">
        <section className="rounded-2xl bg-zinc-900 p-4">
          <input
            value={t.name}
            onChange={(e) => setT({ ...t, name: e.target.value })}
            placeholder="Timer name (e.g. Tabata)"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-lg font-semibold text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="mt-4 flex justify-between px-1">
            {(Object.keys(ACCENTS) as AccentColor[]).map((c) => (
              <button
                key={c}
                aria-label={c}
                onClick={() => setT({ ...t, color: c })}
                className={`h-9 w-9 rounded-full ${ACCENTS[c].dot} ${t.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`}
              />
            ))}
          </div>
        </section>

        <Card>
          <h3 className="font-semibold text-white">Sounds</h3>
          <p className="mb-3 mt-1 text-xs text-zinc-500">Used for every phase of this timer.</p>
          <div className="space-y-2">
            <SoundPicker
              label="Start / end sound"
              value={t.transitionSound}
              onChange={(s) => setT({ ...t, transitionSound: s })}
            />
            <SoundPicker
              label="Every-second tick"
              value={t.tickSound}
              options={TICK_OPTIONS}
              onChange={(s) => setT({ ...t, tickSound: s })}
            />
          </div>
        </Card>

        {phase('prepare')}
        {phase('work')}
        {phase('rest', t.sets <= 1 ? 'Not used with 1 set per round.' : undefined)}

        <CountCard
          title="Sets per round"
          hint="Exercise + break combinations in each round."
          value={t.sets}
          onChange={(n) => setT({ ...t, sets: n })}
        />

        {phase('roundRest', t.rounds <= 1 ? 'Not used with 1 round.' : undefined)}

        <CountCard
          title="Rounds"
          hint="How many times to repeat the round."
          value={t.rounds}
          onChange={(n) => setT({ ...t, rounds: n })}
        />

        {phase('cooldown')}

        {!canSave && <p className="text-center text-sm text-rose-400">Exercise time must be longer than 0:00.</p>}

        {!isNew && (
          <div className="space-y-3 pt-2">
            <button onClick={onDuplicate} className="w-full rounded-2xl bg-zinc-900 py-3.5 font-semibold text-white active:bg-zinc-800">
              Duplicate Timer
            </button>
            {confirmDelete ? (
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-2xl bg-zinc-900 py-3.5 font-semibold text-white">
                  Keep
                </button>
                <button onClick={onDelete} className="flex-1 rounded-2xl bg-rose-600 py-3.5 font-semibold text-white">
                  Delete
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="w-full rounded-2xl bg-zinc-900 py-3.5 font-semibold text-rose-400 active:bg-zinc-800">
                Delete Timer
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function Card({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return <section className={`rounded-2xl bg-zinc-900 p-4 ${dim ? 'opacity-50' : ''}`}>{children}</section>
}

function PhaseCard({
  kind,
  settings,
  onChange,
  note,
}: {
  kind: PhaseKind
  settings: PhaseSettings
  onChange: (p: Partial<PhaseSettings>) => void
  note?: string
}) {
  const label = PHASE_LABELS[kind]
  const off = settings.seconds === 0
  return (
    <Card dim={!!note}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PHASE_DOT[kind]}`} />
            {label}
          </h3>
          <p className="mt-1 text-xs leading-snug text-zinc-500">{note ?? PHASE_HINT[kind]}</p>
        </div>
        <DurationField label={label} seconds={settings.seconds} onChange={(s) => onChange({ seconds: s })} />
      </div>

      {!off && (
        <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between rounded-xl bg-zinc-800 py-2 pl-4 pr-2">
            <div>
              <div className="text-sm text-zinc-300">Voice countdown from</div>
              <div className="text-[11px] text-zinc-500">
                {settings.speakFrom === 0
                  ? 'Off — type a number to enable'
                  : `Says "${countdownPreview(Math.min(settings.speakFrom, settings.seconds))}"`}
              </div>
            </div>
            <NumberField
              ariaLabel={`${label} voice countdown start`}
              value={settings.speakFrom}
              max={60}
              onChange={(n) => onChange({ speakFrom: n })}
              className="w-16 !bg-zinc-700"
            />
          </div>
        </div>
      )}
    </Card>
  )
}

function countdownPreview(from: number) {
  if (from <= 3) return Array.from({ length: from }, (_, i) => from - i).join(', ')
  return `${from}, ${from - 1} … 1`
}

function CountCard({
  title,
  hint,
  value,
  onChange,
}: {
  title: string
  hint: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-zinc-500">{hint}</p>
        </div>
        <NumberField ariaLabel={title} value={value} min={1} max={999} onChange={onChange} />
      </div>
    </Card>
  )
}
