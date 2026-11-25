import { useState } from 'react'
import { SOUND_OPTIONS, playSound, unlockAudio, type SoundId } from '../lib/sounds'

/** Button that opens a bottom sheet of sounds. Tapping a sound selects and previews it. */
export function SoundPicker({
  label,
  value,
  onChange,
  options = SOUND_OPTIONS,
}: {
  label: string
  value: SoundId
  onChange: (s: SoundId) => void
  options?: { id: SoundId; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.id === value)?.label ?? 'None'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl bg-zinc-800 px-4 py-3 text-left active:bg-zinc-700"
      >
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="flex items-center gap-1 text-sm font-medium text-white">
          {current}
          <svg viewBox="0 0 20 20" className="h-4 w-4 text-zinc-500" fill="currentColor">
            <path d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4Z" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="max-h-[75vh] w-full overflow-y-auto rounded-t-3xl bg-zinc-900 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-5 py-4">
              <h3 className="text-base font-semibold text-white">{label}</h3>
              <button onClick={() => setOpen(false)} className="text-base font-semibold text-orange-400">
                Done
              </button>
            </div>
            <p className="px-5 pt-3 text-xs text-zinc-500">Tap a sound to hear it.</p>
            <ul className="px-3 py-2">
              {options.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      unlockAudio()
                      playSound(o.id)
                      onChange(o.id)
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-white active:bg-zinc-800"
                  >
                    <span>{o.label}</span>
                    {o.id === value && (
                      <svg viewBox="0 0 20 20" className="h-5 w-5 text-orange-400" fill="currentColor">
                        <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
