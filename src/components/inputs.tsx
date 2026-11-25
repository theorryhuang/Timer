import { useEffect, useState } from 'react'

const boxClass =
  'h-12 rounded-xl bg-zinc-800 text-center text-xl font-semibold tabular-nums text-white outline-none ring-orange-500 focus:ring-2'

/** Whole-number field typed with the numeric keypad. Commits on blur. */
export function NumberField({
  value,
  onChange,
  min = 0,
  max = 999,
  className = 'w-20',
  ariaLabel,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  className?: string
  ariaLabel?: string
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const commit = () => {
    const n = parseInt(text, 10)
    const clamped = Number.isNaN(n) ? min : Math.min(max, Math.max(min, n))
    setText(String(clamped))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <input
      aria-label={ariaLabel}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      enterKeyHint="done"
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={`${boxClass} ${className}`}
    />
  )
}

/** Duration typed as separate minutes and seconds boxes. */
export function DurationField({
  seconds,
  onChange,
  label,
}: {
  seconds: number
  onChange: (s: number) => void
  label: string
}) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center">
        <NumberField ariaLabel={`${label} minutes`} value={m} max={599} onChange={(v) => onChange(v * 60 + s)} className="w-16" />
        <span className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">min</span>
      </div>
      <span className="-mt-5 text-2xl font-bold text-zinc-500">:</span>
      <div className="flex flex-col items-center">
        <SecondsBox label={label} minutes={m} seconds={s} onChange={onChange} />
        <span className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">sec</span>
      </div>
    </div>
  )
}

/** Seconds box: typing more than 59 rolls over into minutes (e.g. 90 → 1:30). */
function SecondsBox({
  label,
  minutes,
  seconds,
  onChange,
}: {
  label: string
  minutes: number
  seconds: number
  onChange: (s: number) => void
}) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const [text, setText] = useState(pad(seconds))
  useEffect(() => setText(pad(seconds)), [seconds])

  const commit = () => {
    const n = parseInt(text, 10)
    const sec = Number.isNaN(n) ? 0 : n
    setText(pad(sec % 60))
    onChange(minutes * 60 + sec)
  }

  return (
    <input
      aria-label={`${label} seconds`}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      enterKeyHint="done"
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={`${boxClass} w-16`}
    />
  )
}
