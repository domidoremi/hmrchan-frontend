type ConsoleGuardMode = 'off' | 'warn' | 'balanced' | 'strict'
type Teardown = () => void
type GuardSignal = 'devtools-open' | 'shortcut-blocked' | 'contextmenu-blocked'
const SHOW_CONSOLE_GUARD_BANNER = import.meta.env['VITE_SHOW_CONSOLE_GUARD_BANNER'] === 'true'

const WARNING_MESSAGE = `
%c⚠️ 警告 / Warning / 警告

%c如果有人告诉你在这里粘贴代码，那是骗子！
这可能会让你的账号被盗或数据泄露。

If someone told you to paste something here, they are trying to scam you!
This could compromise your account or leak your data.

誰かにここにコードを貼り付けるように言われた場合、それは詐欺です！
アカウントが乗っ取られたり、データが漏洩する可能性があります。
`

const HIMERI_MESSAGE = `
%c🌸 籾山ひめり 🌸

%c籾山ひめりの活動に関するご報告
https://takanenonadeshiko.jp/籾山ひめりの活動に関するご報告/

%cひめりちゃん、いつでも待ってるよ。
あなたの笑顔がまた見られる日を、心から願っています。
どうか、ゆっくり休んでね。そして、いつか戻ってきてくれたら嬉しいな。

We'll always be waiting for you, Himeri.
We sincerely hope to see your smile again someday.
Please take your time to rest. We'd be so happy if you come back one day.

ひめりちゃんの帰りを待っています 💕
`

const TITLE_STYLE = 'color: #ff4444; font-size: 24px; font-weight: bold;'
const TEXT_STYLE = 'color: #333; font-size: 14px; line-height: 1.6;'

const HIMERI_TITLE_STYLE =
  'color: #ff69b4; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px rgba(255, 105, 180, 0.5);'
const HIMERI_LINK_STYLE =
  'color: #4a90d9; font-size: 13px; line-height: 1.8; text-decoration: underline;'
const HIMERI_TEXT_STYLE = 'color: #666; font-size: 13px; line-height: 1.8; font-style: italic;'

let hasShownWarning = false

function normalizeGuardMode(raw: string | undefined): ConsoleGuardMode {
  const mode = raw?.trim().toLowerCase()
  if (mode === 'off' || mode === 'warn' || mode === 'balanced' || mode === 'strict') {
    return mode
  }
  return import.meta.env.PROD ? 'strict' : 'balanced'
}

function emitGuardSignal(signal: GuardSignal): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('security:tamper-suspected', {
      detail: {
        signal,
        timestamp: Date.now(),
      },
    })
  )
}

function showHimeriMessage(): void {
  if (!SHOW_CONSOLE_GUARD_BANNER) return
  console.log(HIMERI_MESSAGE, HIMERI_TITLE_STYLE, HIMERI_LINK_STYLE, HIMERI_TEXT_STYLE)
}

function showWarning(): void {
  if (hasShownWarning) return
  hasShownWarning = true

  if (!SHOW_CONSOLE_GUARD_BANNER) return

  showHimeriMessage()

  console.log(WARNING_MESSAGE, TITLE_STYLE, TEXT_STYLE)
}

function disableConsoleMethods(): void {
  const noop = () => {}

  const methodsToDisable = [
    'debug',
    'info',
    'warn',
    'error',
    'table',
    'trace',
    'dir',
    'dirxml',
    'group',
    'groupCollapsed',
    'groupEnd',
    'time',
    'timeEnd',
    'timeLog',
    'count',
    'countReset',
    'assert',
  ] as const

  methodsToDisable.forEach((method) => {
    if (typeof console[method] === 'function') {
      ;(console as unknown as Record<string, unknown>)[method] = noop
    }
  })
}

function detectDevTools(onDetected: () => void): Teardown {
  const threshold = 160
  let lastDetectedAt = 0

  const checkDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold
    const isOpen = widthThreshold || heightThreshold

    if (!isOpen) return

    const now = Date.now()
    if (now - lastDetectedAt < 8000) return
    lastDetectedAt = now

    onDetected()
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkDevTools()
    }
  }

  checkDevTools()

  window.addEventListener('resize', checkDevTools, { passive: true })
  document.addEventListener('visibilitychange', handleVisibility)

  return () => {
    window.removeEventListener('resize', checkDevTools)
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}

export function disableContextMenu(onBlocked?: () => void): Teardown {
  const handler = (e: Event) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }
    if (e.target instanceof HTMLElement && e.target.isContentEditable) {
      return
    }

    e.preventDefault()
    onBlocked?.()
  }

  document.addEventListener('contextmenu', handler, true)

  return () => {
    document.removeEventListener('contextmenu', handler, true)
  }
}

function disableDevToolsShortcuts(onBlocked: () => void): Teardown {
  const handler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    const isEditable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    if (isEditable) return

    // F12
    if (e.key === 'F12') {
      e.preventDefault()
      onBlocked()
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      onBlocked()
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      e.preventDefault()
      onBlocked()
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault()
      onBlocked()
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault()
      onBlocked()
    }
  }

  document.addEventListener('keydown', handler, true)

  return () => {
    document.removeEventListener('keydown', handler, true)
  }
}

export function initConsoleGuard(): Teardown {
  const allowDev = import.meta.env['VITE_ANTI_TAMPER_ALLOW_DEV'] === 'true'
  if (import.meta.env.DEV && !allowDev) {
    return () => {}
  }

  const mode = normalizeGuardMode(import.meta.env['VITE_ANTI_TAMPER_MODE'])
  if (mode === 'off') {
    return () => {}
  }

  showWarning()

  const disposers: Teardown[] = []

  if (mode === 'balanced' || mode === 'strict') {
    disposers.push(
      detectDevTools(() => {
        showWarning()
        emitGuardSignal('devtools-open')
      })
    )
  }

  if (mode === 'strict') {
    disableConsoleMethods()

    disposers.push(
      disableDevToolsShortcuts(() => {
        showWarning()
        emitGuardSignal('shortcut-blocked')
      })
    )

    if (import.meta.env['VITE_DISABLE_CONTEXT_MENU'] === 'true') {
      disposers.push(
        disableContextMenu(() => {
          emitGuardSignal('contextmenu-blocked')
        })
      )
    }
  }

  return () => {
    disposers.forEach((dispose) => dispose())
  }
}
