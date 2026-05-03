import fs from 'node:fs/promises'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib'

import { JSDOM } from 'jsdom'
import puppeteer from 'puppeteer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(__dirname, '..')
const outputRoot = path.join(workspaceRoot, 'output')
const publicRoot = path.join(workspaceRoot, 'public', 'brand-appart')
const publicBackupRoot = path.join(workspaceRoot, 'public', '.brand-appart-backup')
const pagesRoot = path.join(publicRoot, 'pages')
const filloutRoot = path.join(publicRoot, 'fillout')

const brandOrigin = 'https://www.brandappart.com'
const mirrorPrefix = '/brand-appart'
const requestUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const staticRoutes = ['/', '/contact', '/404']
const filloutForms = [
  {
    key: 'start',
    pagePath: '/start-a-project',
    title: 'Start a project form',
    publicIdentifier: 'qNsQCVptrius',
  },
  {
    key: 'join',
    pagePath: '/join-us',
    title: 'Join us form',
    publicIdentifier: 'wC2ErM9KNAus',
  },
]

const runtimePaths = {
  sharedCssPath: `${mirrorPrefix}/assets/css/brand-appart-shared.css`,
  googleFontsPath: `${mirrorPrefix}/assets/css/google-fonts.css`,
  jqueryPath: `${mirrorPrefix}/assets/js/jquery.js`,
  webflowPath: `${mirrorPrefix}/assets/js/webflow.js`,
  mainScriptPath: `${mirrorPrefix}/assets/js/brand-appart-main.js`,
}

const sharedRuntimeSources = {
  jquery:
    'https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=67f67951d8f019dd5e6578a7',
  webflow:
    'https://cdn.prod.website-files.com/67f67951d8f019dd5e6578a7/js/webflow.e291d130.2a959e4c7fdf2209.js',
  mainScript: 'https://webflow-brand-appart.netlify.app/main.js',
  googleFontsCss:
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;600;700&display=swap',
}

const fallbackSourceFiles = {
  sharedCss: path.join(outputRoot, 'brandappart-shared.css'),
  mainScript: path.join(outputRoot, 'brandappart-main.js'),
  filloutBodies: {
    start: path.join(outputRoot, 'start.fillout.body.html'),
    join: path.join(outputRoot, 'join.fillout.body.html'),
  },
}

const assetUrlMap = new Map()
const vimeoAssetMap = new Map()
const filloutMirrorPathByPage = new Map()
const REMOTE_REQUEST_TIMEOUT_MS = 120000
const REMOTE_REQUEST_RETRIES = 3

function log(message) {
  process.stdout.write(`${message}\n`)
}

function hashValue(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 12)
}

function toPageBodyPath(routePath) {
  if (routePath === '/') {
    return `${mirrorPrefix}/pages/index.html`
  }

  if (routePath === '/404') {
    return `${mirrorPrefix}/pages/404.html`
  }

  return `${mirrorPrefix}/pages${routePath}.html`
}

function toPageFilePath(routePath) {
  if (routePath === '/') {
    return path.join(pagesRoot, 'index.html')
  }

  if (routePath === '/404') {
    return path.join(pagesRoot, '404.html')
  }

  return path.join(pagesRoot, `${routePath.slice(1)}.html`)
}

function normalizeRoutePath(rawUrl) {
  const url = new URL(rawUrl, brandOrigin)
  const normalized = url.pathname === '' ? '/' : url.pathname.replace(/\/$/, '') || '/'
  return normalized
}

function guessExtensionFromContentType(contentType = '') {
  const normalized = contentType.split(';')[0].trim().toLowerCase()
  switch (normalized) {
    case 'image/avif':
      return '.avif'
    case 'image/webp':
      return '.webp'
    case 'image/png':
      return '.png'
    case 'image/jpeg':
      return '.jpg'
    case 'image/svg+xml':
      return '.svg'
    case 'image/gif':
      return '.gif'
    case 'video/mp4':
      return '.mp4'
    case 'video/webm':
      return '.webm'
    case 'font/woff2':
      return '.woff2'
    case 'font/woff':
      return '.woff'
    case 'application/font-woff2':
      return '.woff2'
    case 'application/font-woff':
      return '.woff'
    case 'text/css':
      return '.css'
    case 'application/javascript':
    case 'text/javascript':
      return '.js'
    case 'application/json':
      return '.json'
    default:
      return ''
  }
}

function categoryForExtension(extension) {
  const ext = extension.toLowerCase()
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico'].includes(ext)) {
    return 'images'
  }

  if (['.mp4', '.webm', '.mov', '.m4v', '.m3u8'].includes(ext)) {
    return 'media'
  }

  if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
    return 'fonts'
  }

  if (ext === '.css') {
    return 'css'
  }

  if (ext === '.js') {
    return 'js'
  }

  return 'misc'
}

function sanitizeBaseName(baseName) {
  const normalized = decodeURIComponent(baseName)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || 'asset'
}

function buildAssetLocalPath(urlString, contentType = '', explicitRelativePath) {
  if (explicitRelativePath) {
    return {
      webPath: `${mirrorPrefix}/${explicitRelativePath.replace(/\\/g, '/')}`,
      filePath: path.join(publicRoot, explicitRelativePath),
    }
  }

  const url = new URL(urlString)
  const digest = hashValue(url.toString())
  const extension =
    path.posix.extname(url.pathname) || guessExtensionFromContentType(contentType) || '.bin'
  const baseName = sanitizeBaseName(path.posix.basename(url.pathname, path.posix.extname(url.pathname)))
  const fileName = `${digest}-${baseName}${extension}`
  const category = categoryForExtension(extension)
  const relativePath = path.posix.join('assets', category, fileName)

  return {
    webPath: `${mirrorPrefix}/${relativePath}`,
    filePath: path.join(publicRoot, relativePath),
  }
}

function decodeResponseBuffer(buffer, contentEncoding = '') {
  const normalized = contentEncoding.toLowerCase()

  if (normalized.includes('br')) {
    return brotliDecompressSync(buffer)
  }

  if (normalized.includes('gzip')) {
    return gunzipSync(buffer)
  }

  if (normalized.includes('deflate')) {
    return inflateSync(buffer)
  }

  return buffer
}

async function requestRemoteBuffer(urlString, redirectCount = 0, attempt = 1) {
  if (redirectCount > 10) {
    throw new Error(`Too many redirects while requesting ${urlString}`)
  }

  const url = new URL(urlString)
  const client = url.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      {
        method: 'GET',
        headers: {
          'accept-encoding': 'gzip, deflate, br',
          'user-agent': requestUserAgent,
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        },
      },
      async (response) => {
        const { statusCode = 0, headers } = response

        if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location) {
          response.resume()
          try {
            const redirected = await requestRemoteBuffer(
              new URL(headers.location, url).toString(),
              redirectCount + 1,
              attempt
            )
            resolve(redirected)
          } catch (error) {
            reject(error)
          }
          return
        }

        const chunks = []

        response.on('data', (chunk) => {
          chunks.push(chunk)
        })

        response.on('end', () => {
          try {
            const rawBuffer = Buffer.concat(chunks)
            const decodedBuffer = decodeResponseBuffer(rawBuffer, String(headers['content-encoding'] || ''))
            resolve({
              buffer: decodedBuffer,
              statusCode,
              headers,
              finalUrl: url.toString(),
            })
          } catch (error) {
            reject(error)
          }
        })

        response.on('error', reject)
      }
    )

    request.setTimeout(REMOTE_REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`Timed out while requesting ${urlString}`))
    })

    request.on('error', reject)
    request.end()
  }).catch(async (error) => {
    if (attempt >= REMOTE_REQUEST_RETRIES || redirectCount > 0) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    log(`Retrying ${urlString} (${attempt}/${REMOTE_REQUEST_RETRIES}) after error: ${errorMessage}`)
    return requestRemoteBuffer(urlString, redirectCount, attempt + 1)
  })
}

async function requestRemoteText(urlString) {
  const response = await requestRemoteBuffer(urlString)
  return {
    ...response,
    text: response.buffer.toString('utf8'),
  }
}

async function ensureDirectory(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function webPathToFilePath(webPath) {
  if (!webPath.startsWith(`${mirrorPrefix}/`)) {
    return null
  }

  const relativePath = webPath.slice(mirrorPrefix.length + 1).replace(/\//g, path.sep)
  return path.join(publicRoot, relativePath)
}

async function writeTextFile(filePath, value) {
  await ensureDirectory(filePath)
  await fs.writeFile(filePath, value, 'utf8')
}

async function writeBinaryFile(filePath, value) {
  await ensureDirectory(filePath)
  await fs.writeFile(filePath, value)
}

function toMirrorWebPath(relativePath) {
  return `${mirrorPrefix}/${relativePath.replace(/\\/g, '/')}`
}

async function writeFallbackTextAsset(explicitRelativePath, rawText, options = {}) {
  const { cssSourceUrl, jsSourceUrl } = options
  let rewrittenText = rawText

  if (cssSourceUrl) {
    rewrittenText = await rewriteCssUrls(rewrittenText, cssSourceUrl)
  }

  if (jsSourceUrl) {
    rewrittenText = rewriteRuntimeScript(rewrittenText, jsSourceUrl)
  }

  await writeTextFile(path.join(publicRoot, explicitRelativePath), rewrittenText)
  return toMirrorWebPath(explicitRelativePath)
}

function buildGoogleFontsFallbackCss() {
  return `/* Fallback local font declarations when Google Fonts is unavailable. */
@font-face {
  font-family: 'IBM Plex Mono';
  src:
    local('IBM Plex Mono'),
    local('IBM PlexMono'),
    local('IBM Plex Mono Text');
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
}

@font-face {
  font-family: 'Roboto';
  src:
    local('Roboto'),
    local('Roboto Regular'),
    local('Roboto Light'),
    local('Roboto Medium'),
    local('Roboto Bold');
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
}
`
}

async function mirrorTextAssetWithFallback(primaryUrl, options) {
  const {
    explicitRelativePath,
    sourceUrl,
    fallbackFilePath,
    fallbackText,
    cssSourceUrl,
    jsSourceUrl,
  } = options

  try {
    return await mirrorRemoteAsset(primaryUrl, {
      sourceUrl,
      explicitRelativePath,
      treatAsText: true,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (fallbackFilePath && (await pathExists(fallbackFilePath))) {
      log(
        `Falling back to ${path.relative(workspaceRoot, fallbackFilePath)} for ${primaryUrl}: ${errorMessage}`
      )
      const rawText = await fs.readFile(fallbackFilePath, 'utf8')
      return writeFallbackTextAsset(explicitRelativePath, rawText, {
        cssSourceUrl,
        jsSourceUrl,
      })
    }

    if (typeof fallbackText === 'string') {
      log(`Writing generated fallback for ${primaryUrl}: ${errorMessage}`)
      return writeFallbackTextAsset(explicitRelativePath, fallbackText, {
        cssSourceUrl,
        jsSourceUrl,
      })
    }

    throw error
  }
}

async function replaceAsync(input, matcher, replacer) {
  const pieces = []
  let previousIndex = 0

  for (const match of input.matchAll(matcher)) {
    const [fullMatch] = match
    const index = match.index ?? 0
    pieces.push(input.slice(previousIndex, index))
    pieces.push(await replacer(...match))
    previousIndex = index + fullMatch.length
  }

  pieces.push(input.slice(previousIndex))
  return pieces.join('')
}

function isDataLikeUrl(value) {
  return (
    !value ||
    value.startsWith('data:') ||
    value.startsWith('javascript:') ||
    value.startsWith('#') ||
    value.startsWith('blob:')
  )
}

function shouldDropRemoteUrl(urlString, sourceUrl = brandOrigin) {
  if (!urlString || isDataLikeUrl(urlString)) {
    return false
  }

  const url = new URL(urlString, sourceUrl)
  const host = url.hostname.toLowerCase()
  const pathname = url.pathname.toLowerCase()

  if (host.includes('googletagmanager.com') || host.includes('google-analytics.com')) {
    return true
  }

  if (host.includes('posthog') || host.includes('visitors.now') || host.includes('citeme.io')) {
    return true
  }

  if (host.includes('intellimize.co')) {
    return true
  }

  if (pathname.includes('/api/beacon/')) {
    return true
  }

  if (pathname.includes('/plugins/basic/assets/placeholder')) {
    return true
  }

  return false
}

async function mirrorRemoteAsset(urlString, options = {}) {
  const { sourceUrl, explicitRelativePath, treatAsText = false } = options

  if (!urlString || isDataLikeUrl(urlString)) {
    return urlString
  }

  const absoluteUrl = new URL(urlString, sourceUrl || brandOrigin).toString()

  if (absoluteUrl.startsWith(mirrorPrefix) || absoluteUrl.startsWith('file:')) {
    return absoluteUrl
  }

  if (shouldDropRemoteUrl(absoluteUrl, sourceUrl)) {
    return ''
  }

  const cached = assetUrlMap.get(absoluteUrl)
  if (cached) {
    if (explicitRelativePath) {
      const explicitTarget = buildAssetLocalPath(absoluteUrl, '', explicitRelativePath)
      if (cached !== explicitTarget.webPath) {
        const cachedFilePath = webPathToFilePath(cached)
        if (cachedFilePath) {
          await ensureDirectory(explicitTarget.filePath)
          await fs.copyFile(cachedFilePath, explicitTarget.filePath)
        }
      }

      return explicitTarget.webPath
    }

    return cached
  }

  const response = await requestRemoteBuffer(absoluteUrl)
  if (response.statusCode >= 400) {
    throw new Error(`Unable to mirror asset ${absoluteUrl}: ${response.statusCode}`)
  }

  const contentType = String(response.headers['content-type'] || '')
  const { webPath, filePath } = buildAssetLocalPath(absoluteUrl, contentType, explicitRelativePath)

  assetUrlMap.set(absoluteUrl, webPath)

  if (treatAsText || contentType.startsWith('text/') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
    const rawText = response.buffer.toString('utf8')
    let rewrittenText = rawText

    if (filePath.endsWith('.css')) {
      rewrittenText = await rewriteCssUrls(rewrittenText, absoluteUrl)
    }

    if (filePath.endsWith('.js')) {
      rewrittenText = rewriteRuntimeScript(rewrittenText, absoluteUrl)
    }

    await writeTextFile(filePath, rewrittenText)
    return webPath
  }

  await writeBinaryFile(filePath, response.buffer)
  return webPath
}

async function rewriteCssUrls(cssText, sourceUrl) {
  let rewritten = await replaceAsync(cssText, /url\((['"]?)([^'")]+)\1\)/gi, async (match, quote, rawValue) => {
    if (isDataLikeUrl(rawValue)) {
      return match
    }

    const localPath = await mirrorRemoteAsset(rawValue, { sourceUrl })
    return `url(${quote}${localPath}${quote})`
  })

  rewritten = await replaceAsync(
    rewritten,
    /@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?/gi,
    async (match, rawValue) => {
      if (isDataLikeUrl(rawValue)) {
        return match
      }

      const localPath = await mirrorRemoteAsset(rawValue, { sourceUrl, treatAsText: true })
      return match.replace(rawValue, localPath)
    }
  )

  return rewritten
}

async function rewriteSrcset(rawValue, sourceUrl) {
  const candidates = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const rewritten = []

  for (const candidate of candidates) {
    const [rawUrl, descriptor] = candidate.split(/\s+/, 2)

    if (isDataLikeUrl(rawUrl)) {
      rewritten.push(candidate)
      continue
    }

    const localPath = await mirrorRemoteAsset(rawUrl, { sourceUrl })
    rewritten.push(descriptor ? `${localPath} ${descriptor}` : localPath)
  }

  return rewritten.join(', ')
}

function rewriteInternalHref(rawHref) {
  if (!rawHref || isDataLikeUrl(rawHref) || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
    return rawHref
  }

  const url = new URL(rawHref, brandOrigin)

  if (url.origin !== brandOrigin) {
    return rawHref
  }

  return `${url.pathname}${url.search}${url.hash}`
}

function removeCommentNodes(root) {
  for (const node of [...root.childNodes]) {
    if (node.nodeType === 8) {
      node.remove()
      continue
    }

    removeCommentNodes(node)
  }
}

function rewriteRuntimeScript(rawText, absoluteUrl) {
  if (!absoluteUrl.includes('/js/webflow')) {
    return rawText
  }

  return rawText.replace(
    'import("https://cdn.jsdelivr.net/npm/@splinetool/runtime/build/runtime.js").then(function(e){return e})',
    'Promise.resolve({}).then(function(e){return e})'
  )
}

async function rewriteDomResources(root, sourceUrl) {
  removeCommentNodes(root)
  const allElements = root.querySelectorAll('*')

  for (const element of allElements) {
    if (element.tagName === 'STYLE') {
      if (element.textContent) {
        element.textContent = await rewriteCssUrls(element.textContent, sourceUrl)
      }
      continue
    }

    if (element.hasAttribute('style')) {
      const styleValue = element.getAttribute('style')
      if (styleValue) {
        element.setAttribute('style', await rewriteCssUrls(styleValue, sourceUrl))
      }
    }

    if (element.tagName === 'A') {
      const href = element.getAttribute('href')
      if (href) {
        element.setAttribute('href', rewriteInternalHref(href))
      }
      continue
    }

    for (const attrName of ['src', 'poster']) {
      const value = element.getAttribute(attrName)
      if (!value) {
        continue
      }

      if (value.startsWith(mirrorPrefix)) {
        continue
      }

      if (shouldDropRemoteUrl(value, sourceUrl)) {
        if (attrName === 'src') {
          element.remove()
          break
        }

        element.removeAttribute(attrName)
        continue
      }

      const localValue = await mirrorRemoteAsset(value, { sourceUrl })
      if (!localValue) {
        element.removeAttribute(attrName)
      } else {
        element.setAttribute(attrName, localValue)
      }
    }

    if (!element.isConnected) {
      continue
    }

    for (const attrName of ['data-src', 'data-poster']) {
      const value = element.getAttribute(attrName)
      if (!value) {
        continue
      }

      if (value.startsWith(mirrorPrefix)) {
        continue
      }

      if (shouldDropRemoteUrl(value, sourceUrl)) {
        element.removeAttribute(attrName)
        continue
      }

      const localValue = await mirrorRemoteAsset(value, { sourceUrl })
      if (!localValue) {
        element.removeAttribute(attrName)
      } else {
        element.setAttribute(attrName, localValue)
      }
    }

    for (const attrName of ['srcset', 'data-srcset']) {
      const srcset = element.getAttribute(attrName)
      if (srcset) {
        if (srcset.includes(mirrorPrefix)) {
          continue
        }

        element.setAttribute(attrName, await rewriteSrcset(srcset, sourceUrl))
      }
    }

    if (element.tagName === 'LINK') {
      const rel = (element.getAttribute('rel') || '').toLowerCase()
      const href = element.getAttribute('href')
      if (!href) {
        continue
      }

      if (rel.includes('icon')) {
        element.setAttribute('href', await mirrorRemoteAsset(href, { sourceUrl }))
      }
      continue
    }

    if (element.tagName === 'IMG' && element.getAttribute('src') === '') {
      element.remove()
    }
  }
}

async function rewriteJsonLdValue(value, sourceUrl) {
  if (Array.isArray(value)) {
    const rewritten = []
    for (const item of value) {
      rewritten.push(await rewriteJsonLdValue(item, sourceUrl))
    }
    return rewritten
  }

  if (value && typeof value === 'object') {
    const rewrittenEntries = await Promise.all(
      Object.entries(value).map(async ([key, nestedValue]) => [key, await rewriteJsonLdValue(nestedValue, sourceUrl)])
    )
    return Object.fromEntries(rewrittenEntries)
  }

  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  if (!trimmed || isDataLikeUrl(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return value
  }

  try {
    const candidateUrl = new URL(trimmed, sourceUrl)
    if (
      candidateUrl.pathname.match(/\.(avif|webp|png|jpe?g|gif|svg|mp4|webm|woff2?|ttf|otf)$/i) &&
      (candidateUrl.origin === brandOrigin ||
        candidateUrl.hostname.includes('website-files.com') ||
        candidateUrl.hostname.includes('fillout.com'))
    ) {
      return await mirrorRemoteAsset(trimmed, { sourceUrl })
    }
  } catch {
    // Ignore non-URL structured data fields.
  }

  return value
}

async function rewriteJsonLdPayload(payload, sourceUrl) {
  try {
    const parsed = JSON.parse(payload)
    const rewritten = await rewriteJsonLdValue(parsed, sourceUrl)
    return JSON.stringify(rewritten, null, 2)
  } catch {
    return payload
  }
}

async function fetchVimeoConfig(videoId) {
  const cached = vimeoAssetMap.get(videoId)
  if (cached) {
    return cached
  }

  const pageResponse = await requestRemoteText(`https://vimeo.com/${videoId}`)
  if (pageResponse.statusCode >= 400) {
    throw new Error(`Unable to fetch Vimeo page for ${videoId}: ${pageResponse.statusCode}`)
  }

  const pageDom = new JSDOM(pageResponse.text)
  const pageDocument = pageDom.window.document
  const posterMeta =
    pageDocument.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
  const embedMeta =
    pageDocument.querySelector('meta[property="og:video:url"]')?.getAttribute('content') || ''
  const widthMeta = Number(pageDocument.querySelector('meta[property="og:video:width"]')?.getAttribute('content') || 16)
  const heightMeta = Number(pageDocument.querySelector('meta[property="og:video:height"]')?.getAttribute('content') || 9)

  let localVideoPath = ''
  let localPosterPath = ''

  if (posterMeta) {
    localPosterPath = await mirrorRemoteAsset(posterMeta, {
      explicitRelativePath: path.posix.join(
        'assets',
        'images',
        `vimeo-${videoId}-poster${path.extname(new URL(posterMeta).pathname) || '.jpg'}`
      ),
    })
  }

  try {
    const configResponse = await requestRemoteText(`https://player.vimeo.com/video/${videoId}/config`)
    if (configResponse.statusCode < 400) {
      const config = JSON.parse(configResponse.text)
      const progressive = [...(config.request?.files?.progressive || [])]

      if (progressive.length > 0) {
        progressive.sort((left, right) => left.width - right.width)

        const preferred =
          progressive.find((item) => item.width >= 720 && item.width <= 1080) ||
          [...progressive].reverse().find((item) => item.width <= 720) ||
          progressive[progressive.length - 1]

        localVideoPath = await mirrorRemoteAsset(preferred.url, {
          explicitRelativePath: path.posix.join('assets', 'media', `vimeo-${videoId}.mp4`),
        })
      }

      if (!localPosterPath) {
        const configPosterUrl =
          config.video?.thumbs?.base ||
          config.video?.thumbs?.['1280'] ||
          config.video?.thumbnail ||
          config.video?.pictures?.sizes?.[config.video.pictures.sizes.length - 1]?.link

        if (configPosterUrl) {
          localPosterPath = await mirrorRemoteAsset(configPosterUrl, {
            explicitRelativePath: path.posix.join(
              'assets',
              'images',
              `vimeo-${videoId}-poster${path.extname(new URL(configPosterUrl).pathname) || '.jpg'}`
            ),
          })
        }
      }
    }
  } catch (error) {
    log(`  warning: unable to fetch Vimeo config for ${videoId}, falling back to poster (${String(error)})`)
  }

  if (!localVideoPath && !localPosterPath && embedMeta) {
    const embedUrl = new URL(embedMeta)
    const hashValueFromUrl = embedUrl.searchParams.get('h')
    if (hashValueFromUrl) {
      log(`  warning: Vimeo ${videoId} stayed poster-only because protected source requires signed playback`)
    }
  }

  const payload = {
    src: localVideoPath,
    poster: localPosterPath,
    width: widthMeta || 16,
    height: heightMeta || 9,
  }

  vimeoAssetMap.set(videoId, payload)
  return payload
}

async function replaceVimeoLoops(document, pagePath) {
  const loops = [...document.querySelectorAll('c-vimeo-loop')]

  for (const loop of loops) {
    const videoId = (loop.getAttribute('data-vimeo-id') || '').trim()

    if (!videoId) {
      loop.remove()
      continue
    }

    log(`  localizing Vimeo ${videoId} for ${pagePath}`)
    const videoAsset = await fetchVimeoConfig(videoId)
    const wrapper = document.createElement('div')
    wrapper.className = `brand-local-vimeo-loop ${loop.getAttribute('class') || ''}`.trim()
    wrapper.setAttribute('data-brand-local-vimeo-id', videoId)
    wrapper.style.setProperty('--ratio', `${videoAsset.width / videoAsset.height}`)

    if (videoAsset.src) {
      const video = document.createElement('video')
      video.className = 'u-cover'
      video.autoplay = true
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.preload = 'metadata'

      if (videoAsset.poster) {
        video.poster = videoAsset.poster
      }

      const source = document.createElement('source')
      source.src = videoAsset.src
      source.type = 'video/mp4'
      video.append(source)
      wrapper.append(video)
    } else if (videoAsset.poster) {
      const image = document.createElement('img')
      image.className = 'u-cover'
      image.src = videoAsset.poster
      image.alt = ''
      wrapper.append(image)
      wrapper.classList.add('is-poster-only')
    } else {
      loop.remove()
      continue
    }

    loop.replaceWith(wrapper)
  }
}

async function extractHeadMeta(document, pageUrl) {
  const metas = []
  const links = []
  const jsonLd = []

  for (const child of [...document.head.children]) {
    const tagName = child.tagName.toLowerCase()

    if (tagName === 'meta') {
      const attributes = Object.fromEntries([...child.attributes].map((attr) => [attr.name, attr.value]))
      if ('charset' in attributes) {
        continue
      }

      if ((attributes.name || '').toLowerCase() === 'viewport') {
        continue
      }

      const metaKey = (attributes.name || attributes.property || '').toLowerCase()
      if (
        attributes.content &&
        (metaKey.includes('image') || metaKey.includes('video')) &&
        !attributes.content.startsWith('data:')
      ) {
        try {
          const candidateUrl = new URL(attributes.content, pageUrl)
          if (candidateUrl.pathname.match(/\.(avif|webp|png|jpe?g|gif|svg|mp4|webm)$/i)) {
            attributes.content = await mirrorRemoteAsset(attributes.content, { sourceUrl: pageUrl })
          }
        } catch {
          // Ignore non-URL meta content.
        }
      }

      metas.push(attributes)
      continue
    }

    if (tagName === 'link') {
      const attributes = Object.fromEntries([...child.attributes].map((attr) => [attr.name, attr.value]))
      const rel = (attributes.rel || '').toLowerCase()

      if (rel === 'stylesheet' || rel === 'preconnect' || rel === 'dns-prefetch') {
        continue
      }

      if (rel.includes('icon') && attributes.href) {
        attributes.href = await mirrorRemoteAsset(attributes.href, { sourceUrl: pageUrl })
      }

      links.push(attributes)
      continue
    }

    if (tagName === 'script' && child.getAttribute('type') === 'application/ld+json') {
      const payload = child.textContent?.trim()
      if (payload) {
        jsonLd.push(await rewriteJsonLdPayload(payload, pageUrl))
      }
    }
  }

  return {
    title: document.title,
    metas,
    links,
    jsonLd,
  }
}

function extractHtmlAttributes(document) {
  return Object.fromEntries(
    [...document.documentElement.attributes]
      .filter((attr) => attr.name !== 'lang' && attr.name !== 'data-wf-intellimize-customer-id')
      .map((attr) => [attr.name, attr.value])
  )
}

function formBehaviorForPage(pagePath) {
  if (pagePath === '/contact') {
    return {
      mode: 'route-only',
      successPath: '/thank-you',
    }
  }

  if (pagePath === '/start-a-project' || pagePath === '/join-us') {
    return {
      mode: 'local-success',
      successPath: '/thank-you',
    }
  }

  return {
    mode: 'none',
  }
}

async function mirrorFilloutPages() {
  log('Mirroring embedded Fillout forms')

  const browser = await puppeteer.launch({ headless: true })

  try {
    for (const form of filloutForms) {
      const url = `https://form.designelite.co/t/${form.publicIdentifier}`
      const response = await requestRemoteText(url)
      const dom = new JSDOM(response.text)
      const document = dom.window.document

      const stylesheetHrefs = [...document.querySelectorAll('link[rel="stylesheet"][href]')]
        .map((node) => node.getAttribute('href'))
        .filter(Boolean)

      const localStylesheets = []
      for (const href of stylesheetHrefs) {
        localStylesheets.push(await mirrorRemoteAsset(href, { sourceUrl: url, treatAsText: true }))
      }

      let capturedHtml = ''
      let page = null

      try {
        page = await browser.newPage()
        await page.setViewport({ width: 1440, height: 1400, deviceScaleFactor: 1 })
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
        await page.waitForSelector('button', { timeout: 120000 })
        await page.waitForFunction(() => document.body.innerText.length > 200, { timeout: 120000 })

        capturedHtml = await page.evaluate(() => {
          document.querySelectorAll('noscript, #portal, section[aria-label^="Notifications"]').forEach((node) => {
            node.remove()
          })
          return document.getElementById('__next')?.innerHTML || document.body.innerHTML
        })
      } catch (error) {
        const fallbackBodyPath = fallbackSourceFiles.filloutBodies[form.key]
        if (!(await pathExists(fallbackBodyPath))) {
          throw error
        }

        const errorMessage = error instanceof Error ? error.message : String(error)
        log(`Using saved Fillout snapshot for ${form.key}: ${errorMessage}`)
        capturedHtml = await fs.readFile(fallbackBodyPath, 'utf8')
      } finally {
        if (page) {
          await page.close()
        }
      }

      const snapshotDom = new JSDOM(`<!doctype html><html><body><div id="__next">${capturedHtml}</div></body></html>`)
      const snapshotRoot = snapshotDom.window.document.getElementById('__next')
      if (!snapshotRoot) {
        throw new Error(`Unable to capture Fillout root for ${form.key}`)
      }

      await rewriteDomResources(snapshotRoot, url)

      const localFilloutPagePath = path.join(filloutRoot, form.key, 'index.html')
      const localFilloutPageWebPath = `${mirrorPrefix}/fillout/${form.key}/index.html`

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${form.title}</title>
${localStylesheets.map((href) => `    <link rel="stylesheet" href="${href}" />`).join('\n')}
    <style>
      html,
      body {
        margin: 0;
        min-height: 100%;
        background: #3d2fa9;
      }

      body {
        overflow: hidden;
      }

      button {
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div id="__next">${snapshotRoot.innerHTML}</div>
    <script>
      (() => {
        const formKey = ${JSON.stringify(form.key)}
        const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
          /send message/i.test(button.textContent || '')
        )

        const notifyParent = (type, extra = {}) => {
          if (!window.parent || window.parent === window) {
            return
          }

          window.parent.postMessage({ type, form: formKey, ...extra }, window.location.origin)
        }

        const updateHeight = () => {
          notifyParent('brand-appart-fillout-resize', {
            height: document.documentElement.scrollHeight,
          })
        }

        submitButton?.addEventListener('click', (event) => {
          event.preventDefault()
          notifyParent('brand-appart-fillout-submit')
        })

        window.addEventListener('load', updateHeight)
        window.addEventListener('resize', updateHeight)
        new ResizeObserver(updateHeight).observe(document.body)
        updateHeight()
      })()
    </script>
  </body>
</html>
`

      await writeTextFile(localFilloutPagePath, html)
      filloutMirrorPathByPage.set(form.pagePath, localFilloutPageWebPath)
    }
  } finally {
    await browser.close()
  }
}

async function prepareRuntimeAssets(homeDocument) {
  const stylesheetNode = homeDocument.querySelector('link[rel="stylesheet"][href*="webflow.shared"]')
  if (!stylesheetNode) {
    throw new Error('Unable to locate Brand Appart shared stylesheet URL')
  }

  const faviconNode = homeDocument.querySelector('link[rel="shortcut icon"][href]')
  const ogImageNode = homeDocument.querySelector('meta[property="og:image"][content]')

  const stylesheetHref = stylesheetNode.getAttribute('href')

  await mirrorTextAssetWithFallback(stylesheetHref, {
    sourceUrl: brandOrigin,
    explicitRelativePath: path.posix.join('assets', 'css', 'brand-appart-shared.css'),
    fallbackFilePath: fallbackSourceFiles.sharedCss,
    cssSourceUrl: stylesheetHref,
  })

  await mirrorTextAssetWithFallback(sharedRuntimeSources.googleFontsCss, {
    explicitRelativePath: path.posix.join('assets', 'css', 'google-fonts.css'),
    fallbackText: buildGoogleFontsFallbackCss(),
  })

  await mirrorRemoteAsset(sharedRuntimeSources.jquery, {
    explicitRelativePath: path.posix.join('assets', 'js', 'jquery.js'),
    treatAsText: true,
  })

  await mirrorRemoteAsset(sharedRuntimeSources.webflow, {
    explicitRelativePath: path.posix.join('assets', 'js', 'webflow.js'),
    treatAsText: true,
  })

  await mirrorTextAssetWithFallback(sharedRuntimeSources.mainScript, {
    explicitRelativePath: path.posix.join('assets', 'js', 'brand-appart-main.js'),
    fallbackFilePath: fallbackSourceFiles.mainScript,
    jsSourceUrl: sharedRuntimeSources.mainScript,
  })

  if (faviconNode?.getAttribute('href')) {
    await mirrorRemoteAsset(faviconNode.getAttribute('href'), {
      sourceUrl: brandOrigin,
      explicitRelativePath: path.posix.join('assets', 'images', 'favicon.png'),
    })
  }

  if (ogImageNode?.getAttribute('content')) {
    await mirrorRemoteAsset(ogImageNode.getAttribute('content'), {
      sourceUrl: brandOrigin,
      explicitRelativePath: path.posix.join('assets', 'images', 'og-image.avif'),
    })
  }
}

function discoverLinkedWorkPaths(document) {
  const discovered = new Set()

  for (const anchor of document.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href')
    if (!href) {
      continue
    }

    const normalized = rewriteInternalHref(href)
    if (normalized.startsWith('/work/')) {
      discovered.add(normalized.split(/[?#]/, 1)[0])
    }
  }

  return [...discovered]
}

async function rewritePageDocument(document, pagePath) {
  removeCommentNodes(document.documentElement)

  document.querySelectorAll('script').forEach((node) => {
    const src = node.getAttribute('src') || ''
    const text = node.textContent || ''

    if (
      src ||
      text.includes('googletagmanager') ||
      text.includes('posthog') ||
      text.includes('visitors.now') ||
      text.includes('citeme') ||
      text.includes('intellimize') ||
      text.includes('webflow-brand-appart.netlify.app') ||
      text.includes('http://localhost:3000')
    ) {
      node.remove()
      return
    }

    node.remove()
  })
  document.querySelectorAll('noscript').forEach((node) => {
    node.remove()
  })
  document.querySelectorAll('iframe#tag-manager, iframe[src*="googletagmanager"], iframe[src*="turnstile"]').forEach(
    (node) => node.remove()
  )

  if (pagePath === '/start-a-project' || pagePath === '/join-us') {
    const wrapper = document.querySelector('.form-block-wrapper')
    const iframePath = filloutMirrorPathByPage.get(pagePath)

    if (wrapper && iframePath) {
      wrapper.classList.remove('w-script')
      wrapper.innerHTML = ''
      const iframe = document.createElement('iframe')
      iframe.className = 'brand-fillout-frame'
      iframe.setAttribute('data-brand-fillout', pagePath === '/start-a-project' ? 'start' : 'join')
      iframe.setAttribute('src', iframePath)
      iframe.setAttribute('title', pagePath === '/start-a-project' ? 'Start a project form' : 'Join us form')
      iframe.setAttribute('loading', 'lazy')
      iframe.setAttribute('scrolling', 'no')
      wrapper.append(iframe)
    }
  }

  await replaceVimeoLoops(document, pagePath)
  await rewriteDomResources(document.body, `${brandOrigin}${pagePath === '/' ? '' : pagePath}`)
}

async function collectMirrorPages() {
  const sitemapResponse = await requestRemoteText(`${brandOrigin}/sitemap.xml`)
  const sitemapRoutes = [...sitemapResponse.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    normalizeRoutePath(match[1])
  )

  const queue = [...new Set([...staticRoutes, ...sitemapRoutes])]
  const queued = new Set(queue)
  const pages = []
  let homeDocument = null

  while (queue.length > 0) {
    const pagePath = queue.shift()
    if (!pagePath) {
      continue
    }

    log(`Mirroring ${pagePath}`)
    const pageUrl = `${brandOrigin}${pagePath === '/' ? '' : pagePath}`
    const response = await requestRemoteText(pageUrl)
    const dom = new JSDOM(response.text)
    const { document } = dom.window

    if (pagePath === '/') {
      homeDocument = document.cloneNode(true)
    }

    if (!homeDocument && pagePath !== '/') {
      const homeResponse = await requestRemoteText(brandOrigin)
      homeDocument = new JSDOM(homeResponse.text).window.document
    }

    const head = await extractHeadMeta(document, pageUrl)
    await rewritePageDocument(document, pagePath)

    const linkedWorkPaths = discoverLinkedWorkPaths(document)
    for (const linkedPath of linkedWorkPaths) {
      if (!queued.has(linkedPath)) {
        queued.add(linkedPath)
        queue.push(linkedPath)
      }
    }

    const htmlAttributes = extractHtmlAttributes(document)
    const htmlLang = document.documentElement.lang || 'en'
    const bodyMarkup = document.body.innerHTML.trim()
    const bodyFilePath = toPageFilePath(pagePath)
    await writeTextFile(bodyFilePath, bodyMarkup)

    pages.push({
      path: pagePath,
      bodyPath: toPageBodyPath(pagePath),
      status: pagePath === '/404' ? 404 : 200,
      htmlLang,
      htmlAttributes,
      head,
      formBehavior: formBehaviorForPage(pagePath),
    })
  }

  if (!homeDocument) {
    throw new Error('Unable to resolve Brand Appart home document')
  }

  return {
    pages,
    homeDocument,
    sitemapRoutes,
  }
}

async function cleanPublicMirror() {
  await fs.rm(publicRoot, { recursive: true, force: true })
  await fs.mkdir(publicRoot, { recursive: true })
}

async function preparePublicMirrorWorkspace() {
  await fs.rm(publicBackupRoot, { recursive: true, force: true })

  if (await pathExists(publicRoot)) {
    await fs.cp(publicRoot, publicBackupRoot, { recursive: true, force: true })
  }

  await cleanPublicMirror()
}

async function restorePublicMirrorWorkspace() {
  await fs.rm(publicRoot, { recursive: true, force: true })

  if (await pathExists(publicBackupRoot)) {
    await fs.cp(publicBackupRoot, publicRoot, { recursive: true, force: true })
  }
}

async function finalizePublicMirrorWorkspace() {
  await fs.rm(publicBackupRoot, { recursive: true, force: true })
}

async function writeManifest(pages) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    runtime: runtimePaths,
    pages: pages.sort((left, right) => left.path.localeCompare(right.path)),
  }

  await writeTextFile(
    path.join(publicRoot, 'mirror-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  )
}

async function writePublicSitemap(sitemapRoutes) {
  const urlEntries = sitemapRoutes
    .filter((routePath) => routePath !== '/404')
    .map((routePath) => {
      const normalized = routePath === '/' ? '' : routePath
      return `  <url>\n    <loc>${brandOrigin}${normalized}</loc>\n  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`
  await writeTextFile(path.join(workspaceRoot, 'public', 'sitemap.xml'), xml)
}

async function writeRobotsFile() {
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${brandOrigin}/sitemap.xml\n`
  await writeTextFile(path.join(workspaceRoot, 'public', 'robots.txt'), robots)
}

async function writeWebManifest() {
  const manifest = {
    name: 'Brand Appart',
    short_name: 'Brand Appart',
    description: 'Brand Appart live site local mirror.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf9ef',
    theme_color: '#fbf9ef',
    icons: [
      {
        src: '/brand-appart/assets/images/favicon.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand-appart/assets/images/favicon.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }

  await writeTextFile(path.join(workspaceRoot, 'public', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
}

async function writeOfflinePage() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Brand Appart Offline</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        background: #fbf9ef;
        color: #171412;
        font-family: 'IBM Plex Mono', Roboto, monospace;
      }

      main {
        padding: 2rem;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Brand Appart Offline</h1>
      <p>The local Brand Appart mirror is offline right now. Reconnect to keep browsing.</p>
    </main>
  </body>
</html>
`

  await writeTextFile(path.join(workspaceRoot, 'public', 'offline.html'), html)
}

async function main() {
  await preparePublicMirrorWorkspace()

  try {
    await mirrorFilloutPages()

    const { pages, homeDocument, sitemapRoutes } = await collectMirrorPages()
    await prepareRuntimeAssets(homeDocument)
    await writeManifest(pages)
    await writePublicSitemap(sitemapRoutes)
    await writeRobotsFile()
    await writeWebManifest()
    await writeOfflinePage()
    await finalizePublicMirrorWorkspace()

    log(`Brand Appart mirror generated at ${publicRoot}`)
    log(`Mirrored pages: ${pages.length}`)
    log(`Mirrored assets: ${assetUrlMap.size}`)
    log(`Localized Vimeo videos: ${vimeoAssetMap.size}`)
  } catch (error) {
    await restorePublicMirrorWorkspace()
    throw error
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
