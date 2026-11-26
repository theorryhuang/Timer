import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { playClip, stopClip } from './voice'

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
]

const native = Capacitor.isNativePlatform()

export function speak(text: string) {
  if (native) {
    // QUEUE_FLUSH (0): a new number interrupts anything still being said.
    void TextToSpeech.speak({ text, lang: 'en-US', rate: 1.1, category: 'playback', queueStrategy: 0 }).catch(() => {})
    return
  }
  // Web: never use Safari's speech voice. It takes over iOS audio, pausing the user's
  // music, and music started afterwards cuts the timer off. The recorded clips cover it.
}

/** Recorded clip if loaded (exact timing); live text-to-speech only as a fallback. */
export function speakNumber(n: number) {
  if (playClip(String(n))) return
  speak(n < WORDS.length ? WORDS[n] : String(n))
}

export function speakComplete() {
  if (playClip('complete')) return
  speak('Workout complete')
}

export function stopSpeaking() {
  stopClip()
  if (native) void TextToSpeech.stop().catch(() => {})
}
