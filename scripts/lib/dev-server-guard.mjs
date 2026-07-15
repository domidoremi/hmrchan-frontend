import { lookup } from 'node:dns/promises'
import { createServer } from 'node:net'

const DEFAULT_DEV_PORT = 5173
const DEFAULT_DEV_HOST = '127.0.0.1'
const MAX_PORT = 65535

function matchesOption(token, optionNames) {
  return optionNames.some((name) => token === name || token.startsWith(`${name}=`))
}

function parseOptionValue(token, next, optionNames) {
  for (const name of optionNames) {
    if (token.startsWith(`${name}=`)) {
      return {
        consumedNext: false,
        value: token.slice(name.length + 1),
      }
    }
  }

  if (optionNames.includes(token) && typeof next === 'string' && !next.startsWith('-')) {
    return {
      consumedNext: true,
      value: next,
    }
  }

  return {
    consumedNext: false,
    value: undefined,
  }
}

export function parseDevServerArgs(argv) {
  const options = {
    host: DEFAULT_DEV_HOST,
    port: DEFAULT_DEV_PORT,
    portIsExplicit: false,
    strictPort: true,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]

    if (matchesOption(token, ['--host', '-H'])) {
      const parsed = parseOptionValue(token, next, ['--host', '-H'])
      options.host = parsed.value || '0.0.0.0'
      if (parsed.consumedNext) index += 1
      continue
    }

    if (matchesOption(token, ['--port', '-p'])) {
      const parsed = parseOptionValue(token, next, ['--port', '-p'])
      const port = Number.parseInt(parsed.value ?? '', 10)
      options.portIsExplicit = true
      if (Number.isInteger(port) && port > 0 && port <= MAX_PORT) {
        options.port = port
      }
      if (parsed.consumedNext) index += 1
      continue
    }

    if (token === '--strictPort' || token === '--strict-port') {
      options.strictPort = true
    }
  }

  return options
}

function canListenOnHost(port, host) {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()

    server.once('error', (error) => {
      if (error?.code === 'EADDRINUSE' || error?.code === 'EACCES') {
        resolve(false)
        return
      }

      reject(error)
    })

    server.listen({ port, host, exclusive: true }, () => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve(true)
      })
    })
  })
}

async function resolveProbeHosts(host) {
  const hosts = new Set([host, DEFAULT_DEV_HOST])

  try {
    const localhostAddresses = await lookup('localhost', { all: true })
    for (const { address } of localhostAddresses) {
      hosts.add(address)
    }
  } catch {
    hosts.add('localhost')
  }

  return [...hosts]
}

export async function isDevPortAvailable(port, { host = DEFAULT_DEV_HOST } = {}) {
  const probeHosts = await resolveProbeHosts(host)

  for (const probeHost of probeHosts) {
    if (!(await canListenOnHost(port, probeHost))) {
      return false
    }
  }

  return true
}

export async function findAvailableDevPort({
  startPort = DEFAULT_DEV_PORT,
  host = DEFAULT_DEV_HOST,
  isPortAvailable = isDevPortAvailable,
} = {}) {
  if (!Number.isInteger(startPort) || startPort <= 0 || startPort > MAX_PORT) {
    throw new Error(`Invalid development server port: ${startPort}`)
  }

  for (let port = startPort; port <= MAX_PORT; port += 1) {
    if (await isPortAvailable(port, { host })) {
      return port
    }
  }

  throw new Error(`No available development server port found from ${startPort} to ${MAX_PORT}.`)
}

export async function assertDevOriginIsSafe({
  port = DEFAULT_DEV_PORT,
  host = DEFAULT_DEV_HOST,
} = {}) {
  if (await isDevPortAvailable(port, { host })) {
    return
  }

  throw new Error(
    `Port ${port} is unavailable on ${host} or localhost. Choose another explicit --port, or omit --port to search from ${DEFAULT_DEV_PORT}.`
  )
}

export function buildViteArgs(
  argv,
  { host = DEFAULT_DEV_HOST, port = DEFAULT_DEV_PORT, strictPort = true } = {}
) {
  const nextArgs = [...argv]

  if (!nextArgs.some((token) => matchesOption(token, ['--host', '-H']))) {
    nextArgs.push('--host', host)
  }

  if (!nextArgs.some((token) => matchesOption(token, ['--port', '-p']))) {
    nextArgs.push('--port', String(port))
  }

  if (strictPort && !nextArgs.includes('--strictPort') && !nextArgs.includes('--strict-port')) {
    nextArgs.push('--strictPort')
  }

  return nextArgs
}
