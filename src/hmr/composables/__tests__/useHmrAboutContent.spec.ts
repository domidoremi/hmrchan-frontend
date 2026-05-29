import { describe, expect, it } from 'vitest'

import { aboutCardStyle, useHmrAboutContent } from '@/hmr/composables/useHmrAboutContent'

describe('useHmrAboutContent', () => {
  it('exposes the about page content groups', () => {
    const about = useHmrAboutContent()

    expect(about.tornadoItems).toEqual(['精选内容', '创作者', '社区回应', '发布日程', '反馈通道'])
    expect(about.systemMap.map((item) => item.title)).toEqual([
      '内容发现',
      '社区互动',
      '身份安全',
      '发布日程',
    ])
    expect(about.principles.map((item) => item.index)).toEqual(['01', '02', '03', '04'])
  })

  it('cycles ribbon card color pairs', () => {
    expect(aboutCardStyle(0)).toEqual({
      '--hmr-card-start': '#ff7722',
      '--hmr-card-end': '#3d2fa9',
    })
    expect(aboutCardStyle(5)).toEqual(aboutCardStyle(0))
  })
})
