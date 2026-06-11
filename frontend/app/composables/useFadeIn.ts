export function useFadeIn() {
  let obs: IntersectionObserver | null = null

  onMounted(() => {
    obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            obs?.unobserve(e.target)
          }
        })
      },
      { threshold: 0.06, rootMargin: '0px 0px -32px 0px' },
    )

    requestAnimationFrame(() => {
      // Stagger per-section so each section starts fresh at delay 0
      const sectionCounters = new Map<Element | null, number>()

      document.querySelectorAll('.fade').forEach((el) => {
        const section = el.closest('section') ?? el.parentElement ?? null
        const idx = sectionCounters.get(section) ?? 0
        ;(el as HTMLElement).style.transitionDelay = `${idx * 0.09}s`
        sectionCounters.set(section, idx + 1)
        obs!.observe(el)
      })
    })
  })

  onUnmounted(() => obs?.disconnect())
}
