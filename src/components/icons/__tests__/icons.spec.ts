import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import IconGithub from '../IconGithub.vue'
import IconGoogle from '../IconGoogle.vue'
import IconInstagram from '../IconInstagram.vue'
import IconTiktok from '../IconTiktok.vue'
import IconX from '../IconX.vue'
import IconYoutube from '../IconYoutube.vue'
import * as IconRegistry from '../index'

const iconCases = [
  { name: 'github', component: IconGithub, size: 18, viewBox: '0 0 24 24' },
  { name: 'instagram', component: IconInstagram, size: 20, viewBox: '0 0 16 16' },
  { name: 'tiktok', component: IconTiktok, size: 22, viewBox: '0 0 16 16' },
  { name: 'x', component: IconX, size: 24, viewBox: '0 0 24 24' },
  { name: 'youtube', component: IconYoutube, size: 26, viewBox: '0 0 24 24' },
] as const

describe('custom icon components', () => {
  it.each(iconCases)(
    'renders $name icon with the requested size',
    ({ component, size, viewBox }) => {
      const wrapper = mount(component, {
        props: { size },
      })

      const svg = wrapper.get('svg')
      expect(svg.attributes('aria-hidden')).toBe('true')
      expect(svg.attributes('viewBox')).toBe(viewBox)
      expect(svg.attributes('width')).toBe(String(size))
      expect(svg.attributes('height')).toBe(String(size))
      expect(wrapper.findAll('path').length).toBeGreaterThan(0)
    }
  )

  it('renders IconGoogle as scalable svg and exposes registry exports', () => {
    const wrapper = mount(IconGoogle)
    const svg = wrapper.get('svg')

    expect(svg.classes()).toContain('icon-google')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(wrapper.findAll('path')).toHaveLength(4)

    expect(IconRegistry.IconGithub).toBeTruthy()
    expect(IconRegistry.IconGoogle).toBeTruthy()
    expect(IconRegistry.IconInstagram).toBeTruthy()
    expect(IconRegistry.IconTiktok).toBeTruthy()
    expect(IconRegistry.IconX).toBeTruthy()
    expect(IconRegistry.IconYoutube).toBeTruthy()
    expect(IconRegistry.Home).toBeTruthy()
    expect(IconRegistry.Search).toBeTruthy()
    expect(IconRegistry.CheckCircle).toBeTruthy()
  })
})
