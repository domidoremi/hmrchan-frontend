import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const distDir = resolve(process.cwd(), 'dist')
const htmlPath = join(distDir, 'index.html')
const sourcemapEnv = (process.env.VITE_SOURCEMAP ?? '').trim().toLowerCase()

function walk(dir) {
  const files = []

  for (const entry of readdirSync(dir)) {
    const absolutePath = join(dir, entry)
    const stats = statSync(absolutePath)

    if (stats.isDirectory()) {
      files.push(...walk(absolutePath))
      continue
    }

    files.push(absolutePath)
  }

  return files
}

if (sourcemapEnv === 'true' || sourcemapEnv === 'hidden') {
  console.error('[build-security] Production build forbids VITE_SOURCEMAP=true|hidden.')
  process.exit(1)
}

if (!existsSync(distDir) || !existsSync(htmlPath)) {
  console.error('[build-security] dist/index.html not found. Run build first.')
  process.exit(1)
}

const mapFiles = walk(distDir).filter((file) => file.endsWith('.map'))
if (mapFiles.length > 0) {
  console.error('[build-security] Source maps detected in dist output:')
  mapFiles.forEach((file) => console.error(` - ${file}`))
  process.exit(1)
}

const html = readFileSync(htmlPath, 'utf8')
const assetTags = [
  ...html.matchAll(/<script\b[^>]*src="(\/assets\/[^"]+)"[^>]*>/g),
  ...html.matchAll(/<link\b[^>]*href="(\/assets\/[^"]+)"[^>]*>/g),
]

const missingIntegrity = assetTags
  .map((match) => match[0])
  .filter((tag) => !/\sintegrity="/.test(tag))

if (missingIntegrity.length > 0) {
  console.error('[build-security] Missing SRI integrity attribute on built asset tags:')
  missingIntegrity.forEach((tag) => console.error(` - ${tag}`))
  process.exit(1)
}

console.log('[build-security] Security checks passed.')
