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
            is_premium?: boolean
          }
          chat?: { id: number; type: string; title?: string }
          auth_date?: number
          hash?: string
          start_param?: string
        }
        version: string
        platform: string
        colorScheme: 'light' | 'dark'
        themeParams: Record<string, string>
        isExpanded: boolean
        viewportHeight: number
        viewportStableHeight: number
        isClosingConfirmationEnabled: boolean
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          isProgressVisible: boolean
          show(): void
          hide(): void
          enable(): void
          disable(): void
          showProgress(leaveActive?: boolean): void
          hideProgress(): void
          onClick(fn: () => void): void
          offClick(fn: () => void): void
          setText(text: string): void
          setParams(params: {
            text?: string
            color?: string
            text_color?: string
            is_active?: boolean
            is_visible?: boolean
          }): void
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
        CloudStorage: {
          setItem(key: string, value: string, callback?: (err: Error | null, stored: boolean) => void): void
          getItem(key: string, callback: (err: Error | null, value: string) => void): void
          getItems(keys: string[], callback: (err: Error | null, values: Record<string, string>) => void): void
          removeItem(key: string, callback?: (err: Error | null, removed: boolean) => void): void
          removeItems(keys: string[], callback?: (err: Error | null, removed: boolean) => void): void
          getKeys(callback: (err: Error | null, keys: string[]) => void): void
        }
        openLink(url: string, options?: { try_instant_view?: boolean }): void
        openTelegramLink(url: string): void
        openInvoice(url: string, callback?: (status: string) => void): void
        showPopup(params: {
          title?: string
          message: string
          buttons?: Array<{ id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text?: string }>
        }, callback?: (buttonId: string) => void): void
        showAlert(message: string, callback?: () => void): void
        showConfirm(message: string, callback?: (confirmed: boolean) => void): void
        enableClosingConfirmation(): void
        disableClosingConfirmation(): void
        sendData(data: string): void
        switchInlineQuery(query: string, choose_chat_types?: string[]): void
        isVersionAtLeast(version: string): boolean
        onEvent(eventType: string, callback: () => void): void
        offEvent(eventType: string, callback: () => void): void
        setHeaderColor(color: string): void
        setBackgroundColor(color: string): void
        requestWriteAccess(callback?: (granted: boolean) => void): void
        requestContact(callback?: (shared: boolean) => void): void
      }
    }
  }
}

export function waitForTelegramSdk(timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return }
    if (window.Telegram?.WebApp) { resolve(); return }
    const el = document.querySelector<HTMLScriptElement>(
      'script[src="https://telegram.org/js/telegram-web-app.js"]',
    )
    if (!el) { resolve(); return }
    const timer = setTimeout(resolve, timeoutMs)
    el.addEventListener('load', () => { clearTimeout(timer); resolve() }, { once: true })
    el.addEventListener('error', () => { clearTimeout(timer); resolve() }, { once: true })
  })
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
