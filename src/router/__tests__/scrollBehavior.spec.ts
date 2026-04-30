import { describe, expect, it } from 'vitest'

import { shouldPreserveScrollForNavigation } from '../index'

describe('router scroll preservation', () => {
  it('preserves scroll for state-only navigation on the same fullPath', () => {
    expect(
      shouldPreserveScrollForNavigation(
        {
          fullPath: '/',
          meta: {},
        },
        {
          fullPath: '/',
          meta: {},
        }
      )
    ).toBe(true)
  })

  it('preserves scroll for intra-view routes that opt into shared view keys', () => {
    expect(
      shouldPreserveScrollForNavigation(
        {
          fullPath: '/schedule/abc',
          meta: {
            viewKey: 'schedule',
            preserveScrollOnIntraViewNav: true,
          },
        },
        {
          fullPath: '/schedule',
          meta: {
            viewKey: 'schedule',
            preserveScrollOnIntraViewNav: true,
          },
        }
      )
    ).toBe(true)
  })

  it('preserves scroll for same-route modal and preview state transitions', () => {
    expect(
      shouldPreserveScrollForNavigation(
        {
          fullPath: '/?preview=post-1',
          meta: {
            viewKey: 'home',
            preserveScrollOnIntraViewNav: true,
          },
        },
        {
          fullPath: '/',
          meta: {
            viewKey: 'home',
            preserveScrollOnIntraViewNav: true,
          },
        }
      )
    ).toBe(true)
  })

  it('does not preserve scroll across unrelated routes by default', () => {
    expect(
      shouldPreserveScrollForNavigation(
        {
          fullPath: '/about',
          meta: {},
        },
        {
          fullPath: '/',
          meta: {},
        }
      )
    ).toBe(false)
  })
})
