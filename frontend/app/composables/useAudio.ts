export function useAudio() {
  let ctx: AudioContext | null = null

  function getContext() {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    return ctx
  }

  // Programmatic crisp click pop sound using Web Audio API
  function playPop() {
    try {
      const audioCtx = getContext()
      if (!audioCtx) return

      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()

      osc.connect(gain)
      gain.connect(audioCtx.destination)

      osc.type = 'sine'
      // Frequency slide for a bouncy pop
      osc.frequency.setValueAtTime(500, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1)

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1)

      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.1)
    } catch {
      // Ignore audio failure under strict block policies
    }
  }

  // Programmatic message swoop sound using filtered sine wave
  function playSwoosh() {
    try {
      const audioCtx = getContext()
      if (!audioCtx) return

      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()

      osc.connect(gain)
      gain.connect(audioCtx.destination)

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(150, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.2)

      gain.gain.setValueAtTime(0.001, audioCtx.currentTime)
      gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2)

      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.2)
    } catch {
      // Ignore audio failure
    }
  }

  return { playPop, playSwoosh }
}
