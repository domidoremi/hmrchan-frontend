const DEFAULT_DEV_PORT = 5173
const DEFAULT_DEV_HOST = '127.0.0.1'
const PROBE_TIMEOUT_MS = 1500
const CURRENT_APP_MARKERS = ['id="app-root"', '/icons/sitting-32.webp', 'MomiChan']
const FOREIGN_APP_MARKERS = ['<!--app-context-->', '__WS_TOKEN__', 'vite-plugin-uni']

function createAbortSignal(timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  timer.unref?.()
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer)
    },
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value : ''
}

function includesAny(text, markers) {
  return markers.some((marker) => text.includes(marker))
}

export function classifyServerPayload(payload) {
  const text = normalizeText(payload)

  if (!text) {
    return 'empty'
  }

  if (includesAny(text, CURRENT_APP_MARKERS)) {
    return 'hmrchan-frontend'
  }

  if (includesAny(text, FOREIGN_APP_MARKERS)) {
    return 'foreign-vite'
  }

  return 'unknown'
}

export async function probeHttpText(url, timeoutMs = PROBE_TIMEOUT_MS) {
  const { signal, cleanup } = createAbortSignal(timeoutMs)

  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal,
    })
    const text = await response.text()

    return {
      ok: true,
      status: response.status,
      text,
      classification: classifyServerPayload(text),
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      text: '',
      classification: 'unreachable',
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    cleanup()
  }
}

export function parseDevServerArgs(argv) {
  const options = {
    host: DEFAULT_DEV_HOST,
    port: DEFAULT_DEV_PORT,
    strictPort: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]

    if ((token === '--host' || token === '-H') && typeof next === 'string') {
      options.host = next
      index += 1
      continue
    }

    if ((token === '--port' || token === '-p') && typeof next === 'string') {
      const parsed = Number.parseInt(next, 10)
      if (Number.isInteger(parsed) && parsed > 0) {
        options.port = parsed
        options.strictPort = true
      }
      index += 1
      continue
    }

    if (token === '--strictPort' || token === '--strict-port') {
      options.strictPort = true
      continue
    }
  }

  return options
}

function formatProbeSummary(label, probe) {
  if (!probe.ok) {
    return `${label}: unreachable (${probe.error ?? 'request failed'})`
  }

  return `${label}: status ${probe.status}, classification ${probe.classification}`
}

export async function assertDevOriginIsSafe({
  port = DEFAULT_DEV_PORT,
  timeoutMs = PROBE_TIMEOUT_MS,
} = {}) {
  const localhostUrl = `http://localhost:${port}/`
  const loopbackUrl = `http://${DEFAULT_DEV_HOST}:${port}/`
  const [localhostProbe, loopbackProbe] = await Promise.all([
    probeHttpText(localhostUrl, timeoutMs),
    probeHttpText(loopbackUrl, timeoutMs),
  ])

  const anyOccupied = localhostProbe.ok || loopbackProbe.ok
  if (!anyOccupied) {
    return
  }

  const currentAppRunning =
    localhostProbe.classification === 'hmrchan-frontend' ||
    loopbackProbe.classification === 'hmrchan-frontend'

  const foreignServerDetected =
    localhostProbe.classification === 'foreign-vite' ||
    loopbackProbe.classification === 'foreign-vite' ||
    (localhostProbe.ok && localhostProbe.classification !== 'hmrchan-frontend') ||
    (loopbackProbe.ok && loopbackProbe.classification !== 'hmrchan-frontend')

  if (currentAppRunning) {
    throw new Error(
      [
        `A dev server for this repo already appears to be running on port ${port}.`,
        formatProbeSummary('localhost', localhostProbe),
        formatProbeSummary(DEFAULT_DEV_HOST, loopbackProbe),
        `Reuse http://${DEFAULT_DEV_HOST}:${port}/ instead of launching a duplicate dev server.`,
      ].join('\n')
    )
  }

  if (foreignServerDetected) {
    throw new Error(
      [
        `Port ${port} is already serving another app, so starting this repo on the same port would split localhost and ${DEFAULT_DEV_HOST}.`,
        formatProbeSummary('localhost', localhostProbe),
        formatProbeSummary(DEFAULT_DEV_HOST, loopbackProbe),
        'This is the exact pattern that produces "__WS_TOKEN__ is not defined" and stray /favicon.ico 404s in the browser.',
        `Stop the conflicting process first, then reopen this app at http://${DEFAULT_DEV_HOST}:${port}/.`,
      ].join('\n')
    )
  }
}

export function buildViteArgs(argv, { host = DEFAULT_DEV_HOST, strictPort = true } = {}) {
  const nextArgs = [...argv]

  if (!nextArgs.includes('--host') && !nextArgs.includes('-H')) {
    nextArgs.push('--host', host)
  }

  if (strictPort && !nextArgs.includes('--strictPort') && !nextArgs.includes('--strict-port')) {
    nextArgs.push('--strictPort')
  }

  return nextArgs
}
