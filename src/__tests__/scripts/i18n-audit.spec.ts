import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import i18nAudit from '../../../scripts/audit/i18n'

type LocaleMessages = Record<string, Record<string, string>>

interface I18nFixtureOptions {
  defaultLocale?: string
  supportedLocales?: string[]
  messages?: LocaleMessages
  writeContract?: boolean
}

const completeMessages = {
  'zh-CN': {
    'nav.home': '首页',
    'nav.settings': '设置',
  },
  'en-US': {
    'nav.home': 'Home',
    'nav.settings': 'Settings',
  },
  'ja-JP': {
    'nav.home': 'ホーム',
    'nav.settings': '設定',
  },
} satisfies LocaleMessages

function formatMessages(messages: LocaleMessages): string {
  const localeBlocks = Object.entries(messages).map(([locale, keys]) => {
    const keyLines = Object.entries(keys).map(([key, value]) => {
      const path = key.split('.')
      if (path.length !== 2) throw new Error(`Unsupported test key shape: ${key}`)
      return `      ${path[1]}: '${value}',`
    })
    const namespace = Object.keys(keys)[0]?.split('.')[0] ?? 'nav'

    return [`  '${locale}': {`, `    ${namespace}: {`, ...keyLines, '    },', '  },'].join('\n')
  })

  return ['const messages = {', ...localeBlocks, '}', ''].join('\n')
}

async function createI18nFixture(options: I18nFixtureOptions = {}): Promise<string> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'hmr-i18n-audit-'))
  await mkdir(join(projectRoot, 'src', 'i18n'), { recursive: true })
  await mkdir(join(projectRoot, 'src', 'views'), { recursive: true })

  const defaultLocale = options.defaultLocale ?? 'zh-CN'
  const supportedLocales = options.supportedLocales ?? ['zh-CN', 'en-US', 'ja-JP']
  const messages = options.messages ?? completeMessages

  if (options.writeContract !== false) {
    await writeFile(
      join(projectRoot, 'src', 'i18n', 'locales.ts'),
      [
        `export const supportedLocales = [${supportedLocales.map((locale) => `'${locale}'`).join(', ')}] as const`,
        `export const defaultLocale = '${defaultLocale}'`,
        '',
      ].join('\n')
    )
  }

  await writeFile(join(projectRoot, 'src', 'i18n', 'index.ts'), formatMessages(messages))

  return projectRoot
}

async function runI18nAudit(projectRoot: string) {
  return i18nAudit.run({
    fix: false,
    verbose: false,
    projectRoot,
  })
}

describe('i18n audit locale contract', () => {
  it('passes when supported locales and message catalogs match', async () => {
    const projectRoot = await createI18nFixture()

    try {
      const result = await runI18nAudit(projectRoot)

      expect(result.status).toBe('pass')
      expect(result.issues).toEqual([])
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when a supported locale has no message catalog', async () => {
    const projectRoot = await createI18nFixture({
      messages: {
        'zh-CN': completeMessages['zh-CN'],
        'en-US': completeMessages['en-US'],
      },
    })

    try {
      const result = await runI18nAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'locale-contract',
            file: 'src/i18n/index.ts',
            message: 'Supported locale "ja-JP" has no message catalog in src/i18n/index.ts',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when message catalogs contain an unsupported locale', async () => {
    const projectRoot = await createI18nFixture({
      supportedLocales: ['zh-CN', 'en-US'],
    })

    try {
      const result = await runI18nAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'locale-contract',
            file: 'src/i18n/index.ts',
            message: 'Locale messages contain unsupported locale "ja-JP"',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when defaultLocale is outside supportedLocales', async () => {
    const projectRoot = await createI18nFixture({
      defaultLocale: 'zh-TW',
    })

    try {
      const result = await runI18nAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'locale-contract',
            file: 'src/i18n/locales.ts',
            message: 'defaultLocale must be included in supportedLocales: zh-TW',
          }),
          expect.objectContaining({
            message: 'Default locale "zh-TW" not found in src/i18n/index.ts',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when the locale contract source is missing', async () => {
    const projectRoot = await createI18nFixture({
      writeContract: false,
    })

    try {
      const result = await runI18nAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'locale-contract-source',
            file: 'src/i18n/locales.ts',
            message: 'Cannot read locale contract from src/i18n/locales.ts',
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })
})
