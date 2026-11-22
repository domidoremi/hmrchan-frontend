#!/usr/bin/env node

import sharp from 'sharp'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = resolve(rootDir, 'public/icons')
const source = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(outputDir, 'photo.svg')
const badgeSource = resolve(outputDir, 'photo-badge.svg')

async function generate(input, size, name) {
  const output = resolve(outputDir, name)
  await sharp(input)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(output)
  const metadata = await sharp(output).metadata()
  if (metadata.format !== 'png' || metadata.width !== size || metadata.height !== size)
    throw new Error('Unexpected icon dimensions: ' + name)
  return { name, size, bytes: (await stat(output)).size }
}

try {
  await mkdir(outputDir, { recursive: true })
  const input = await readFile(source)
  const badge = await readFile(badgeSource)
  const results = []
  for (const size of [180, 192, 512])
    results.push(await generate(input, size, 'photo-' + size + '.png'))
  results.push(await generate(badge, 96, 'photo-badge-96.png'))
  console.log(JSON.stringify({ icons: results }, null, 2))
} catch (error) {
  console.error('[icons] Generation failed:', error.message)
  process.exitCode = 1
}
