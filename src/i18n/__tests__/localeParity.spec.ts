import { describe, expect, it } from 'vitest'

import en from '../locales/en.json'
import ja from '../locales/ja.json'
import zhCN from '../locales/zh-CN.json'
import zhTW from '../locales/zh-TW.json'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

function collectMessagePaths(value: JsonValue, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return [prefix]
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nested]) =>
      collectMessagePaths(nested, prefix ? `${prefix}.${key}` : key)
    )
  }

  return prefix ? [prefix] : []
}

describe('locale message parity', () => {
  const baseline = [...collectMessagePaths(en as JsonValue)].sort()
  const locales = [
    ['zh-CN', zhCN],
    ['zh-TW', zhTW],
    ['ja', ja],
  ] as const

  for (const [locale, messages] of locales) {
    it(`matches the English message shape for ${locale}`, () => {
      const candidate = [...collectMessagePaths(messages as JsonValue)].sort()
      expect(candidate).toEqual(baseline)
    })
  }
})
