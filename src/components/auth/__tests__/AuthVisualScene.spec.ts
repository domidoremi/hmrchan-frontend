import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AuthVisualScene from '../AuthVisualScene.vue'

describe('AuthVisualScene', () => {
  it('renders default login scene copy and caption', () => {
    const wrapper = mount(AuthVisualScene, {
      props: {
        title: 'Welcome back',
        subtitle: 'Sign in to resume',
      },
    })

    expect(wrapper.attributes('role')).toBe('presentation')
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.classes()).toContain('auth-scene')
    expect(wrapper.find('.scene-stage').classes()).toEqual(
      expect.arrayContaining(['scene-stage--login', 'scene-stage--mood-idle'])
    )
    expect(wrapper.find('.scene-copy-card__eyebrow').text()).toBe('Return')
    expect(wrapper.find('.scene-copy-card__title').text()).toBe('Welcome back')
    expect(wrapper.find('.scene-copy-card__subtitle').text()).toBe('Sign in to resume')
    expect(wrapper.find('.scene-caption').text()).toBe('Sign in to resume')
  })

  it('switches scene labels and compact mode for register/forgot moods', async () => {
    const wrapper = mount(AuthVisualScene, {
      props: {
        title: 'Create account',
        subtitle: 'Join now',
        sceneKind: 'register',
        mood: 'typing',
        showCopy: false,
      },
    })

    expect(wrapper.classes()).toContain('auth-scene--compact')
    expect(wrapper.find('.scene-stage').classes()).toEqual(
      expect.arrayContaining(['scene-stage--register', 'scene-stage--mood-typing'])
    )
    expect(wrapper.find('.scene-copy-card__eyebrow').text()).toBe('Grow')
    expect(wrapper.find('.scene-caption').exists()).toBe(false)

    await wrapper.setProps({ sceneKind: 'forgot', mood: 'success', showCopy: true })

    expect(wrapper.find('.scene-stage').classes()).toEqual(
      expect.arrayContaining(['scene-stage--forgot', 'scene-stage--mood-success'])
    )
    expect(wrapper.find('.scene-copy-card__eyebrow').text()).toBe('Restore')
    expect(wrapper.find('.scene-caption').text()).toBe('Join now')
  })
})
