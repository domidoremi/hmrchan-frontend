import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'

import enUS from '@/i18n/locales/en-US.json'
import jaJP from '@/i18n/locales/ja-JP.json'
import zhCN from '@/i18n/locales/zh-CN.json'
import AboutPage from '@/views/AboutPage.vue'

function mountAboutPage(locale = 'zh-CN') {
  return mount(AboutPage, {
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale,
          messages: {
            'zh-CN': zhCN,
            'en-US': enUS,
            'ja-JP': jaJP,
          },
        }),
      ],
    },
  })
}

describe('AboutPage', () => {
  it('renders Himeri profile, official links, features, and technology links', () => {
    const wrapper = mountAboutPage()

    expect(wrapper.text()).toContain('籾山ひめり')
    expect(wrapper.text()).toContain('2004年3月22日')
    expect(wrapper.text()).toContain('高嶺のなでしこ')
    expect(wrapper.text()).toContain('一本共同相册')
    expect(wrapper.find('a[href="https://takanenonadeshiko.jp/himeri_momiyama/"]').exists()).toBe(
      true
    )
    expect(wrapper.find('a[href="https://vite.dev/"]').exists()).toBe(true)
    expect(wrapper.find('a[href="https://bun.sh/"]').exists()).toBe(true)
  })

  it('renders translated English content from the active locale', () => {
    const wrapper = mountAboutPage('en-US')

    expect(wrapper.text()).toContain('Momiyama Himeri')
    expect(wrapper.text()).toContain('Official Websites')
    expect(wrapper.text()).toContain('Technical Implementation')
  })
})
