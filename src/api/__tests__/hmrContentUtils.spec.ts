import { describe, expect, it } from 'vitest'

import {
  cleanPostText,
  extractCursorCollection,
  extractList,
  hasRenderableMediaRecord,
  pickBoolean,
  pickNestedOptionalString,
  pickNumber,
  pickString,
  pickStringList,
  pickUsableUrl,
  trimText,
} from '@/api/hmrContentUtils'

describe('hmrContentUtils scalar pickers', () => {
  it('picks non-empty string and finite number values before falling back', () => {
    expect(pickString({ title: 'Signal boost' }, ['title'], 'fallback')).toBe('Signal boost')
    expect(pickString({ title: 42 }, ['title'], 'fallback')).toBe('42')
    expect(pickString({ title: '   ', count: Number.NaN }, ['title', 'count'], 'fallback')).toBe(
      'fallback'
    )
  })

  it('parses finite numeric values and ignores invalid candidates', () => {
    expect(pickNumber({ views: '1200' }, ['views'], 0)).toBe(1200)
    expect(
      pickNumber({ views: Number.POSITIVE_INFINITY, fallbackViews: 7 }, ['views', 'fallbackViews'])
    ).toBe(7)
    expect(pickNumber({ views: 'not-a-number' }, ['views'], 9)).toBe(9)
  })

  it('normalizes boolean-like candidates', () => {
    expect(pickBoolean({ pinned: ' true ' }, ['pinned'])).toBe(true)
    expect(pickBoolean({ pinned: 0, fallbackPinned: '1' }, ['pinned', 'fallbackPinned'])).toBe(
      false
    )
    expect(pickBoolean({ pinned: 'false' }, ['pinned'])).toBe(false)
  })

  it('normalizes string lists from arrays and comma-separated strings', () => {
    expect(pickStringList({ tags: [' alpha ', '', 7, 'beta'] }, ['tags'])).toEqual([
      'alpha',
      'beta',
    ])
    expect(pickStringList({ keywords: 'alpha, beta, ,gamma' }, ['keywords'], 2)).toEqual([
      'alpha',
      'beta',
    ])
  })

  it('picks usable URL strings while ignoring placeholders', () => {
    expect(
      pickUsableUrl({ thumbnail_url: ' # ', image_url: ' /image.webp ' }, [
        'thumbnail_url',
        'image_url',
      ])
    ).toBe('/image.webp')
  })

  it('picks nested optional strings only from record candidates', () => {
    expect(
      pickNestedOptionalString(
        {
          author: { display_name: 'Momi' },
          meta: null,
        },
        [
          ['meta', ['name']],
          ['author', ['display_name', 'name']],
        ]
      )
    ).toBe('Momi')
  })
})

describe('hmrContentUtils payload extraction', () => {
  it('unwraps API envelopes and nested list containers', () => {
    expect(
      extractList(
        {
          data: {
            feed: {
              posts: ['first', 'second'],
            },
          },
        },
        ['feed']
      )
    ).toEqual(['first', 'second'])
  })

  it('builds cursor collections from payload data or fallback rows', () => {
    const collection = extractCursorCollection(
      {
        payload: {
          items: [{ id: 'api-1' }],
          next_cursor: 'cursor-2',
        },
      },
      ['items'],
      (item, index) => ({ item, index })
    )

    expect(collection).toEqual({
      items: [{ item: { id: 'api-1' }, index: 0 }],
      nextCursor: 'cursor-2',
      hasMore: true,
    })

    expect(extractCursorCollection({}, ['items'], String, ['fallback'])).toEqual({
      items: ['fallback'],
      nextCursor: null,
      hasMore: false,
    })
  })
})

describe('hmrContentUtils media and text normalization', () => {
  it('detects renderable media records while excluding text-only kinds', () => {
    expect(hasRenderableMediaRecord({ media_type: 'plain_text', image_url: '/cover.webp' })).toBe(
      false
    )
    expect(hasRenderableMediaRecord({ thumbnail_url: '/cover.webp' })).toBe(true)
    expect(hasRenderableMediaRecord({ media_type: 'video' })).toBe(true)
  })

  it('cleans social text before trimming previews', () => {
    expect(cleanPostText('RT @source: Hello @member #topic https://example.test')).toBe('Hello')
    expect(trimText('Alpha beta gamma delta', 12)).toBe('Alpha beta g\u2026')
  })
})
