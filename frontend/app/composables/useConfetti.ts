export function useConfetti() {
  function triggerConfetti() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const colors = ['#e05c2e', '#fb923c', '#fcd34d', '#4ade80', '#60a5fa']
    const container = document.createElement('div')

    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '100vw'
    container.style.height = '100vh'
    container.style.pointerEvents = 'none'
    container.style.zIndex = '9999'
    container.style.overflow = 'hidden'

    document.body.appendChild(container)

    // Spawn 60 confetti particles
    for (let i = 0; i < 60; i++) {
      const particle = document.createElement('div')
      const size = Math.random() * 8 + 6 // size 6px to 14px
      const color = colors[Math.floor(Math.random() * colors.length)] ?? '#e05c2e'

      particle.style.position = 'absolute'
      particle.style.width = `${size}px`
      particle.style.height = `${size}px`
      particle.style.background = color
      particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
      particle.style.opacity = '0.9'

      // Random starting positions (scattered across bottom/center)
      const startX = Math.random() * 40 + 30 // 30% to 70% width
      particle.style.left = `${startX}vw`
      particle.style.bottom = '0px'

      // Animation parameters
      const travelX = Math.random() * 40 - 20 // shift -20vw to +20vw
      const travelY = Math.random() * 60 + 50 // rise 50vh to 110vh
      const rotate = Math.random() * 720 - 360 // spin -360deg to +360deg

      const animName = `confetti-anim-${i}`
      const styleSheet = document.createElement('style')

      styleSheet.textContent = `
        @keyframes ${animName} {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
            opacity: 1;
          }
          40% {
            opacity: 0.9;
          }
          100% {
            transform: translate3d(${travelX}vw, -${travelY}vh, 0) rotate(${rotate}deg);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(styleSheet)

      particle.style.animation = `${animName} ${Math.random() * 1.5 + 1.2}s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`
      container.appendChild(particle)

      // Clean up stylesheets
      setTimeout(() => {
        styleSheet.remove()
      }, 3000)
    }

    // Clean up container
    setTimeout(() => {
      container.remove()
    }, 3000)
  }

  return { triggerConfetti }
}
