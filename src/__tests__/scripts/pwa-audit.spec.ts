import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import pwaAudit from '../../../scripts/audit/pwa'

type ManifestIcon = {
  src?: string
}

const indexedSitemapPaths = [
  '/',
  '/explore',
  '/community',
  '/schedule',
  '/about',
  '/contact',
  '/join-us',
] as const

type ManifestFixtureOptions = {
  icons: ManifestIcon[]
  existingIcons?: string[]
  i18nDefaultLocale?: string
  i18nSupportedLocales?: string[]
  writeI18n?: boolean
  writeSitemapGenerator?: boolean
  manifestLang?: string
  offlineLang?: string
  sitemapHreflang?: string[]
  sitemapGeneratorPaths?: string[]
  sitemapEntries?: Array<{
    loc: string
    hreflang: string[]
    alternateHref?: string
  }>
  html?: {
    lang?: string
    manifestHref?: string
    themeColorContent?: string
    appleTouchIconHref?: string
  }
}

function createManifest({ icons, manifestLang = 'zh-CN' }: ManifestFixtureOptions): string {
  return `${JSON.stringify(
    {
      name: 'HMRChan',
      short_name: 'HMRChan',
      start_url: '/?source=pwa',
      display: 'standalone',
      lang: manifestLang,
      icons,
    },
    null,
    2
  )}\n`
}

async function createPwaFixture(options: ManifestFixtureOptions): Promise<string> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'hmr-pwa-audit-'))
  await mkdir(join(projectRoot, 'public', 'icons'), { recursive: true })
  await mkdir(join(projectRoot, 'scripts'), { recursive: true })
  await mkdir(join(projectRoot, 'src', 'i18n'), { recursive: true })
  await mkdir(join(projectRoot, 'src', 'sw'), { recursive: true })
  await mkdir(join(projectRoot, 'build', 'vite', 'plugins'), { recursive: true })
  const i18nDefaultLocale = options.i18nDefaultLocale ?? 'zh-CN'
  const i18nSupportedLocales = options.i18nSupportedLocales ?? ['zh-CN', 'en-US', 'ja-JP']
  const htmlLang = options.html?.lang ?? 'zh-CN'
  const offlineLang = options.offlineLang ?? 'zh-CN'
  const sitemapHreflang = options.sitemapHreflang ?? i18nSupportedLocales
  const sitemapGeneratorPaths = options.sitemapGeneratorPaths ?? [...indexedSitemapPaths]
  const sitemapEntries =
    options.sitemapEntries ??
    indexedSitemapPaths.map((path) => ({
      loc: new URL(path, 'https://momichan.xyz').toString(),
      hreflang: sitemapHreflang,
    }))
  const manifestHref = options.html?.manifestHref ?? '/manifest.json'
  const themeColorContent = options.html?.themeColorContent ?? '#4b8cff'
  const appleTouchIconHref = options.html?.appleTouchIconHref ?? '/icons/sitting-192.webp'

  await writeFile(join(projectRoot, 'public', 'manifest.json'), createManifest(options))
  await writeFile(
    join(projectRoot, 'index.html'),
    [
      '<!doctype html>',
      `<html lang="${htmlLang}">`,
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
  await writeFile(
    join(projectRoot, 'public', 'offline.html'),
    [
      '<!doctype html>',
      `<html lang="${offlineLang}">`,
      '  <head><title>MomiChan 离线</title></head>',
      '  <body><main>MomiChan 离线</main></body>',
      '</html>',
      '',
    ].join('\n')
  )
  if (options.writeI18n !== false) {
    await writeFile(
      join(projectRoot, 'src', 'i18n', 'locales.ts'),
      [
        `export const supportedLocales = [${i18nSupportedLocales.map((locale) => `'${locale}'`).join(', ')}]`,
        `export const defaultLocale = '${i18nDefaultLocale}'`,
        '',
      ].join('\n')
    )
  }
  await writeFile(
    join(projectRoot, 'public', 'sitemap.xml'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...sitemapEntries.flatMap((entry) => [
        '  <url>',
        `    <loc>${entry.loc}</loc>`,
        ...entry.hreflang.map(
          (locale) =>
            `    <xhtml:link rel="alternate" hreflang="${locale}" href="${entry.alternateHref ?? entry.loc}" />`
        ),
        '  </url>',
      ]),
      '</urlset>',
      '',
    ].join('\n')
  )
  if (options.writeSitemapGenerator !== false) {
    await writeFile(
      join(projectRoot, 'scripts', 'generate-sitemap.js'),
      [
        'const ROUTES = [',
        ...sitemapGeneratorPaths.flatMap((path) => [
          '  {',
          `    path: '${path}',`,
          "    changefreq: 'daily',",
          '    priority: 0.5,',
          '  },',
        ]),
        ']',
        '',
      ].join('\n')
    )
  }
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

describe('pwa audit language contract', () => {
  it('fails when the frontend default locale source is unavailable', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      writeI18n: false,
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-language-source',
            file: 'src/i18n/locales.ts',
            message: 'Cannot resolve frontend default locale from src/i18n/locales.ts',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the frontend supported locales source is unavailable', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      i18nSupportedLocales: [],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-language-source',
            file: 'src/i18n/locales.ts',
            message: 'Cannot resolve frontend supported locales from src/i18n/locales.ts',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the default locale is not in the supported locale list', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      i18nDefaultLocale: 'zh-CN',
      i18nSupportedLocales: ['en-US', 'ja-JP'],
      sitemapHreflang: ['en-US', 'ja-JP'],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-language-source',
            file: 'src/i18n/locales.ts',
            message: 'defaultLocale must be included in supportedLocales: zh-CN',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the manifest lang drifts from the default app locale', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      manifestLang: 'en',
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-language',
            file: 'public/manifest.json',
            message: 'manifest.json lang must match default app locale: zh-CN',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the entry html lang drifts from the default app locale', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      html: {
        lang: 'en',
      },
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-language',
            file: 'index.html',
            message: 'index.html html lang must match default app locale: zh-CN',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the offline html lang drifts from the default app locale', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      offlineLang: 'en',
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-language',
            file: 'public/offline.html',
            message: 'public/offline.html html lang must match default app locale: zh-CN',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('uses the exported frontend default locale as the PWA language source', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      i18nDefaultLocale: 'en-US',
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-language',
            file: 'public/manifest.json',
            message: 'manifest.json lang must match default app locale: en-US',
          }),
          expect.objectContaining({
            rule: 'pwa-language',
            file: 'index.html',
            message: 'index.html html lang must match default app locale: en-US',
          }),
          expect.objectContaining({
            rule: 'pwa-language',
            file: 'public/offline.html',
            message: 'public/offline.html html lang must match default app locale: en-US',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when sitemap hreflang values drift from supported locales', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapHreflang: ['zh-CN', 'zh-TW', 'ja-JP'],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-language',
            file: 'public/sitemap.xml',
            message:
              'public/sitemap.xml hreflang values must match supported locales for https://momichan.xyz/: zh-CN, en-US, ja-JP',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when a localized sitemap entry omits one supported locale', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapEntries: [
        {
          loc: 'https://momichan.xyz/',
          hreflang: ['zh-CN', 'en-US', 'ja-JP'],
        },
        {
          loc: 'https://momichan.xyz/explore',
          hreflang: ['zh-CN', 'ja-JP'],
        },
      ],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-language',
            file: 'public/sitemap.xml',
            message:
              'public/sitemap.xml hreflang values must match supported locales for https://momichan.xyz/explore: zh-CN, en-US, ja-JP',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when an indexed sitemap entry has no alternate languages', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapEntries: [
        {
          loc: 'https://momichan.xyz/',
          hreflang: ['zh-CN', 'en-US', 'ja-JP'],
        },
        {
          loc: 'https://momichan.xyz/explore',
          hreflang: [],
        },
      ],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-language',
            file: 'public/sitemap.xml',
            message:
              'public/sitemap.xml hreflang values must match supported locales for https://momichan.xyz/explore: zh-CN, en-US, ja-JP',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when a sitemap alternate href drifts from the entry loc', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapEntries: indexedSitemapPaths.map((path) => ({
        loc: new URL(path, 'https://momichan.xyz').toString(),
        hreflang: ['zh-CN', 'en-US', 'ja-JP'],
        alternateHref: path === '/explore' ? 'https://momichan.xyz/community' : undefined,
      })),
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-language',
            file: 'public/sitemap.xml',
            message:
              'public/sitemap.xml alternate href values must match loc for https://momichan.xyz/explore',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when an indexable public route is missing from the sitemap', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapEntries: indexedSitemapPaths
        .filter((path) => path !== '/join-us')
        .map((path) => ({
          loc: new URL(path, 'https://momichan.xyz').toString(),
          hreflang: ['zh-CN', 'en-US', 'ja-JP'],
        })),
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-route',
            file: 'public/sitemap.xml',
            message: 'public/sitemap.xml missing indexed public route: /join-us',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when a noindex shell route appears in the sitemap', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapEntries: [
        ...indexedSitemapPaths.map((path) => ({
          loc: new URL(path, 'https://momichan.xyz').toString(),
          hreflang: ['zh-CN', 'en-US', 'ja-JP'],
        })),
        {
          loc: 'https://momichan.xyz/profile',
          hreflang: ['zh-CN', 'en-US', 'ja-JP'],
        },
      ],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-route',
            file: 'public/sitemap.xml',
            message: 'public/sitemap.xml must not index noindex shell route: /profile',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when a sitemap loc uses the wrong site origin', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapEntries: indexedSitemapPaths.map((path) => ({
        loc: new URL(
          path,
          path === '/join-us' ? 'https://example.com' : 'https://momichan.xyz'
        ).toString(),
        hreflang: ['zh-CN', 'en-US', 'ja-JP'],
      })),
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-origin',
            file: 'public/sitemap.xml',
            message:
              'public/sitemap.xml loc origin must match https://momichan.xyz: https://example.com/join-us',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the sitemap generator omits an indexable public route', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapGeneratorPaths: indexedSitemapPaths.filter((path) => path !== '/join-us'),
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-route',
            file: 'scripts/generate-sitemap.js',
            message: 'scripts/generate-sitemap.js missing indexed public route: /join-us',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the sitemap generator contains a noindex shell route', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapGeneratorPaths: [...indexedSitemapPaths, '/profile'],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-route',
            file: 'scripts/generate-sitemap.js',
            message: 'scripts/generate-sitemap.js must not index noindex shell route: /profile',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the sitemap generator contains an unapproved static route', async () => {
    const projectRoot = await createPwaFixture({
      icons: [{ src: '/icons/sitting-192.webp' }],
      existingIcons: ['/icons/sitting-192.webp'],
      sitemapGeneratorPaths: [...indexedSitemapPaths, '/preview-only'],
    })

    try {
      const result = await runPwaAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'pwa-sitemap-route',
            file: 'scripts/generate-sitemap.js',
            message: 'scripts/generate-sitemap.js contains unapproved indexed route: /preview-only',
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
