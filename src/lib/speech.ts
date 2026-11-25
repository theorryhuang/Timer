import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

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
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 1.1
    window.speechSynthesis.speak(u)
  }
}

export function speakNumber(n: number) {
  speak(n < WORDS.length ? WORDS[n] : String(n))
}

export function stopSpeaking() {
  if (native) void TextToSpeech.stop().catch(() => {})
  else if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

/** Browsers only allow speech after a user gesture; call from a tap handler. */
export function unlockSpeech() {
  if (!native && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    window.speechSynthesis.speak(u)
  }
}
