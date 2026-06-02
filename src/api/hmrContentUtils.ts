import type { HmrCursorCollection } from '@/hmr/types'
import { defaultLocale } from '@/i18n/locales'

export type JsonRecord = Record<string, unknown>

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function pickString(record: JsonRecord, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return fallback
}

export function pickOptionalString(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }

  return undefined
}

export function pickNestedOptionalString(
  record: JsonRecord,
  candidates: Array<[string, string[]]>
): string | undefined {
  for (const [parentKey, childKeys] of candidates) {
    const nested = record[parentKey]
    if (!isRecord(nested)) continue

    const value = pickOptionalString(nested, childKeys)
    if (value) return value
  }

  return undefined
}

export function pickNumber(record: JsonRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return fallback
}

export function normalizeMediaKind(value?: string): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-') ?? ''
  )
}

export function isTextOnlyMediaKind(value?: string): boolean {
  const normalized = normalizeMediaKind(value)
  return (
    normalized === 'text' ||
    normalized === 'plain-text' ||
    normalized === 'post' ||
    normalized === 'tweet' ||
    normalized === 'link' ||
    normalized === 'url'
  )
}

export function hasRenderableMediaRecord(value: unknown): boolean {
  const record = isRecord(value) ? value : {}
  const mediaKind = pickOptionalString(record, [
    'media_type',
    'mediaType',
    'file_type',
    'fileType',
    'type',
    'mime_type',
  ])
  if (isTextOnlyMediaKind(mediaKind)) return false

  return (
    Boolean(mediaKind) ||
    Boolean(
      pickOptionalString(record, [
        'thumbnail_url',
        'thumbnailUrl',
        'poster_url',
        'posterUrl',
        'image_url',
        'imageUrl',
        'stream_url',
        'streamUrl',
        'media_url',
        'mediaUrl',
        'url',
      ])
    )
  )
}

export function cleanPostText(value: string): string {
  return value
    .replace(/RT\s+@\w+:\s*/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[#＃][\p{L}\p{N}_-]+/gu, '')
    .replace(/[@＠][\w_]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function trimText(value: string, maxLength: number): string {
  const normalized = cleanPostText(value)
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}…`
}

export function formatDisplayDate(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '刚刚'

  const parsed = new Date(trimmed)
  if (!Number.isFinite(parsed.getTime())) return trimmed

  return new Intl.DateTimeFormat(defaultLocale, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed)
}

export function extractRecord(payload: unknown, keys: string[]): JsonRecord {
  if (!isRecord(payload)) return {}

  for (const key of keys) {
    const value = payload[key]
    if (isRecord(value)) return value
  }

  return payload
}

export function unwrapApiPayload(payload: unknown): unknown {
  if (!isRecord(payload)) return payload

  const nested = payload.data ?? payload.result ?? payload.payload
  if (Array.isArray(nested) || isRecord(nested)) return nested

  return payload
}

export function extractList(payload: unknown, keys: string[]): unknown[] {
  const unwrapped = unwrapApiPayload(payload)
  if (Array.isArray(unwrapped)) return unwrapped
  if (!isRecord(unwrapped)) return []

  for (const key of keys) {
    const value = unwrapped[key]
    if (Array.isArray(value)) return value
    if (isRecord(value)) {
      const nestedItems = extractList(value, ['items', 'posts', 'results', 'featured', 'stories'])
      if (nestedItems.length) return nestedItems
    }
  }

  return []
}

export function extractCursorCollection<T>(
  payload: unknown,
  keys: string[],
  mapper: (value: unknown, index: number) => T,
  fallback: T[] = []
): HmrCursorCollection<T> {
  const unwrapped = unwrapApiPayload(payload)
  const items = extractList(unwrapped, keys)
  const record = isRecord(unwrapped) ? unwrapped : {}
  const nextCursor = pickOptionalString(record, ['next_cursor', 'nextCursor'])
  const hasMoreValue = record.has_more ?? record.hasMore

  return {
    items: (items.length ? items : fallback).map(mapper),
    nextCursor: nextCursor ?? null,
    hasMore: typeof hasMoreValue === 'boolean' ? hasMoreValue : Boolean(nextCursor),
  }
}
