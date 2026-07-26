#!/usr/bin/env node

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATIC_SITEMAP_ENTRIES, renderSitemap } from '../src/edge/sitemap.ts'

const SITEMAP_PATH = resolve(process.cwd(), 'public/sitemap.xml')
const DRY_RUN = process.argv.includes('--dry-run')

function generateSitemap() {
  return renderSitemap(STATIC_SITEMAP_ENTRIES)
}

function validateSitemap(content) {
  if (!content.includes('<?xml version="1.0"')) throw new Error('Missing XML declaration')
  if (!content.includes('<urlset')) throw new Error('Missing urlset element')
  if (!content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    throw new Error('Missing sitemap namespace')
  }
  if (content.includes('hreflang=')) {
    throw new Error('Sitemap must not advertise language URLs that do not exist')
  }

  const urlCount = (content.match(/<url>/g) || []).length
  if (urlCount !== STATIC_SITEMAP_ENTRIES.length) {
    throw new Error(`Expected ${STATIC_SITEMAP_ENTRIES.length} static URLs, found ${urlCount}`)
  }
  console.log(`Sitemap validation passed (${urlCount} static URLs)`)
}

function main() {
  try {
    const sitemap = generateSitemap()
    validateSitemap(sitemap)

    if (DRY_RUN) {
      console.log(sitemap)
      return
    }

    writeFileSync(SITEMAP_PATH, sitemap, 'utf8')
    console.log(`Sitemap written to ${SITEMAP_PATH}`)
  } catch (error) {
    console.error('Failed to generate sitemap:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

main()
