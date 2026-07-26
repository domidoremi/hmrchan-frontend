import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { injectSriIntoHtml } from '../../../build/vite/plugins/sri'

const tempDirectories: string[] = []

function createOutputDirectory(): string {
  const outputDir = mkdtempSync(join(tmpdir(), 'hmrchan-sri-'))
  tempDirectories.push(outputDir)
  mkdirSync(join(outputDir, 'assets'), { recursive: true })
  return outputDir
}

function integrityFor(content: string): string {
  return `sha384-${createHash('sha384').update(content).digest('base64')}`
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('SRI HTML injection', () => {
  it('adds integrity to same-origin executable and style assets', () => {
    const outputDir = createOutputDirectory()
    writeFileSync(join(outputDir, 'assets', 'entry.js'), 'console.log("entry")')
    writeFileSync(join(outputDir, 'assets', 'entry.css'), 'body { color: black; }')

    const result = injectSriIntoHtml(
      [
        '<script type="module" src="/assets/entry.js"></script>',
        '<link rel="modulepreload" href="/assets/entry.js">',
        '<link rel="stylesheet" href="/assets/entry.css">',
        '<script src="https://cdn.example.com/external.js"></script>',
      ].join('\n'),
      outputDir
    )

    expect(result.count).toBe(3)
    expect(result.html).toContain(
      `src="/assets/entry.js" integrity="${integrityFor('console.log("entry")')}"`
    )
    expect(result.html).toContain(
      `href="/assets/entry.css" integrity="${integrityFor('body { color: black; }')}"`
    )
    expect(result.html).toContain('src="https://cdn.example.com/external.js"')
  })

  it('preserves existing integrity attributes and is idempotent', () => {
    const outputDir = createOutputDirectory()
    writeFileSync(join(outputDir, 'assets', 'entry.js'), 'console.log("entry")')
    const source =
      '<script type="module" src="/assets/entry.js" integrity="sha384-existing"></script>'

    const first = injectSriIntoHtml(source, outputDir)
    const second = injectSriIntoHtml(first.html, outputDir)

    expect(first).toEqual({ html: source, count: 0 })
    expect(second).toEqual({ html: source, count: 0 })
  })
})
