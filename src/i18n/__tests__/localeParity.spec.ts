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

function collectPlaceholderMap(value: JsonValue, prefix = ''): Record<string, string[]> {
  if (typeof value === 'string') {
    const tokens = Array.from(value.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g), ([, token]) => token)
    return tokens.length > 0 && prefix ? { [prefix]: [...new Set(tokens)].sort() } : {}
  }

  if (Array.isArray(value)) {
    return {}
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, string[]>>((result, [key, nested]) => {
      return {
        ...result,
        ...collectPlaceholderMap(nested, prefix ? `${prefix}.${key}` : key),
      }
    }, {})
  }

  return {}
}

describe('locale message parity', () => {
  const baseline = [...collectMessagePaths(en as JsonValue)].sort()
  const baselinePlaceholders = collectPlaceholderMap(en as JsonValue)
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

    it(`matches the English interpolation placeholders for ${locale}`, () => {
      const candidatePlaceholders = collectPlaceholderMap(messages as JsonValue)
      const interpolationPaths = [
        ...new Set([...Object.keys(baselinePlaceholders), ...Object.keys(candidatePlaceholders)]),
      ].sort()

      expect(
        Object.fromEntries(
          interpolationPaths.map((path) => [path, candidatePlaceholders[path] ?? []])
        )
      ).toEqual(
        Object.fromEntries(
          interpolationPaths.map((path) => [path, baselinePlaceholders[path] ?? []])
        )
      )
    })
  }
})
