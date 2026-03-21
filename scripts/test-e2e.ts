#!/usr/bin/env bun

import { spawn } from 'child_process'
import { createServer } from 'net'
import puppeteer from 'puppeteer'

const AUDIT_ENV = {
  ...process.env,
  VITE_ENABLE_CLIENT_INIT: process.env['VITE_ENABLE_CLIENT_INIT'] ?? 'false',
  VITE_ENABLE_DATA_PREFETCH: process.env['VITE_ENABLE_DATA_PREFETCH'] ?? 'false',
  VITE_DISABLE_PREVIEW_PROXY: process.env['VITE_DISABLE_PREVIEW_PROXY'] ?? 'true',
}

function getBunExecutable(): string {
  return 'bun'
}

async function findAvailablePort(preferredPort = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', reject)
    server.listen(preferredPort, () => {
      const address = server.address()
      const actualPort =
        typeof address === 'object' && address && typeof address.port === 'number'
          ? address.port
          : preferredPort
      server.close((error) => {
        if (error) reject(error)
        else resolve(actualPort)
      })
    })
  })
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

function startPreviewServer(port: number): Promise<{ kill: () => Promise<void>; port: number }> {
  return new Promise((resolve, reject) => {
    const server = spawn(getBunExecutable(), ['run', 'preview', '--port', String(port)], {
      stdio: 'pipe',
      shell: false,
      env: AUDIT_ENV,
    })

    let resolved = false
    let startupCheck: ReturnType<typeof setInterval> | null = null

    function cleanupStartupCheck() {
      if (startupCheck) {
        clearInterval(startupCheck)
        startupCheck = null
      }
    }

    async function tryResolveWhenReady() {
      if (resolved) return
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`, {
          redirect: 'manual',
        })
        if (response.status >= 200 && response.status < 500) {
          resolved = true
          cleanupStartupCheck()
          resolve({
            kill: () => terminateProcessTree(server.pid),
            port,
          })
        }
      } catch {
        // preview server not ready yet
      }
    }

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      process.stdout.write(output)
    })

    server.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(data.toString())
    })

    server.on('error', (error) => {
      cleanupStartupCheck()
      if (!resolved) reject(error)
    })

    server.on('close', (code) => {
      cleanupStartupCheck()
      if (!resolved) {
        reject(new Error(`Preview server exited before becoming ready (code ${code ?? 'unknown'})`))
      }
    })

    startupCheck = setInterval(() => {
      void tryResolveWhenReady()
    }, 500)
    void tryResolveWhenReady()

    setTimeout(() => {
      if (!resolved) {
        cleanupStartupCheck()
        void terminateProcessTree(server.pid)
        reject(new Error(`Preview server startup timeout on port ${port}`))
      }
    }, 45_000)
  })
}

async function assertStaticPrerenderedRoute(
  baseUrl: string,
  path: string,
  expected: {
    title: string
    canonical: string
    robots?: string
  }
): Promise<void> {
  const response = await fetch(`${baseUrl}${path}`)
  const html = await response.text()

  if (response.status !== 200) {
    throw new Error(`Expected prerendered route ${path} to return 200, got ${response.status}`)
  }

  if (!html.includes(`<title>${expected.title}</title>`)) {
    throw new Error(`Expected ${path} HTML to contain title ${expected.title}`)
  }

  if (!html.includes(`href="${expected.canonical}"`)) {
    throw new Error(`Expected ${path} HTML to contain canonical ${expected.canonical}`)
  }

  if (expected.robots && !html.includes(`content="${expected.robots}"`)) {
    throw new Error(`Expected ${path} HTML to contain robots ${expected.robots}`)
  }

  if (!html.includes('data-prerender-shell="true"')) {
    throw new Error(`Expected ${path} HTML to contain prerender shell markup`)
  }
}

async function assertBrowserRoute(
  browser: puppeteer.Browser,
  baseUrl: string,
  path: string,
  expectedSelector: string,
  expectedCanonicalPath = path
): Promise<void> {
  const page = await browser.newPage()
  page.setDefaultTimeout(15_000)
  await page.goto(`${baseUrl}${path}`, {
    waitUntil: 'domcontentloaded',
  })

  await page.waitForSelector(expectedSelector)
  await page.waitForFunction(
    () => document.title.includes('MomiChan') && document.title !== 'MomiChan - 籾山ひめり Fan Hub'
  )

  const title = await page.title()
  if (!title.includes('MomiChan')) {
    throw new Error(`Unexpected browser title for ${path}: ${title}`)
  }

  await page.waitForSelector('link[rel="canonical"]')
  const canonicalHref = await page.$eval('link[rel="canonical"]', (el) => el.getAttribute('href'))
  if (
    canonicalHref !==
    `https://momichan.xyz${expectedCanonicalPath === '/' ? '/' : expectedCanonicalPath}`
  ) {
    throw new Error(`Unexpected canonical for ${path}: ${canonicalHref}`)
  }

  const hasCfBeacon = await page.evaluate(() =>
    Boolean(document.querySelector('script[data-cf-beacon]'))
  )
  if (hasCfBeacon) {
    throw new Error(
      `Cloudflare analytics beacon should not be injected for ${path} without consent`
    )
  }

  await page.close()
}

async function assertServiceWorkerLifecycle(
  browser: puppeteer.Browser,
  baseUrl: string
): Promise<void> {
  const page = await browser.newPage()
  page.setDefaultTimeout(20_000)

  await page.goto(`${baseUrl}/`, {
    waitUntil: 'networkidle0',
  })

  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false
    const ready = await navigator.serviceWorker.ready
    const scriptUrl =
      ready.active?.scriptURL ?? ready.waiting?.scriptURL ?? ready.installing?.scriptURL ?? null
    return Boolean(scriptUrl?.endsWith('/sw.js'))
  })

  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForFunction(async () => {
    if (navigator.serviceWorker.controller) return true
    await navigator.serviceWorker.ready
    return Boolean(navigator.serviceWorker.controller)
  })

  const registrationScriptUrl = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready
    return (
      ready.active?.scriptURL ?? ready.waiting?.scriptURL ?? ready.installing?.scriptURL ?? null
    )
  })

  if (!registrationScriptUrl?.endsWith('/sw.js')) {
    throw new Error(`Unexpected service worker script URL: ${registrationScriptUrl}`)
  }

  await page.setOfflineMode(true)
  const offlineResponse = await page.goto(`${baseUrl}/offline-check`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForSelector('.not-found-page')
  await page.waitForFunction(() => document.title.includes('MomiChan'))

  if (!offlineResponse) {
    throw new Error('Expected offline navigation to return a response')
  }

  if (offlineResponse.status() !== 200) {
    throw new Error(`Expected offline navigation to return 200, got ${offlineResponse.status()}`)
  }

  if (!offlineResponse.fromServiceWorker()) {
    throw new Error('Expected offline navigation to be fulfilled by the service worker')
  }

  await page.setOfflineMode(false)
  await page.goto(`${baseUrl}/search`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForSelector('.search-page')

  await page.close()
}

async function main(): Promise<void> {
  console.log('🔎 Running minimal E2E checks...\n')

  let previewServer: { kill: () => Promise<void>; port: number } | null = null
  let browser: puppeteer.Browser | null = null

  try {
    console.log('🏗️ Building production bundle...')
    await runBunTask('build')

    const previewPort = await findAvailablePort(0)
    previewServer = await startPreviewServer(previewPort)
    const baseUrl = `http://localhost:${previewServer.port}`

    console.log('🧱 Verifying static prerendered HTML...')
    await assertStaticPrerenderedRoute(baseUrl, '/', {
      title: 'Home · MomiChan',
      canonical: 'https://momichan.xyz/',
      robots: 'index, follow',
    })
    await assertStaticPrerenderedRoute(baseUrl, '/explore/', {
      title: 'Explore · MomiChan',
      canonical: 'https://momichan.xyz/explore',
      robots: 'index, follow',
    })
    await assertStaticPrerenderedRoute(baseUrl, '/authors/', {
      title: 'Authors · MomiChan',
      canonical: 'https://momichan.xyz/authors',
      robots: 'index, follow',
    })
    await assertStaticPrerenderedRoute(baseUrl, '/404/', {
      title: 'Page not found · MomiChan',
      canonical: 'https://momichan.xyz/404',
      robots: 'noindex, nofollow',
    })

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    console.log('🧭 Verifying browser routes...')
    await assertBrowserRoute(browser, baseUrl, '/', '.home-page')
    await assertBrowserRoute(browser, baseUrl, '/explore', '.explore-page')
    await assertBrowserRoute(browser, baseUrl, '/search', '.search-page')
    await assertBrowserRoute(browser, baseUrl, '/authors', '.authors-page')
    await assertBrowserRoute(browser, baseUrl, '/login', '.auth-page--login')
    await assertBrowserRoute(
      browser,
      baseUrl,
      '/post/00000000-0000-4000-8000-000000000000',
      '.post-detail-page'
    )
    await assertBrowserRoute(browser, baseUrl, '/profile/settings', '.auth-page--login', '/login')
    await assertBrowserRoute(browser, baseUrl, '/this-route-does-not-exist', '.not-found-page')

    console.log('🛰️ Verifying service worker lifecycle...')
    await assertServiceWorkerLifecycle(browser, baseUrl)

    console.log('\n✅ Minimal E2E checks passed')
  } catch (error) {
    console.error('\n❌ Minimal E2E checks failed:', error)
    process.exit(1)
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        // ignore
      })
    }
    if (previewServer) {
      await previewServer.kill()
    }
  }
}

void main()
