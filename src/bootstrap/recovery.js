// This classic script runs independently of the application module graph.
;(() => {
  if (window.self !== window.top) return
  const edition = document.currentScript?.dataset.edition === 'archive' ? 'archive' : 'editorial'
  const messages = {
    en: {
      loading: ['Opening this page', 'Preparing your content. Please wait a moment.'],
      slow: [
        'This is taking a little longer',
        'You can keep waiting, or reload this page to try again.',
      ],
      error: [
        'This page could not finish loading',
        'The connection did not complete. Reload this page to continue.',
      ],
      offline: ['Waiting for your connection', 'Reconnect to the internet, then reload this page.'],
      retry: 'Reload page',
      about: 'About MomiChan',
      browse: 'Explore posts',
      authors: 'Authors',
      schedule: 'Schedule',
      editorial: [
        'Keep the moments\nthat matter.',
        'Photos, posts and upcoming encounters, ready to browse at your own pace.',
      ],
      archive: [
        'Every record,\na new connection.',
        'Find posts, discover authors and pick up where you left off.',
      ],
      navigation: 'Browse MomiChan',
    },
    'zh-CN': {
      loading: ['正在打开这一页', '正在准备内容，请稍候。'],
      slow: ['加载比平时久一些', '内容还在路上。可以再等一会儿，或重新加载。'],
      error: ['这一页暂时没有载入', '连接未能完成。重新加载后，可以继续浏览。'],
      offline: ['等待网络连接', '恢复网络后，点击重新加载继续浏览。'],
      retry: '重新加载',
      about: '关于 MomiChan',
      browse: '浏览动态',
      authors: '作者',
      schedule: '日程',
      editorial: ['把喜欢的日常，\n一页页收好。', '照片、动态与即将到来的相遇，在这里慢慢翻阅。'],
      archive: [
        '每一条记录，\n都有迹可循。',
        '查找动态、认识作者、追踪日程，接着上次的线索继续探索。',
      ],
      navigation: '浏览入口',
    },
    'zh-TW': {
      loading: ['正在開啟這一頁', '正在準備內容，請稍候。'],
      slow: ['載入比平時久一些', '內容還在路上。可以再等一會兒，或重新載入。'],
      error: ['這一頁暫時沒有載入', '連線未能完成。重新載入後，可以繼續瀏覽。'],
      offline: ['等待網路連線', '恢復網路後，點擊重新載入繼續瀏覽。'],
      retry: '重新載入',
      about: '關於 MomiChan',
      browse: '瀏覽動態',
      authors: '作者',
      schedule: '日程',
      editorial: ['把喜歡的日常，\n一頁頁收好。', '照片、動態與即將到來的相遇，在這裡慢慢翻閱。'],
      archive: [
        '每一筆記錄，\n都有跡可循。',
        '尋找動態、認識作者、追蹤日程，接著上次的線索繼續探索。',
      ],
      navigation: '瀏覽入口',
    },
    ja: {
      loading: ['ページを開いています', 'コンテンツを準備しています。少しお待ちください。'],
      slow: ['読み込みに時間がかかっています', 'このまま待つか、ページを再読み込みしてください。'],
      error: [
        'ページを読み込めませんでした',
        '接続が完了しませんでした。再読み込みして続けてください。',
      ],
      offline: ['接続を待っています', 'インターネットに接続してから、再読み込みしてください。'],
      retry: '再読み込み',
      about: 'MomiChan について',
      browse: '投稿を見る',
      authors: '投稿者',
      schedule: 'スケジュール',
      editorial: ['好きな日常を、\n一ページずつ。', '写真、投稿、これからの出会いを、ゆっくりと。'],
      archive: [
        '一つの記録から、\n次のつながりへ。',
        '投稿や投稿者、予定を探して、前回の続きから。',
      ],
      navigation: 'MomiChan を見る',
    },
  }
  let language = navigator.language || 'en'
  let color = edition === 'archive' ? 'dark' : 'light'
  let reduced = false
  try {
    const savedLocale = localStorage.getItem('locale')
    if (Object.hasOwn(messages, savedLocale)) language = savedLocale
    const saved = JSON.parse(localStorage.getItem('theme') || 'null')?.theme
    if (saved === 'light' || saved === 'dark') color = saved
    if (saved === 'auto')
      color = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    reduced =
      JSON.parse(localStorage.getItem('momichan-journal:presentation-motion') || 'null') ===
      'reduced'
  } catch {
    // Storage is optional; recovery must work even when it is unavailable.
  }
  const locale = Object.hasOwn(messages, language)
    ? language
    : /^zh-(TW|HK|Hant)/i.test(language)
      ? 'zh-TW'
      : /^zh/i.test(language)
        ? 'zh-CN'
        : /^ja/i.test(language)
          ? 'ja'
          : 'en'
  const copy = messages[locale]
  let root, panel, heading, description, button, observer
  let failed = false,
    slow = false,
    stopped = false,
    recoveryFocused = false
  document.documentElement.setAttribute('data-bootstrap-pending', '')

  function element(tag, className, text) {
    const node = document.createElement(tag)
    node.className = className
    if (text) node.textContent = text
    return node
  }
  function link(text, href, className = '') {
    const node = element('a', className, text)
    node.href = href
    return node
  }
  function onFocus(event) {
    recoveryFocused = !!panel?.contains(event.target)
  }
  function handoffFocus() {
    const focusObserver = new MutationObserver(transfer)
    const deadline = setTimeout(dispose, 10000)
    function dispose() {
      clearTimeout(deadline)
      focusObserver.disconnect()
      document.removeEventListener('pointerdown', dispose, true)
      document.removeEventListener('keydown', dispose, true)
      document.removeEventListener('focusin', dispose)
    }
    function transfer() {
      if (document.activeElement !== document.body) {
        dispose()
        return
      }
      const target = root?.querySelector('main, h1, [role="main"]')
      if (!(target instanceof HTMLElement)) return
      dispose()
      const original = target.getAttribute('tabindex')
      target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
      target.addEventListener(
        'blur',
        () => {
          if (original === null) target.removeAttribute('tabindex')
          else target.setAttribute('tabindex', original)
        },
        { once: true }
      )
    }
    // The shell itself is asynchronous. Wait for content, unless the user moves on.
    focusObserver.observe(root, { childList: true, subtree: true })
    document.addEventListener('pointerdown', dispose, true)
    document.addEventListener('keydown', dispose, true)
    document.addEventListener('focusin', dispose)
    transfer()
  }
  function finish() {
    if (stopped) return
    stopped = true
    clearTimeout(timer)
    observer?.disconnect()
    document.removeEventListener('readystatechange', start)
    document.removeEventListener('focusin', onFocus)
    window.removeEventListener('error', onError, true)
    window.removeEventListener('unhandledrejection', onRejection)
    window.removeEventListener('online', render)
    window.removeEventListener('offline', render)
    document.documentElement.removeAttribute('data-bootstrap-pending')
    root?.removeAttribute('data-bootstrap-recovery')
    if (recoveryFocused && document.activeElement === document.body) {
      handoffFocus()
    }
  }
  function ready() {
    if (root?.hasAttribute('data-v-app')) {
      finish()
      return true
    }
    return stopped
  }
  function makePanel() {
    panel = element('section', 'boot-recovery')
    panel.lang = locale
    panel.dataset.edition = edition
    panel.dataset.color = color
    panel.dataset.reduced = String(reduced)
    panel.setAttribute('aria-label', copy.navigation)
    const top = element('header', 'boot-recovery__top')
    top.append(
      link(edition === 'archive' ? 'm.' : 'MomiChan', '/', 'boot-recovery__brand'),
      element(
        'span',
        'boot-recovery__index',
        edition === 'archive' ? 'INDEX / COLLECTION' : 'THE JOURNAL'
      )
    )
    const main = element('div', 'boot-recovery__body')
    const intro = element('div', 'boot-recovery__intro')
    intro.append(
      element('small', '', edition === 'archive' ? 'MOMICHAN / ARCHIVE' : 'MOMICHAN / JOURNAL'),
      element('h1', '', copy[edition][0]),
      element('p', '', copy[edition][1])
    )
    const status = element('div', 'boot-recovery__status')
    status.append(
      element('small', '', edition === 'archive' ? 'WORKSPACE / STATUS' : 'OPENING / 01')
    )
    const live = element('div', 'boot-recovery__live')
    live.setAttribute('role', 'status')
    live.setAttribute('aria-live', 'polite')
    live.setAttribute('aria-atomic', 'true')
    heading = element('h2', '')
    description = element('p', '')
    live.append(heading, description)
    const actions = element('div', 'boot-recovery__actions')
    button = element('button', 'boot-recovery__retry', copy.retry)
    button.type = 'button'
    button.addEventListener('click', () => {
      button.disabled = true
      heading.textContent = copy.loading[0]
      description.textContent = copy.loading[1]
      window.location.reload()
    })
    actions.append(button, link(copy.about, '/about'))
    const progress = element('span', 'boot-recovery__progress')
    progress.setAttribute('aria-hidden', 'true')
    progress.append(element('i', ''))
    status.append(live, actions, progress)
    main.append(intro, status)
    const nav = element('nav', 'boot-recovery__nav')
    nav.setAttribute('aria-label', copy.navigation)
    nav.append(
      link(copy.browse, '/explore'),
      link(copy.authors, '/authors'),
      link(copy.schedule, '/schedule')
    )
    panel.append(top, main, nav)
    root.setAttribute('data-bootstrap-recovery', '')
    root.append(panel)
    document.addEventListener('focusin', onFocus)
  }
  function render() {
    if (ready() || !root) return
    const state =
      navigator.onLine === false ? 'offline' : failed ? 'error' : slow ? 'slow' : 'loading'
    if (!panel && state === 'loading') return
    if (!panel) makePanel()
    if (panel.dataset.state === state) return
    panel.dataset.state = state
    heading.textContent = copy[state][0]
    description.textContent = copy[state][1]
  }
  function start() {
    if (stopped) return
    if (!root) {
      root = document.getElementById('app-root')
      if (!root) return
      if (ready()) return
      observer = new MutationObserver(ready)
      observer.observe(root, { attributes: true, attributeFilter: ['data-v-app'] })
    }
    render()
  }
  function onError(event) {
    const target = event.target
    const entry = target instanceof HTMLScriptElement && target.type === 'module' && !!target.src
    const preload = target instanceof HTMLLinkElement && target.rel === 'modulepreload'
    let runtime = false
    if (event instanceof ErrorEvent && event.filename) {
      try {
        const url = new URL(event.filename, location.href)
        runtime = url.origin === location.origin && /^\/(assets|src)\//.test(url.pathname)
      } catch {
        // An unrelated error with an invalid filename is not an entry failure.
      }
    }
    if (!entry && !preload && !runtime) return
    failed = true
    start()
  }
  function onRejection(event) {
    if (
      !/dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
        String(event.reason?.message || event.reason)
      )
    )
      return
    failed = true
    start()
  }
  const timer = setTimeout(() => {
    slow = true
    start()
  }, 12000)
  window.addEventListener('error', onError, true)
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener('online', render)
  window.addEventListener('offline', render)
  document.addEventListener('readystatechange', start)
  start()
})()
