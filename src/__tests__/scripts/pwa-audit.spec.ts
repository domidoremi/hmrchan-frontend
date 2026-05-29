import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import pwaAudit from '../../../scripts/audit/pwa'

type ManifestIcon = {
  src?: string
}

type ManifestFixtureOptions = {
  icons: ManifestIcon[]
  existingIcons?: string[]
  html?: {
    manifestHref?: string
    themeColorContent?: string
    appleTouchIconHref?: string
  }
}

function createManifest({ icons }: ManifestFixtureOptions): string {
  return `${JSON.stringify(
    {
      name: 'HMRChan',
      short_name: 'HMRChan',
      start_url: '/?source=pwa',
      display: 'standalone',
      icons,
    },
    null,
    2
  )}\n`
}

async function createPwaFixture(options: ManifestFixtureOptions): Promise<string> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'hmr-pwa-audit-'))
  await mkdir(join(projectRoot, 'public', 'icons'), { recursive: true })
  await mkdir(join(projectRoot, 'src', 'sw'), { recursive: true })
  await mkdir(join(projectRoot, 'build', 'vite', 'plugins'), { recursive: true })
  const manifestHref = options.html?.manifestHref ?? '/manifest.json'
  const themeColorContent = options.html?.themeColorContent ?? '#4b8cff'
  const appleTouchIconHref = options.html?.appleTouchIconHref ?? '/icons/sitting-192.webp'

  await writeFile(join(projectRoot, 'public', 'manifest.json'), createManifest(options))
  await writeFile(
    join(projectRoot, 'index.html'),
    [
      '<!doctype html>',
      '<html>',
      '  <head>',
      `    <link rel="manifest" href="${manifestHref}" />`,
      `    <link rel="apple-touch-icon" href="${appleTouchIconHref}" />`,
      `    <meta name="theme-color" content="${themeColorContent}" />`,
      '  </head>',
      '  <body><div id="app"></div></body>',
      '</html>',
      '',
    ].join('\n')
  )
  await writeFile(join(projectRoot, 'src', 'sw', 'index.ts'), 'export {}\n')
  await writeFile(
    join(projectRoot, 'build', 'vite', 'plugins', 'serviceWorkerBuild.ts'),
    'export const serviceWorkerBuildPlugin = true\n'
  )
  await writeFile(
    join(projectRoot, 'vite.config.ts'),
    'import { serviceWorkerBuildPlugin } from "./build/vite/plugins/serviceWorkerBuild"\nexport default { plugins: [serviceWorkerBuildPlugin] }\n'
  )

  for (const icon of options.existingIcons ?? []) {
    await writeFile(join(projectRoot, 'public', icon.replace(/^\//, '')), '')
  }

  return projectRoot
}

async function runPwaAudit(projectRoot: string) {
  return pwaAudit.run({
    fix: false,
    verbose: false,
    projectRoot,
  })
}

describe('pwa audit manifest icon contract', () => {
  it('passes when the manifest declares an existing install icon', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('pass')
      expect(result.issues).toEqual([])
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the manifest icon list is empty', async () => {
    const projectRoot = await createPwaFixture({ icons: [] })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-icons',
            file: 'public/manifest.json',
            message: 'manifest.json must declare at least one install icon',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when a manifest icon entry has no source', async () => {
    const projectRoot = await createPwaFixture({ icons: [{}] })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-icons',
            file: 'public/manifest.json',
            message: 'manifest.json icon entry missing src',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when a declared manifest icon file is missing', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/missing.webp' }],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-icons',
            message: 'Declared icon file not found: /icons/missing.webp',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })
})

describe('pwa audit html install entry contract', () => {
  it('fails when the manifest link points away from the public manifest', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      html: {
        manifestHref: '/assets/manifest.webmanifest',
      },
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-html',
            file: 'index.html',
            message: 'index.html manifest link must reference /manifest.json',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the theme color meta has no content', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      html: {
        themeColorContent: '',
      },
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-html',
            file: 'index.html',
            message: 'index.html theme-color meta must declare content',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the apple touch icon file is missing', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      html: {
        appleTouchIconHref: '/icons/missing-apple-touch-icon.png',
      },
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-html',
            message: 'apple-touch-icon file not found: /icons/missing-apple-touch-icon.png',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })
})
