import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import JournalState from '../JournalState.vue'
import JournalResourceState from '../JournalResourceState.vue'
import JournalImage from '../JournalImage.vue'
import { createJournalTestI18n } from './journalTestI18n'

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

describe('localized Journal states', () => {
  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'keeps loading, error and empty distinct in %s',
    async (locale) => {
      const i18n = createJournalTestI18n(locale)
      const wrapper = mount(JournalResourceState, {
        props: {
          state: 'loading',
          label: '日程',
          labelKey: 'nav.schedule',
          empty: true,
          emptyMessage: '本月暂无日程',
          emptyMessageKey: 'journal.calendar.noneThisMonth',
        },
        global: { plugins: [i18n] },
      })
      wrappers.push(wrapper)
      expect(wrapper.get('[role="status"]').text()).toBe(
        i18n.global.t('journal.states.loading', { label: i18n.global.t('nav.schedule') })
      )
      expect(wrapper.find('button').exists()).toBe(false)
      await wrapper.setProps({ state: 'error' })
      const retry = wrapper.get('button')
      expect(retry.attributes('aria-label')).toBe(
        i18n.global.t('journal.states.retryNamed', { label: i18n.global.t('nav.schedule') })
      )
      await retry.trigger('click')
      expect(wrapper.emitted('retry')).toHaveLength(1)
      await wrapper.setProps({ state: 'ready' })
      expect(wrapper.get('[role="status"]').text()).toBe(
        i18n.global.t('journal.calendar.noneThisMonth')
      )
      await wrapper.setProps({ empty: false })
      expect(wrapper.find('.home-resource-state').exists()).toBe(false)
    }
  )

  it('keeps unknown supplied resource labels as data', () => {
    const i18n = createJournalTestI18n('en')
    const label = '作者的特别分类 <&>'
    const wrapper = mount(JournalResourceState, {
      props: { state: 'error', label, empty: false, emptyMessage: '作者的原文' },
      global: { plugins: [i18n] },
    })
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain(label)
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.get('button').attributes('aria-label')).toBe(
      i18n.global.t('journal.states.retryNamed', { label })
    )
  })

  it('uses a stable UI error and preserves the retry event without translating raw errors', async () => {
    const i18n = createJournalTestI18n('en')
    const raw = 'upstream 中文 exception / common.search'
    const wrapper = mount(JournalState, {
      props: { loading: false, error: raw },
      global: { plugins: [i18n] },
    })
    wrappers.push(wrapper)
    expect(wrapper.get('p').text()).toBe(i18n.global.t('common.loadingFailed'))
    expect(wrapper.text()).not.toContain(raw)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(wrapper.get('button').text()).toBe(i18n.global.t('common.retry'))
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('changes image failure copy while preserving the author alt and fallback node', async () => {
    const i18n = createJournalTestI18n('en')
    const alt = '作者照片「原題」'
    const wrapper = mount(JournalImage, {
      props: { src: '/missing-photo.webp', alt },
      global: { plugins: [i18n], stubs: { JournalIcon: true } },
    })
    wrappers.push(wrapper)
    await wrapper.get('img').trigger('error')
    const fallback = wrapper.get('.image-fallback')
    expect(fallback.attributes('aria-label')).toBe(alt)
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(wrapper.get('.image-fallback').element).toBe(fallback.element)
    expect(fallback.attributes('aria-label')).toBe(alt)
    expect(fallback.text()).toBe(i18n.global.t('journal.gallery.imageUnavailable'))
  })
})
