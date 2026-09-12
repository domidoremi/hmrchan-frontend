import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import PostActionStrip from '../PostActionStrip.vue'

const CURRENT_POST_ID = '01890f47-6a35-7cc4-8a2d-7f5b56c9e001'
const TARGET_POST_ID = '01890f47-6a35-7cc4-8a2d-7f5b56c9e002'

async function mountStrip(externalLinks: unknown, variant: 'default' | 'compact' = 'compact') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/post/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages: {
      'zh-CN': {
        common: { error: '错误' },
        comment: { shareSuccess: '已分享' },
        post: {
          favorite: '收藏',
          unfavorite: '取消收藏',
          share: '分享',
          subtitlesAvailable: '字幕可用',
          viewOnTikTok: '在 TikTok 查看',
          viewOnYouTube: '在 YouTube 查看',
          viewLinkedPost: '查看关联 HMRChan 帖子',
        },
      },
    },
  })

  return {
    wrapper: mount(PostActionStrip, {
      props: {
        postId: CURRENT_POST_ID,
        externalLinks,
        variant,
      },
      global: {
        plugins: [createPinia(), router, i18n],
        stubs: {
          AnimatedIcon: { template: '<span class="animated-icon-stub" />' },
        },
      },
    }),
    router,
  }
}

describe('PostActionStrip', () => {
  it('renders secure external actions and a sibling linked-post action in compact mode', async () => {
    const { wrapper, router } = await mountStrip([
      {
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@creator/video/1',
        target_post_id: TARGET_POST_ID,
      },
      { platform: 'youtube', url: 'https://youtu.be/video' },
    ])

    const external = wrapper.findAll('a[target="_blank"]')
    expect(external).toHaveLength(2)
    expect(external[0]?.text()).toContain('在 TikTok 查看')
    expect(external[1]?.text()).toContain('在 YouTube 查看')
    expect(external[0]?.attributes()).toMatchObject({
      href: 'https://www.tiktok.com/@creator/video/1',
      target: '_blank',
      rel: 'noopener noreferrer',
    })

    const linkedPost = wrapper.find(`a[href="/post/${TARGET_POST_ID}"]`)
    expect(linkedPost.exists()).toBe(true)
    expect(linkedPost.text()).toContain('查看关联 HMRChan 帖子')
    expect(linkedPost.element.closest('button')).toBeNull()
    await linkedPost.trigger('click')
    expect(wrapper.emitted('internalNavigate')).toEqual([[TARGET_POST_ID]])
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe(`/post/${TARGET_POST_ID}`))
    expect(wrapper.findAll('button')).toHaveLength(2)
    expect(wrapper.findAll('button a, a button, a a')).toHaveLength(0)
  })

  it('drops unsafe links and suppresses a self-target without dropping its external action', async () => {
    const { wrapper } = await mountStrip([
      {
        platform: 'youtube',
        url: 'https://youtu.be/video',
        target_post_id: CURRENT_POST_ID,
      },
      { platform: 'youtube', url: 'https://youtube.com.evil.test/video' },
    ])

    expect(wrapper.findAll('a[target="_blank"]')).toHaveLength(1)
    expect(wrapper.find(`a[href="/post/${CURRENT_POST_ID}"]`).exists()).toBe(false)
  })
})
