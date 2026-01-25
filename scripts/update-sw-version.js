#!/usr/bin/env node
/**
 * Automatically update Service Worker cache version
 * Runs before each build to ensure SW version syncs with build
 *
 * Usage:
 *   node scripts/update-sw-version.js [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const SW_PATH = resolve(process.cwd(), 'public/sw.js')
const PACKAGE_PATH = resolve(process.cwd(), 'package.json')
const DRY_RUN = process.argv.includes('--dry-run')

/**
 * Validate file exists
 */
function validateFile(path, name) {
  if (!existsSync(path)) {
    throw new Error(`${name} not found at: ${path}`)
  }
}

/**
 * Generate cache version string
 */
function generateCacheVersion(appVersion, timestamp = Date.now()) {
  const sanitizedVersion = appVersion.replace(/\./g, '-')
  return `v${sanitizedVersion}-${timestamp}`
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
function updateVersionComment(content, appVersion) {
  const pattern = /\* 版本: [\d.]+/
  const date = new Date().toISOString().split('T')[0]
  const replacement = `* 版本: ${appVersion} (${date})`

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

  // Generate new cache version
  const newCacheVersion = generateCacheVersion(appVersion)

  // Apply updates
  let updatedContent = updateCacheVersion(originalContent, newCacheVersion)
  updatedContent = updateVersionComment(updatedContent, appVersion)

  // Verify changes
  verifyUpdates(updatedContent, newCacheVersion)

  if (DRY_RUN) {
    console.log('🔍 Dry run mode - no files modified')
    console.log(`📦 App version: ${appVersion}`)
    console.log(`🔄 New cache version: ${newCacheVersion}`)
    console.log(`✅ Validation passed`)
    process.exit(0)
  }

  // Write back to file
  writeFileSync(SW_PATH, updatedContent, 'utf-8')

  console.log(`✅ Service Worker version updated: ${newCacheVersion}`)
  console.log(`📦 App version: ${appVersion}`)
} catch (error) {
  console.error('❌ Failed to update Service Worker version:', error.message)
  process.exit(1)
}
