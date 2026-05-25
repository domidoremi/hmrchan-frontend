#!/usr/bin/env bun

import { existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { onRequest as onApiRequest } from '../functions/api/[[path]].ts'
import { onRequest as onClientReportRequest } from '../functions/client-report.ts'
import { onRequest as onCspReportRequest } from '../functions/csp-report.ts'
import { onRequest as onUploadsRequest } from '../functions/uploads/[[path]].ts'
import { handleInternalApiGatewayRequest } from '../src/edge/internalApiGatewayWorker.ts'
import { resolveHtmlDocument, SITE_ORIGIN } from '../src/edge/htmlDocument.ts'
import { createLocalAuditEnv } from './lib/audit-env.js'

type RouteContext = {
  env: LocalPreviewEnv
  params: { path?: string | string[] }
  request: Request
}

type LocalPreviewEnv = NodeJS.ProcessEnv & {
  ENABLE_INTERNAL_API_GATEWAY?: string
  INTERNAL_API_GATEWAY?: {
    fetch(request: Request): Promise<Response>
  }
}

const projectRoot = resolve(import.meta.dir, '..')
const distDir = resolve(projectRoot, 'dist')
const HOST_COOKIE_EQUIVALENTS = new Map<string, string>([
  ['__Host-momi_bff_at', 'momi_bff_at'],
  ['__Host-momi_bff_rt', 'momi_bff_rt'],
  ['__Host-momi_origin_csrf', 'momi_origin_csrf'],
])
const LOCAL_COOKIE_EQUIVALENTS = new Map<string, string>(
  [...HOST_COOKIE_EQUIVALENTS.entries()].map(([hostName, localName]) => [localName, hostName])
)
const FALLBACK_HTML_FILES = Object.freeze(
  new Map<string, string>([
    ['/', 'index.html'],
    ['/404', join('404', 'index.html')],
    ['/404/', join('404', 'index.html')],
    ['/explore', 'explore.html'],
    ['/authors', 'authors.html'],
    ['/community', 'community.html'],
    ['/about', 'about.html'],
    ['/contact', 'contact.html'],
    ['/schedule', 'schedule.html'],
    ['/search', 'search.html'],
  ])
)

function parseArgs(argv: string[]) {
  const options = {
    host: '127.0.0.1',
    idleTimeout: 60,
    port: 4173,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]

    if ((token === '--host' || token === '--ip') && typeof next === 'string') {
      options.host = next
      index += 1
      continue
    }

    if (token === '--port' && typeof next === 'string') {
      const parsed = Number.parseInt(next, 10)
      if (Number.isInteger(parsed) && parsed > 0) {
        options.port = parsed
      }
      index += 1
      continue
    }

    if (token === '--idle-timeout' && typeof next === 'string') {
      const parsed = Number.parseInt(next, 10)
      if (Number.isInteger(parsed) && parsed > 0) {
        options.idleTimeout = parsed
      }
      index += 1
    }
  }

  return options
}

function hasTrimmedEnvValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function shouldAttachInternalApiGateway(env: NodeJS.ProcessEnv): boolean {
  if (env.ENABLE_INTERNAL_API_GATEWAY?.trim().toLowerCase() === 'false') {
    return false
  }

  return (
    hasTrimmedEnvValue(env.API_BASE_URL) &&
    hasTrimmedEnvValue(env.VPC_IDENTITY_API_ORIGIN) &&
    hasTrimmedEnvValue(env.VPC_COMMUNITY_API_ORIGIN) &&
    hasTrimmedEnvValue(env.VPC_CONTENT_API_ORIGIN)
  )
}

function createPreviewEnv(baseEnv: NodeJS.ProcessEnv): LocalPreviewEnv {
  const env: LocalPreviewEnv = {
    ...createLocalAuditEnv(baseEnv, { includeContractFallback: true }),
  }

  if (!shouldAttachInternalApiGateway(env)) {
    return env
  }

  const gatewayEnv = {
    ...env,
    ENABLE_VPC_PROXY: 'true',
    VPC_SERVICE: {
      fetch(request: Request) {
        return fetch(request)
      },
    },
  }

  env.ENABLE_INTERNAL_API_GATEWAY = 'true'
  env.INTERNAL_API_GATEWAY = {
    fetch(request: Request) {
      return handleInternalApiGatewayRequest(request, gatewayEnv)
    },
  }

  return env
}

function isSafePath(candidate: string): boolean {
  return (
    candidate === distDir ||
    candidate.startsWith(`${distDir}\\`) ||
    candidate.startsWith(`${distDir}/`)
  )
}

function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

function normalizeAssetCandidate(pathname: string): string | null {
  const normalizedPath = normalize(decodePathname(pathname)).replace(/^([/\\])+/, '')
  const candidate = resolve(distDir, normalizedPath)
  if (!isSafePath(candidate)) {
    return null
  }
  return candidate
}

function resolveStaticFilePath(pathname: string): string | null {
  const directCandidate = normalizeAssetCandidate(pathname)
  if (directCandidate && existsSync(directCandidate) && statSync(directCandidate).isFile()) {
    return directCandidate
  }

  if (pathname.endsWith('/')) {
    const indexCandidate = normalizeAssetCandidate(`${pathname}index.html`)
    if (indexCandidate && existsSync(indexCandidate) && statSync(indexCandidate).isFile()) {
      return indexCandidate
    }
  }

  return null
}

function resolveStaticFileStatus(pathname: string): number {
  return pathname === '/404' || pathname === '/404/' ? 404 : 200
}

function resolveHtmlFallbackPath(pathname: string): { filePath: string; status: number } {
  const documentConfig = resolveHtmlDocument(new URL(pathname, SITE_ORIGIN))
  if (documentConfig.status === 404) {
    return {
      filePath: resolve(distDir, join('404', 'index.html')),
      status: 404,
    }
  }

  const normalizedPath =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  const mapped = FALLBACK_HTML_FILES.get(pathname) ?? FALLBACK_HTML_FILES.get(normalizedPath)
  if (mapped) {
    return {
      filePath: resolve(distDir, mapped),
      status: 200,
    }
  }

  if (normalizedPath !== '/' && !extname(normalizedPath)) {
    const directPage = resolve(distDir, `${normalizedPath.slice(1)}.html`)
    if (existsSync(directPage) && statSync(directPage).isFile()) {
      return {
        filePath: directPage,
        status: 200,
      }
    }
  }

  return {
    filePath: resolve(distDir, 'index.html'),
    status: 200,
  }
}

function getMimeType(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
      return 'application/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.xml':
      return 'application/xml; charset=utf-8'
    case '.txt':
      return 'text/plain; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    case '.ico':
      return 'image/x-icon'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.avif':
      return 'image/avif'
    case '.woff':
      return 'font/woff'
    case '.woff2':
      return 'font/woff2'
    default:
      return 'application/octet-stream'
  }
}

function getSetCookieHeaders(headers: Headers): string[] {
  const maybeGetSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie
  if (typeof maybeGetSetCookie === 'function') {
    return maybeGetSetCookie.call(headers)
  }

  const raw = headers.get('set-cookie')
  return raw ? [raw] : []
}

function rewriteIncomingCookieHeader(value: string | null): string | null {
  if (!value) return null

  const rewritten = value
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [name, ...rest] = segment.split('=')
      const mappedName = LOCAL_COOKIE_EQUIVALENTS.get(name) ?? name
      return `${mappedName}=${rest.join('=')}`
    })
    .join('; ')

  return rewritten || null
}

function rewriteOutgoingSetCookie(value: string): string {
  let rewritten = value.replace(/;\s*Secure/gi, '')

  for (const [hostName, localName] of HOST_COOKIE_EQUIVALENTS.entries()) {
    rewritten = rewritten.replace(new RegExp(`^${hostName}=`), `${localName}=`)
  }

  return rewritten
}

function rewriteRequestForLocalCookies(request: Request): Request {
  const headers = new Headers(request.headers)
  const rewrittenCookieHeader = rewriteIncomingCookieHeader(headers.get('cookie'))
  if (rewrittenCookieHeader) {
    headers.set('cookie', rewrittenCookieHeader)
  }

  return new Request(request, { headers })
}

function rewriteResponseForLocalCookies(response: Response): Response {
  const setCookies = getSetCookieHeaders(response.headers)
  if (setCookies.length === 0) {
    return response
  }

  const headers = new Headers(response.headers)
  headers.delete('set-cookie')

  for (const cookie of setCookies) {
    headers.append('Set-Cookie', rewriteOutgoingSetCookie(cookie))
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function serveStaticFile(filePath: string, status = 200): Promise<Response> {
  const file = Bun.file(filePath)
  const headers = new Headers({
    'Content-Type': file.type || getMimeType(filePath),
  })
  return new Response(file, {
    status,
    headers,
  })
}

function createRouteContext(request: Request, env: LocalPreviewEnv, path?: string): RouteContext {
  const normalizedPath = typeof path === 'string' ? path.replace(/^\/+|\/+$/g, '') : ''
  return {
    request: rewriteRequestForLocalCookies(request),
    env,
    params: {
      path: normalizedPath ? normalizedPath.split('/') : [],
    },
  }
}

async function handleFunctionRequest(request: Request, env: LocalPreviewEnv): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname

  if (pathname.startsWith('/api/')) {
    return onApiRequest(createRouteContext(request, env, pathname.slice('/api/'.length)))
  }

  if (pathname.startsWith('/uploads/')) {
    return onUploadsRequest(createRouteContext(request, env, pathname.slice('/uploads/'.length)))
  }

  if (pathname === '/client-report') {
    return onClientReportRequest(createRouteContext(request, env))
  }

  if (pathname === '/csp-report') {
    return onCspReportRequest(createRouteContext(request, env))
  }

  return new Response('Not Found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

function isHtmlNavigationRequest(request: Request): boolean {
  const accept = request.headers.get('accept') ?? ''
  if (accept.includes('text/html')) return true
  return request.headers.get('sec-fetch-mode') === 'navigate'
}

function shouldServeHtmlFallback(request: Request): boolean {
  if (isHtmlNavigationRequest(request)) return true

  const accept = request.headers.get('accept') ?? ''
  return !accept || accept.includes('*/*')
}

async function handleRequest(request: Request, env: LocalPreviewEnv): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname

  if (pathname === '/health/ready') {
    return Response.json({
      ok: true,
      runtime: 'local-pages-preview',
    })
  }

  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/uploads/') ||
    pathname === '/client-report' ||
    pathname === '/csp-report'
  ) {
    return rewriteResponseForLocalCookies(await handleFunctionRequest(request, env))
  }

  const staticFilePath = resolveStaticFilePath(pathname)
  if (staticFilePath) {
    return serveStaticFile(staticFilePath, resolveStaticFileStatus(pathname))
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET, HEAD',
        'Cache-Control': 'no-store',
      },
    })
  }

  if (extname(pathname)) {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }

  if (!shouldServeHtmlFallback(request)) {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }

  const fallback = resolveHtmlFallbackPath(pathname)
  return serveStaticFile(fallback.filePath, fallback.status)
}

const options = parseArgs(Bun.argv.slice(2))
const env = createPreviewEnv(process.env)

const server = Bun.serve({
  hostname: options.host,
  idleTimeout: options.idleTimeout,
  port: options.port,
  fetch(request) {
    return handleRequest(request, env)
  },
})

console.log(`[local-pages-preview] Ready on http://${server.hostname}:${server.port}`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.stop(true)
    process.exit(0)
  })
}
