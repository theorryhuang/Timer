import { useEffect, useState } from 'react'
import { RunScreen } from './components/RunScreen'
import { TimerEditor } from './components/TimerEditor'
import { TimerList } from './components/TimerList'
import { startFreshAudio } from './lib/sounds'
import { unlockSpeech } from './lib/speech'
import { keepScreenOn } from './lib/wake'
import { prefetchVoice } from './lib/voice'
import { loadTimers, saveTimers } from './lib/storage'
import { newTimer, uid, type WorkoutTimer } from './lib/types'

type View =
  | { kind: 'list' }
  | { kind: 'edit'; timer: WorkoutTimer; isNew: boolean }
  | { kind: 'run'; timer: WorkoutTimer }

export default function App() {
  const [timers, setTimers] = useState<WorkoutTimer[] | null>(null)
  const [view, setView] = useState<View>({ kind: 'list' })

  useEffect(() => {
    void loadTimers().then(setTimers)
    prefetchVoice()
  }, [])

  const update = (next: WorkoutTimer[]) => {
    setTimers(next)
    void saveTimers(next)
  }

  if (!timers) return <div className="h-full bg-zinc-950" />

  if (view.kind === 'run') {
    return <RunScreen timer={view.timer} onExit={() => setView({ kind: 'list' })} />
  }

  if (view.kind === 'edit') {
    const { timer, isNew } = view
    return (
      <TimerEditor
        key={timer.id}
        initial={timer}
        isNew={isNew}
        onCancel={() => setView({ kind: 'list' })}
        onSave={(t) => {
          update(isNew ? [...timers, t] : timers.map((x) => (x.id === t.id ? t : x)))
          setView({ kind: 'list' })
        }}
        onDelete={() => {
          update(timers.filter((x) => x.id !== timer.id))
          setView({ kind: 'list' })
        }}
        onDuplicate={() => {
          const now = Date.now()
          const copy: WorkoutTimer = { ...timer, id: uid(), name: `${timer.name} copy`, createdAt: now, updatedAt: now }
          update([...timers, copy])
          setView({ kind: 'edit', timer: copy, isNew: false })
        }}
      />
    )
  }

  return (
    <TimerList
      timers={timers}
      onNew={() => setView({ kind: 'edit', timer: newTimer(), isNew: true })}
      onEdit={(t) => setView({ kind: 'edit', timer: t, isNew: false })}
      onDelete={(t) => update(timers.filter((x) => x.id !== t.id))}
      onStart={(t) => {
        // Must happen inside the tap so iOS allows sound and speech.
        keepScreenOn()
        startFreshAudio()
        unlockSpeech()
        setView({ kind: 'run', timer: t })
      }}
    />
  )
}
