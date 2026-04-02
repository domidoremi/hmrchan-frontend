import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return Date.now().toString(36).slice(-7)
  }
}

function getGitCommitCount(): string {
  try {
    return execSync('git rev-list --count HEAD').toString().trim()
  } catch {
    return '0'
  }
}

export function getSwCacheVersion(projectRoot = process.cwd()): string {
  const packageJsonPath = resolve(projectRoot, 'package.json')
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
    version?: string
  }

  const version = (pkg.version || '0.0.0').replace(/\./g, '-')
  const hash = getGitHash()
  const buildNum = getGitCommitCount()

  return `v${version}-${hash}-b${buildNum}`
}
