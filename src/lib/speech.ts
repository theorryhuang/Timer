import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { getMixWithMusic } from './sounds'
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
  // Safari's speech voice takes over iOS audio: it pauses other apps' music, and music
  // started afterwards cuts the timer off. Never use it when mixing with music; the
  // recorded clips cover the countdown, so this is only a rare fallback anyway.
  if (getMixWithMusic()) return
  if ('speechSynthesis' in window) {
    // Only cancel when something is playing: cancel() right before speak() can drop the new utterance in Safari.
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 1.1
    window.speechSynthesis.speak(u)
  }
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
  else if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    window.speechSynthesis.cancel()
  }
}
