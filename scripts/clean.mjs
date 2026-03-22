#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')

const STATIC_TARGETS = [
  'coverage',
  'dist',
  'output',
  'tmp',
  '.tmp-lighthouse-prod',
  '%SystemDrive%',
  '.codex-dev.log',
  path.join('node_modules', '.vite'),
  '.tsbuildinfo',
]

function shouldRemoveDynamicTarget(name) {
  return /^\.lighthouse-prod(?:$|-)/.test(name) || /^\.tmp-lighthouse-.*\.json$/.test(name)
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function collectTargets() {
  const entries = await fs.readdir(ROOT_DIR, { withFileTypes: true })
  const names = new Set(STATIC_TARGETS)

  for (const entry of entries) {
    if (shouldRemoveDynamicTarget(entry.name)) {
      names.add(entry.name)
    }
  }

  const targets = []
  for (const relativePath of names) {
    const absolutePath = path.join(ROOT_DIR, relativePath)
    if (await pathExists(absolutePath)) {
      targets.push(relativePath)
    }
  }

  return targets.sort((left, right) => left.localeCompare(right))
}

async function removeTargets(targets) {
  for (const relativePath of targets) {
    const absolutePath = path.join(ROOT_DIR, relativePath)
    if (dryRun) {
      console.log(`would remove ${relativePath}`)
      continue
    }

    await fs.rm(absolutePath, { recursive: true, force: true })
    console.log(`removed ${relativePath}`)
  }
}

async function main() {
  const targets = await collectTargets()

  if (targets.length === 0) {
    console.log('no cleanup targets found')
    return
  }

  await removeTargets(targets)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
