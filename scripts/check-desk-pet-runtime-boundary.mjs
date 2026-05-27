import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(rootDir, 'dist')
const manifestPath = path.join(distDir, '.vite', 'manifest.json')
const entryKey = 'index.html'
const runtimeMarkers = [
  'DeskPet.vue',
  'desk-pet__image',
  'desk-pet__menu',
  'PET_STATE_IMAGE_MAP',
  'DESK_PET_AUX_PRELOAD_STATES',
  'createDeskPetWorkflowReactions',
  'useDeskPetWorkflowReactions',
  'resolveWorkflowPetState',
]

function fail(message) {
  console.error(`[desk-pet-runtime-boundary] ${message}`)
  process.exit(1)
}

function readManifest() {
  if (!existsSync(manifestPath)) {
    fail(`Missing build manifest at ${path.relative(rootDir, manifestPath)}`)
  }

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    fail(`Unable to parse build manifest: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function getManifestEntryByOutputFile(manifest, file) {
  return Object.values(manifest).find((entry) => entry?.file === file) ?? null
}

function collectStaticImportFiles(manifest, entry) {
  const files = []
  const seen = new Set()
  const queue = [entry]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current?.file || seen.has(current.file)) continue
    seen.add(current.file)
    files.push(current.file)

    for (const importFile of current.imports ?? []) {
      const importEntry = manifest[importFile] ?? getManifestEntryByOutputFile(manifest, importFile)
      if (importEntry) queue.push(importEntry)
    }
  }

  return files
}

function findMarkersInFile(file) {
  const absolutePath = path.join(distDir, file)
  if (!existsSync(absolutePath)) {
    fail(`Manifest references missing file ${file}`)
  }

  const source = readFileSync(absolutePath, 'utf8')
  return runtimeMarkers.filter((marker) => source.includes(marker))
}

const manifest = readManifest()
const entry = manifest[entryKey]

if (!entry?.isEntry || !entry.file) {
  fail(`Unable to resolve ${entryKey} entry chunk from manifest`)
}

const staticFiles = collectStaticImportFiles(manifest, entry)
const violations = staticFiles
  .map((file) => ({ file, markers: findMarkersInFile(file) }))
  .filter((result) => result.markers.length > 0)

if (violations.length > 0) {
  const details = violations
    .map((violation) => `- ${violation.file}: ${violation.markers.join(', ')}`)
    .join('\n')
  fail(`DeskPet runtime markers leaked into the entry static import graph:\n${details}`)
}

const dynamicImports = new Set(entry.dynamicImports ?? [])
if (!dynamicImports.has('src/components/ui/DeskPet.vue')) {
  fail('DeskPet.vue is no longer listed as an entry dynamic import')
}

console.log(
  `[desk-pet-runtime-boundary] passed (${staticFiles.length} entry static chunks checked; DeskPet remains dynamic)`
)
