#!/usr/bin/env bun
/**
 * 前端健康巡检脚本（路由可用性 + 基础可访问性 + 控制台与网络错误）
 *
 * 用法：
 *   bun run scripts/frontend-health-check.ts
 *   FRONTEND_HEALTH_BASE_URL=http://127.0.0.1:5174 bun run scripts/frontend-health-check.ts
 */

import puppeteer, { type Viewport } from 'puppeteer'
import { spawn } from 'child_process'
import { shouldIgnoreConsoleError, shouldIgnoreRequestIssue } from './lib/frontend-health'

interface ScanIssue {
  type: string
  message: string
  details?: string[]
}

interface RouteResult {
  route: string
  viewport: string
  issues: ScanIssue[]
}

interface RuntimeProbe {
  duplicateIds: Array<{ id: string; count: number }>
  unlabeledButtons: string[]
  unlabeledInputs: string[]
  missingAriaControls: Array<{ selector: string; controls: string }>
  emptyLinks: string[]
  imageWithoutAlt: string[]
  horizontalOverflow: boolean
}

const BASE_URL = process.env['FRONTEND_HEALTH_BASE_URL'] ?? 'http://127.0.0.1:5174'
const AUTO_START = process.env['FRONTEND_HEALTH_AUTOSTART'] !== 'false'
const PREVIEW_PORT = Number(process.env['FRONTEND_HEALTH_PREVIEW_PORT'] ?? '4174')
const INCLUDE_API_ERRORS = process.env['FRONTEND_HEALTH_INCLUDE_API_ERRORS'] === 'true'
const AUDIT_ENV = {
  ...process.env,
  VITE_ENABLE_CLIENT_INIT: process.env['VITE_ENABLE_CLIENT_INIT'] ?? 'false',
  VITE_ENABLE_SCHEDULE_API: process.env['VITE_ENABLE_SCHEDULE_API'] ?? 'false',
  VITE_ENABLE_DATA_PREFETCH: process.env['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY: process.env['VITE_DISABLE_PREVIEW_PROXY'] ?? 'true',
}

const ROUTES = [
  '/',
  '/explore',
  '/search',
  '/authors',
  '/community',
  '/schedule',
  '/about',
  '/contact',
  '/login',
  '/register',
  '/forgot-password',
]

const VIEWPORTS: Array<{ name: string; value: Viewport }> = [
  { name: 'desktop', value: { width: 1440, height: 900 } },
  { name: 'mobile', value: { width: 390, height: 844, isMobile: true, hasTouch: true } },
]

const MAX_SAMPLE = 5

function sample<T>(values: T[]): T[] {
  return values.slice(0, MAX_SAMPLE)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getBunExecutable(): string {
  return 'bun'
}

async function runBunTask(task: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(getBunExecutable(), ['run', task], {
      stdio: 'inherit',
      shell: false,
      env: AUDIT_ENV,
    })

    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`bun run ${task} exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

async function terminateProcessTree(pid: number | undefined): Promise<void> {
  if (!pid) return

  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        shell: false,
      })
      killer.on('close', () => resolve())
      killer.on('error', () => resolve())
    })
    return
  }

  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // ignore
  }
}

async function isBaseUrlReachable(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4_000)
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function startPreviewServer(
  port: number
): Promise<{ kill: () => Promise<void>; baseUrl: string; port: number }> {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting preview server on ${port}...`)
    const server = spawn(getBunExecutable(), ['run', 'preview', '--port', String(port)], {
      stdio: 'pipe',
      shell: false,
      env: AUDIT_ENV,
    })

    let resolved = false

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      process.stdout.write(output)
      const match = output.match(/Local:\s+http:\/\/localhost:(\d+)\//)
      if (!resolved && match?.[1]) {
        resolved = true
        const actualPort = Number(match[1])
        setTimeout(
          () =>
            resolve({
              kill: () => terminateProcessTree(server.pid),
              baseUrl: `http://127.0.0.1:${actualPort}`,
              port: actualPort,
            }),
          900
        )
      }
    })

    server.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(data.toString())
    })

    server.on('error', (error: Error) => {
      if (!resolved) reject(error)
    })

    setTimeout(() => {
      if (!resolved) reject(new Error('Preview server startup timeout'))
    }, 45_000)
  })
}

async function main() {
  let effectiveBaseUrl = BASE_URL
  let managedServer: { kill: () => Promise<void>; baseUrl: string; port: number } | null = null

  try {
    const reachable = await isBaseUrlReachable(BASE_URL)
    if (!reachable) {
      if (!AUTO_START) {
        throw new Error(
          `Cannot reach ${BASE_URL}. Start a local server or set FRONTEND_HEALTH_AUTOSTART=true.`
        )
      }

      console.log(`⚠️ Base URL unavailable: ${BASE_URL}`)
      console.log('🏗️ Building project for preview-based health check...')
      await runBunTask('build')
      managedServer = await startPreviewServer(PREVIEW_PORT)
      effectiveBaseUrl = managedServer.baseUrl
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'],
    })

    const results: RouteResult[] = []
    let crashed = false

    try {
      for (const viewport of VIEWPORTS) {
        for (const route of ROUTES) {
          const page = await browser.newPage()
          const issues: ScanIssue[] = []
          const consoleErrors = new Set<string>()
          const requestFailures = new Set<string>()
          const badResponses = new Set<string>()

          await page.setViewport(viewport.value)

          page.on('console', (msg) => {
            if (msg.type() === 'error') {
              const text = msg.text()
              if (shouldIgnoreConsoleError(text, INCLUDE_API_ERRORS, msg.location().url)) {
                return
              }
              consoleErrors.add(msg.text())
            }
          })

          page.on('requestfailed', (req) => {
            if (shouldIgnoreRequestIssue(req.url(), INCLUDE_API_ERRORS)) return
            const reason = req.failure()?.errorText ?? 'unknown'
            requestFailures.add(`${req.method()} ${req.url()} (${reason})`)
          })

          page.on('response', (res) => {
            const status = res.status()
            if (shouldIgnoreRequestIssue(res.url(), INCLUDE_API_ERRORS)) return
            if (status >= 400) {
              badResponses.add(`${status} ${res.request().method()} ${res.url()}`)
            }
          })

          try {
            await page.goto(new URL(route, effectiveBaseUrl).toString(), {
              waitUntil: 'domcontentloaded',
              timeout: 60_000,
            })
            await page.waitForSelector('body', { timeout: 15_000 })
            await page.waitForNetworkIdle({ idleTime: 800, timeout: 15_000 }).catch(() => {})
            await sleep(900)

            const probe: RuntimeProbe = await page.evaluate(() => {
              const normalize = (value: string | null | undefined) =>
                (value ?? '').replace(/\s+/g, ' ').trim()
              const clip = (value: string) =>
                value.length > 140 ? `${value.slice(0, 140)}…` : value

              const getSelector = (element: Element): string => {
                const parts: string[] = []
                let current: Element | null = element
                let depth = 0
                while (current && depth < 4) {
                  let part = current.tagName.toLowerCase()
                  if (current.id) {
                    part += `#${current.id}`
                    parts.unshift(part)
                    break
                  }
                  if (current.classList.length > 0) {
                    part += `.${Array.from(current.classList).slice(0, 2).join('.')}`
                  }
                  parts.unshift(part)
                  current = current.parentElement
                  depth++
                }
                return clip(parts.join(' > '))
              }

              const duplicateIds: Array<{ id: string; count: number }> = []
              const idCounts = new Map<string, number>()
              for (const el of document.querySelectorAll<HTMLElement>('[id]')) {
                idCounts.set(el.id, (idCounts.get(el.id) ?? 0) + 1)
              }
              for (const [id, count] of idCounts.entries()) {
                if (count > 1) duplicateIds.push({ id, count })
              }

              const unlabeledButtons: string[] = []
              for (const button of document.querySelectorAll<HTMLButtonElement>('button')) {
                const text = normalize(button.textContent)
                const ariaLabel = normalize(button.getAttribute('aria-label'))
                const ariaLabelledBy = normalize(button.getAttribute('aria-labelledby'))
                const title = normalize(button.getAttribute('title'))
                if (!text && !ariaLabel && !ariaLabelledBy && !title) {
                  unlabeledButtons.push(getSelector(button))
                }
              }

              const unlabeledInputs: string[] = []
              for (const input of document.querySelectorAll<
                HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
              >('input, textarea, select')) {
                if (input instanceof HTMLInputElement && input.type === 'hidden') continue
                const ariaLabel = normalize(input.getAttribute('aria-label'))
                const ariaLabelledBy = normalize(input.getAttribute('aria-labelledby'))
                const title = normalize(input.getAttribute('title'))
                const inputId = input.id
                const hasLabel = !!(
                  inputId && document.querySelector(`label[for="${window.CSS.escape(inputId)}"]`)
                )
                const wrappedLabel = !!input.closest('label')
                if (!ariaLabel && !ariaLabelledBy && !title && !hasLabel && !wrappedLabel) {
                  unlabeledInputs.push(getSelector(input))
                }
              }

              const missingAriaControls: Array<{ selector: string; controls: string }> = []
              for (const el of document.querySelectorAll<HTMLElement>('[aria-controls]')) {
                const controls = normalize(el.getAttribute('aria-controls'))
                if (!controls) continue
                const missing = controls
                  .split(/\s+/)
                  .filter((id) => id.length > 0 && !document.getElementById(id))
                if (missing.length > 0) {
                  missingAriaControls.push({
                    selector: getSelector(el),
                    controls,
                  })
                }
              }

              const emptyLinks: string[] = []
              for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
                const text = normalize(link.textContent)
                const ariaLabel = normalize(link.getAttribute('aria-label'))
                const title = normalize(link.getAttribute('title'))
                if (!text && !ariaLabel && !title) emptyLinks.push(getSelector(link))
              }

              const imageWithoutAlt: string[] = []
              for (const image of document.querySelectorAll<HTMLImageElement>('img')) {
                if (!image.hasAttribute('alt')) imageWithoutAlt.push(getSelector(image))
              }

              const horizontalOverflow =
                document.documentElement.scrollWidth > window.innerWidth + 1

              return {
                duplicateIds,
                unlabeledButtons,
                unlabeledInputs,
                missingAriaControls,
                emptyLinks,
                imageWithoutAlt,
                horizontalOverflow,
              }
            })

            if (probe.duplicateIds.length > 0) {
              issues.push({
                type: 'duplicate-id',
                message: `发现重复 id: ${probe.duplicateIds.map((v) => `${v.id}×${v.count}`).join(', ')}`,
              })
            }

            if (probe.unlabeledButtons.length > 0) {
              issues.push({
                type: 'a11y-button-name',
                message: `存在缺少可访问名称的按钮 (${probe.unlabeledButtons.length})`,
                details: sample(probe.unlabeledButtons),
              })
            }

            if (probe.unlabeledInputs.length > 0) {
              issues.push({
                type: 'a11y-input-label',
                message: `存在缺少可访问名称/标签的输入控件 (${probe.unlabeledInputs.length})`,
                details: sample(probe.unlabeledInputs),
              })
            }

            if (probe.missingAriaControls.length > 0) {
              issues.push({
                type: 'a11y-aria-controls',
                message: `存在 aria-controls 指向不存在目标 (${probe.missingAriaControls.length})`,
                details: sample(
                  probe.missingAriaControls.map((v) => `${v.selector} -> ${v.controls}`)
                ),
              })
            }

            if (probe.emptyLinks.length > 0) {
              issues.push({
                type: 'a11y-empty-link',
                message: `存在没有名称的链接 (${probe.emptyLinks.length})`,
                details: sample(probe.emptyLinks),
              })
            }

            if (probe.imageWithoutAlt.length > 0) {
              issues.push({
                type: 'a11y-image-alt',
                message: `存在缺少 alt 的图片 (${probe.imageWithoutAlt.length})`,
                details: sample(probe.imageWithoutAlt),
              })
            }

            if (probe.horizontalOverflow) {
              issues.push({
                type: 'layout-overflow',
                message: '页面出现横向溢出',
              })
            }

            if (consoleErrors.size > 0) {
              issues.push({
                type: 'console-error',
                message: `控制台错误 ${consoleErrors.size} 条`,
                details: sample([...consoleErrors]),
              })
            }

            if (requestFailures.size > 0) {
              issues.push({
                type: 'request-failed',
                message: `请求失败 ${requestFailures.size} 条`,
                details: sample([...requestFailures]),
              })
            }

            if (badResponses.size > 0) {
              issues.push({
                type: 'http-error',
                message: `HTTP 4xx/5xx ${badResponses.size} 条`,
                details: sample([...badResponses]),
              })
            }
          } catch (error) {
            crashed = true
            issues.push({
              type: 'route-crash',
              message: `页面加载失败: ${(error as Error).message}`,
            })
          } finally {
            await page.close()
          }

          results.push({
            route,
            viewport: viewport.name,
            issues,
          })
        }
      }
    } finally {
      await browser.close()
    }

    const issueCount = results.reduce((sum, item) => sum + item.issues.length, 0)

    console.log('\n=== Frontend Health Report ===')
    console.log(`Base URL: ${effectiveBaseUrl}`)
    console.log(`Scanned: ${results.length} route-viewport combinations`)
    console.log(`Issues: ${issueCount}\n`)

    for (const result of results) {
      if (result.issues.length === 0) continue
      console.log(`[${result.viewport}] ${result.route}`)
      for (const issue of result.issues) {
        console.log(`- ${issue.type}: ${issue.message}`)
        if (issue.details?.length) {
          for (const detail of issue.details) {
            console.log(`  • ${detail}`)
          }
        }
      }
      console.log('')
    }

    if (issueCount > 0 || crashed) {
      process.exitCode = 1
      return
    }

    console.log('No issues found.')
  } finally {
    if (managedServer) {
      await managedServer.kill()
    }
  }
}

main().catch((error) => {
  console.error('Frontend health check crashed:', error)
  process.exitCode = 1
})
