export type SoundName =
  | 'start'
  | 'pitch'
  | 'swing'
  | 'hit'
  | 'perfect'
  | 'catch'
  | 'score'
  | 'call'

export class PixelAudio {
  private context: AudioContext | null = null
  private muted = false

  setMuted(muted: boolean) {
    this.muted = muted
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof AudioContext === 'undefined') return null
    this.context ??= new AudioContext()
    if (this.context.state === 'suspended') void this.context.resume()
    return this.context
  }

  private tone(
    context: AudioContext,
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    delay = 0,
    gainValue = 0.07,
  ) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime + delay
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(gainValue, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + duration)
  }

  private noise(context: AudioContext, duration: number, gainValue = 0.045) {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration))
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const values = buffer.getChannelData(0)
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.random() * 2 - 1
    }
    const source = context.createBufferSource()
    const gain = context.createGain()
    gain.gain.setValueAtTime(gainValue, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
    source.buffer = buffer
    source.connect(gain)
    gain.connect(context.destination)
    source.start()
  }

  play(sound: SoundName) {
    const context = this.getContext()
    if (!context) return

    if (sound === 'start') {
      this.tone(context, 196, 0.09, 'square')
      this.tone(context, 294, 0.09, 'square', 0.08)
      this.tone(context, 392, 0.18, 'square', 0.16)
    } else if (sound === 'pitch') {
      this.tone(context, 180, 0.1, 'sawtooth', 0, 0.035)
    } else if (sound === 'swing') {
      this.noise(context, 0.08, 0.025)
      this.tone(context, 95, 0.08, 'sawtooth', 0, 0.025)
    } else if (sound === 'hit') {
      this.noise(context, 0.05, 0.08)
      this.tone(context, 155, 0.11, 'square', 0, 0.09)
    } else if (sound === 'perfect') {
      this.noise(context, 0.07, 0.1)
      this.tone(context, 130, 0.12, 'square', 0, 0.1)
      this.tone(context, 520, 0.18, 'square', 0.04, 0.05)
    } else if (sound === 'catch') {
      this.noise(context, 0.045, 0.055)
      this.tone(context, 80, 0.07, 'triangle', 0, 0.04)
    } else if (sound === 'score') {
      this.tone(context, 330, 0.1, 'square')
      this.tone(context, 440, 0.1, 'square', 0.09)
      this.tone(context, 660, 0.22, 'square', 0.18)
    } else {
      this.tone(context, 120, 0.08, 'square', 0, 0.04)
      this.tone(context, 95, 0.12, 'square', 0.07, 0.04)
    }
  }

  dispose() {
    if (this.context) void this.context.close()
    this.context = null
  }
}
