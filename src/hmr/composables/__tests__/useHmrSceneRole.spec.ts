import { describe, expect, it } from 'vitest'

import { resolveHmrPresetSceneFit, resolveHmrSceneRole } from '@/hmr/composables/useHmrSceneRole'

describe('resolveHmrSceneRole', () => {
  it('maps explicit route page keys to theme scene roles', () => {
    expect(resolveHmrSceneRole({ meta: { pageKey: 'home' } })).toBe('narrative')
    expect(resolveHmrSceneRole({ meta: { pageKey: 'explore' } })).toBe('immersive')
    expect(resolveHmrSceneRole({ meta: { pageKey: 'post' } })).toBe('immersive')
    expect(resolveHmrSceneRole({ meta: { pageKey: 'community' } })).toBe('discussion')
    expect(resolveHmrSceneRole({ meta: { pageKey: 'schedule' } })).toBe('productivity')
    expect(resolveHmrSceneRole({ meta: { pageKey: 'settings' } })).toBe('productivity')
    expect(resolveHmrSceneRole({ meta: { pageKey: 'login' } })).toBe('editorial')
    expect(resolveHmrSceneRole({ meta: { pageKey: 'profile' } })).toBe('editorial')
  })

  it('falls back to route names and paths when metadata is absent', () => {
    expect(resolveHmrSceneRole({ name: 'hmr-discussion-detail', path: '/community/1' })).toBe(
      'discussion'
    )
    expect(resolveHmrSceneRole({ name: 'hmr-post-detail', path: '/posts/1' })).toBe('immersive')
    expect(resolveHmrSceneRole({ name: 'hmr-schedule', path: '/schedule' })).toBe('productivity')
    expect(resolveHmrSceneRole({ name: 'hmr-auth-callback', path: '/auth/callback' })).toBe(
      'editorial'
    )
    expect(resolveHmrSceneRole({ path: '/about' })).toBe('narrative')
  })

  it('marks whether a preset is native to the active scene role', () => {
    expect(resolveHmrPresetSceneFit('immersive', ['playful', 'immersive', 'discussion'])).toBe(
      'native'
    )
    expect(resolveHmrPresetSceneFit('discussion', ['narrative', 'immersive', 'playful'])).toBe(
      'adaptive'
    )
  })
})
