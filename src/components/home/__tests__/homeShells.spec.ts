import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/business/PostPreviewModal.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockPostPreviewModal',
      props: ['isOpen', 'postId', 'initialPost', 'initialThumbnailSrc'],
      emits: ['update:isOpen', 'open-detail'],
      template:
        '<div data-testid="post-preview-modal" :data-open="String(isOpen)" :data-post-id="postId" :data-thumb="initialThumbnailSrc" @click="$emit(\'open-detail\', postId)"></div>',
    }),
  }
})

import FeaturedRailSection from '../FeaturedRailSection.vue'
import HeroSection from '../HeroSection.vue'
import HomepagePreviewController from '../HomepagePreviewController.vue'
import StoryDeckSection from '../StoryDeckSection.vue'

describe('home shell components', () => {
  it('renders HeroSection only when enabled and applies animated class', () => {
    const disabled = mount(HeroSection, {
      props: {
        enabled: false,
        animated: true,
      },
      slots: {
        default: '<p>hero</p>',
      },
    })

    expect(disabled.html()).toBe('<!--v-if-->')

    const enabled = mount(HeroSection, {
      props: {
        enabled: true,
        animated: true,
      },
      slots: {
        default: '<p class="hero-slot">hero</p>',
      },
    })

    expect(enabled.classes()).toEqual(
      expect.arrayContaining(['hero', 'home-screen', 'hero--animated'])
    )
    expect(enabled.attributes('data-scroll-anchor')).toBe('home-hero')
    expect(enabled.get('.hero-slot').text()).toBe('hero')
  })

  it('renders FeaturedRailSection anchors, active state, and exposes the root element', () => {
    const slides = [
      { key: 'alpha', label: 'Alpha' },
      { key: 'beta', label: 'Beta' },
    ]

    const wrapper = mount(FeaturedRailSection, {
      props: {
        sceneStyle: { '--scene-progress': '0.4' },
        trackStyle: { transform: 'translateX(-10%)' },
        slides,
        activeIndex: 1,
        activeKey: 'beta',
        activeLabel: 'Beta',
      },
      slots: {
        default: '<article class="slide-card">slide</article>',
      },
    })

    const anchors = wrapper.findAll('.rail-scroll-anchor')
    expect(anchors).toHaveLength(2)
    expect(anchors[0]?.attributes('data-scroll-anchor')).toBe('home-featured-alpha')
    expect(wrapper.attributes('data-scroll-anchor-root')).toBe('home-featured')
    expect(wrapper.attributes('data-scroll-anchor-step-count')).toBe('2')
    expect(wrapper.find('.rail-stage__index').text()).toBe('02')
    expect(wrapper.find('.rail-stage__label').text()).toBe('Beta')
    expect(wrapper.findAll('.rail-stage__dot.is-active')).toHaveLength(1)
    expect(wrapper.find('.slide-card').exists()).toBe(true)
    expect((wrapper.vm as { element: HTMLElement | null }).element).toBeInstanceOf(HTMLElement)
  })

  it('renders StoryDeckSection with styles and exposed element reference', () => {
    const wrapper = mount(StoryDeckSection, {
      props: {
        sceneStyle: { opacity: '0.8' },
      },
      slots: {
        default: '<div class="story-slot">story</div>',
      },
    })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['media-slices', 'home-screen']))
    expect(wrapper.attributes('data-scroll-anchor')).toBe('home-story')
    expect(wrapper.attributes('style')).toContain('opacity: 0.8;')
    expect(wrapper.get('.story-slot').text()).toBe('story')
    expect((wrapper.vm as { element: HTMLElement | null }).element).toBeInstanceOf(HTMLElement)
  })

  it('passes preview state through HomepagePreviewController and re-emits open-detail', async () => {
    const initialPost = {
      id: 'post-1',
      title: 'Preview',
    }

    const wrapper = mount(HomepagePreviewController, {
      props: {
        isOpen: true,
        postId: 'post-1',
        initialPost,
        initialThumbnailSrc: 'thumb.jpg',
        'onUpdate:isOpen': (value: boolean) => wrapper.setProps({ isOpen: value }),
      },
    })

    const modal = wrapper.get('[data-testid="post-preview-modal"]')
    expect(modal.attributes('data-open')).toBe('true')
    expect(modal.attributes('data-post-id')).toBe('post-1')
    expect(modal.attributes('data-thumb')).toBe('thumb.jpg')

    await modal.trigger('click')
    expect(wrapper.emitted('open-detail')).toEqual([['post-1']])
  })
})
