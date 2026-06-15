declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready(): void
        expand(): void
        close(): void
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name?: string
            last_name?: string
            username?: string
            language_code?: string
          }
          auth_date?: number
          hash?: string
        }
        colorScheme: 'light' | 'dark'
        themeParams: Record<string, string>
        MainButton: {
          text: string
          isVisible: boolean
          isActive: boolean
          show(): void
          hide(): void
          enable(): void
          disable(): void
          onClick(fn: () => void): void
          offClick(fn: () => void): void
          showProgress(leaveActive?: boolean): void
          hideProgress(): void
        }
        BackButton: {
          isVisible: boolean
          show(): void
          hide(): void
          onClick(fn: () => void): void
          offClick(fn: () => void): void
        }
        HapticFeedback: {
          impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
          notificationOccurred(type: 'error' | 'success' | 'warning'): void
          selectionChanged(): void
        }
        openLink(url: string): void
      }
    }
  }
}

export function useTma() {
  const isTma = computed(() => typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData)

  const webApp = computed(() =>
    typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined,
  )

  function init() {
    webApp.value?.ready()
    webApp.value?.expand()
    applyTheme()
  }

  function applyTheme() {
    const tg = webApp.value
    if (!tg) return
    const root = document.documentElement
    const p = tg.themeParams ?? {}
    if (p.bg_color) root.style.setProperty('--tg-theme-bg-color', p.bg_color)
    if (p.text_color) root.style.setProperty('--tg-theme-text-color', p.text_color)
    if (p.hint_color) root.style.setProperty('--tg-theme-hint-color', p.hint_color)
    if (p.link_color) root.style.setProperty('--tg-theme-link-color', p.link_color)
    if (p.button_color) root.style.setProperty('--tg-theme-button-color', p.button_color)
    if (p.button_text_color)
      root.style.setProperty('--tg-theme-button-text-color', p.button_text_color)
    if (p.secondary_bg_color)
      root.style.setProperty('--tg-theme-secondary-bg-color', p.secondary_bg_color)
  }

  function getInitData(): string {
    return webApp.value?.initData ?? ''
  }

  function showMainButton(text: string, onClick: () => void) {
    const btn = webApp.value?.MainButton
    if (!btn) return
    btn.text = text
    btn.show()
    btn.enable()
    btn.onClick(onClick)
  }

  function hideMainButton(onClick?: () => void) {
    const btn = webApp.value?.MainButton
    if (!btn) return
    if (onClick) btn.offClick(onClick)
    btn.hide()
  }

  function showBackButton(onClick: () => void) {
    const btn = webApp.value?.BackButton
    if (!btn) return
    btn.show()
    btn.onClick(onClick)
  }

  function hideBackButton(onClick?: () => void) {
    const btn = webApp.value?.BackButton
    if (!btn) return
    if (onClick) btn.offClick(onClick)
    btn.hide()
  }

  function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
    webApp.value?.HapticFeedback?.impactOccurred(style)
  }

  function hapticSuccess() {
    webApp.value?.HapticFeedback?.notificationOccurred('success')
  }

  function hapticError() {
    webApp.value?.HapticFeedback?.notificationOccurred('error')
  }

  function close() {
    webApp.value?.close()
  }

  function openLink(url: string) {
    webApp.value?.openLink(url)
  }

  return {
    isTma,
    webApp,
    init,
    getInitData,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    hapticImpact,
    hapticSuccess,
    hapticError,
    close,
    openLink,
  }
}
