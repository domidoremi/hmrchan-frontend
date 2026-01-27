#!/usr/bin/env node
/**
 * Automatically update Service Worker cache version
 * Runs before each build to ensure SW version syncs with build
 *
 * Version Strategy:
 * - Use semantic version from package.json
 * - Add git commit hash for uniqueness
 * - Only update when SW file content changes
 *
 * Format: v{major}-{minor}-{patch}-{git-hash}
 * Example: v1-0-0-a1b2c3d
 *
 * Usage:
 *   node scripts/update-sw-version.js [--dry-run] [--force]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'
import { createHash } from 'crypto'

const SW_PATH = resolve(process.cwd(), 'public/sw.js')
const PACKAGE_PATH = resolve(process.cwd(), 'package.json')
const DRY_RUN = process.argv.includes('--dry-run')
const FORCE_UPDATE = process.argv.includes('--force')

/**
 * Validate file exists
 */
function validateFile(path, name) {
  if (!existsSync(path)) {
    throw new Error(`${name} not found at: ${path}`)
  }
}

/**
 * Get git commit hash (short)
 */
function getGitHash() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    // Fallback to timestamp if not in git repo
    return Date.now().toString(36).slice(-7)
  }
}

/**
 * Get git commit count (for build number)
 */
function getGitCommitCount() {
  try {
    return execSync('git rev-list --count HEAD').toString().trim()
  } catch {
    return '0'
  }
}

/**
 * Calculate content hash of SW file (excluding version line)
 */
function calculateContentHash(content) {
  // Remove version-related lines to get pure content hash
  const contentWithoutVersion = content
    .replace(/const CACHE_VERSION = ['"]v[\w-]+['"]/, '')
    .replace(/\* 版本: [\d.]+ \([\d-]+\)/, '')
    .replace(/\* 版本: [\d.]+ \([\d-]+\) \([\d-]+\).*/, '')

  return createHash('md5').update(contentWithoutVersion).digest('hex').slice(0, 8)
}

/**
 * Generate cache version string
 */
function generateCacheVersion(appVersion, gitHash, buildNumber) {
  const sanitizedVersion = appVersion.replace(/\./g, '-')
  return `v${sanitizedVersion}-${gitHash}-b${buildNumber}`
}

/**
 * Extract current cache version from SW file
 */
function extractCurrentVersion(content) {
  const match = content.match(/const CACHE_VERSION = ['"]([^'"]+)['"]/)
  return match ? match[1] : null
}

/**
 * Update CACHE_VERSION constant
 */
function updateCacheVersion(content, newVersion) {
  const pattern = /const CACHE_VERSION = ['"]v[\w-]+['"]/
  const replacement = `const CACHE_VERSION = '${newVersion}'`

  if (!pattern.test(content)) {
    throw new Error('CACHE_VERSION constant not found in Service Worker file')
  }

  return content.replace(pattern, replacement)
}

/**
 * Update version comment
 */
function updateVersionComment(content, appVersion, gitHash, buildNumber) {
  const pattern = /\* 版本: [\d.]+ \([\d-]+\)( \([\d-]+\))*/
  const date = new Date().toISOString().split('T')[0]
  const replacement = `* 版本: ${appVersion} (${date}) [${gitHash}] #${buildNumber}`

  if (!pattern.test(content)) {
    console.warn('⚠️  Version comment not found - skipping comment update')
    return content
  }

  return content.replace(pattern, replacement)
}

/**
 * Verify updates were applied
 */
function verifyUpdates(content, expectedVersion) {
  if (!content.includes(expectedVersion)) {
    throw new Error(`Failed to verify update - expected version "${expectedVersion}" not found`)
  }
}

/**
 * Main execution
 */
try {
  // Validate files exist
  validateFile(PACKAGE_PATH, 'package.json')
  validateFile(SW_PATH, 'Service Worker')

  // Read package version
  const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf-8'))
  const appVersion = pkg.version

  if (!appVersion) {
    throw new Error('Version not found in package.json')
  }

  // Read SW file
  const originalContent = readFileSync(SW_PATH, 'utf-8')
  const currentVersion = extractCurrentVersion(originalContent)

  // Get git info
  const gitHash = getGitHash()
  const buildNumber = getGitCommitCount()

  // Calculate content hash
  const contentHash = calculateContentHash(originalContent)

  // Generate new cache version
  const newCacheVersion = generateCacheVersion(appVersion, gitHash, buildNumber)

  // Check if update is needed
  const contentChanged = !currentVersion || !currentVersion.includes(contentHash)
  const versionChanged = currentVersion !== newCacheVersion

  if (!FORCE_UPDATE && !contentChanged && !versionChanged) {
    console.log('✅ Service Worker version is up to date')
    console.log(`📦 Current version: ${currentVersion}`)
    console.log(`🔒 Content hash: ${contentHash}`)
    process.exit(0)
  }

  // Apply updates
  let updatedContent = updateCacheVersion(originalContent, newCacheVersion)
  updatedContent = updateVersionComment(updatedContent, appVersion, gitHash, buildNumber)

  // Verify changes
  verifyUpdates(updatedContent, newCacheVersion)

  if (DRY_RUN) {
    console.log('🔍 Dry run mode - no files modified')
    console.log(`📦 App version: ${appVersion}`)
    console.log(`🔄 Current version: ${currentVersion || 'none'}`)
    console.log(`🆕 New version: ${newCacheVersion}`)
    console.log(`🔒 Content hash: ${contentHash}`)
    console.log(`📝 Git hash: ${gitHash}`)
    console.log(`🔢 Build number: ${buildNumber}`)
    console.log(`✅ Validation passed`)
    process.exit(0)
  }

  // Write back to file
  writeFileSync(SW_PATH, updatedContent, 'utf-8')

  console.log(`✅ Service Worker version updated: ${newCacheVersion}`)
  console.log(`📦 App version: ${appVersion}`)
  console.log(`📝 Git hash: ${gitHash}`)
  console.log(`🔢 Build #${buildNumber}`)

  if (currentVersion) {
    console.log(`🔄 Previous: ${currentVersion}`)
  }
} catch (error) {
  console.error('❌ Failed to update Service Worker version:', error.message)
  process.exit(1)
}
