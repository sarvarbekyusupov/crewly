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
      { threshold: 0, rootMargin: '0px 0px 100px 0px' },
    )

    requestAnimationFrame(() => {
      document.querySelectorAll('.fade').forEach((el, i) => {
        ;(el as HTMLElement).style.transitionDelay = `${(i % 4) * 0.07}s`
        obs!.observe(el)
      })
    })
  })

  onUnmounted(() => obs?.disconnect())
}
