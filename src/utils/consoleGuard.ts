/**
 * 控制台保护模块
 *
 * 生产环境下禁用控制台，防止：
 * 1. 用户被诱导在控制台执行恶意代码（Self-XSS 攻击）
 * 2. 敏感信息通过控制台泄露
 * 3. 用户意外操作导致的问题
 *
 * 注意：这不是绝对的安全措施，有经验的用户可以绕过
 * 主要目的是保护普通用户免受社会工程攻击
 */

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

// 标记是否已显示过警告，避免重复
let hasShownWarning = false

/**
 * 显示籾山ひめり的祝福信息
 */
function showHimeriMessage(): void {
  console.log(HIMERI_MESSAGE, HIMERI_TITLE_STYLE, HIMERI_LINK_STYLE, HIMERI_TEXT_STYLE)
}

/**
 * 显示控制台警告信息（仅显示一次）
 */
function showWarning(): void {
  if (hasShownWarning) return
  hasShownWarning = true

  // 先显示籾山ひめり的信息
  showHimeriMessage()
  // 再显示安全警告
  console.log(WARNING_MESSAGE, TITLE_STYLE, TEXT_STYLE)
}

/**
 * 禁用控制台方法
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function disableConsoleMethods(): void {
  const noop = () => {}

  // 保留 console.log 用于显示警告，但重写其他方法
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

/**
 * 检测开发者工具是否打开（基于窗口尺寸变化）
 * 注意：这不是 100% 可靠的检测方法
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function detectDevTools(): void {
  const threshold = 160

  const checkDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold

    if (widthThreshold || heightThreshold) {
      showWarning()
    }
  }

  // 初始检查
  checkDevTools()

  // 监听窗口变化
  window.addEventListener('resize', checkDevTools)
}

/**
 * 禁用右键菜单（可选，根据需求启用）
 */
export function disableContextMenu(): void {
  document.addEventListener(
    'contextmenu',
    (e) => {
      // 允许在输入框中使用右键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      e.preventDefault()
    },
    { capture: true }
  )
}

/**
 * 禁用常用开发者工具快捷键
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function disableDevToolsShortcuts(): void {
  document.addEventListener(
    'keydown',
    (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault()
        showWarning()
        return
      }

      // Ctrl+Shift+I / Cmd+Option+I (开发者工具)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        showWarning()
        return
      }

      // Ctrl+Shift+J / Cmd+Option+J (控制台)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault()
        showWarning()
        return
      }

      // Ctrl+Shift+C / Cmd+Option+C (元素检查)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        showWarning()
        return
      }

      // Ctrl+U / Cmd+U (查看源代码)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault()
        return
      }
    },
    { capture: true }
  )
}

/**
 * 初始化控制台保护
 * 仅在生产环境启用
 */
export function initConsoleGuard(): void {
  // 控制台保护已禁用
  // 如需启用，请取消下面代码的注释
  /*
  // 仅在生产环境启用
  if (import.meta.env.DEV) {
    return
  }

  // 显示警告信息
  showWarning()

  // 禁用控制台方法
  disableConsoleMethods()

  // 检测开发者工具
  detectDevTools()

  // 禁用快捷键
  disableDevToolsShortcuts()

  // 可选：禁用右键菜单（取消注释以启用）
  // disableContextMenu()
  */
}
