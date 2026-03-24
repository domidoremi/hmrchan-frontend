import { describe, expect, it } from 'vitest'

import {
  getPreferredPreviewLocale,
  isLocalRuntimeHost,
  isPagesPreviewHost,
  shouldEnableCloudflareAnalytics,
  shouldExposeFallbackPreviewNotice,
  shouldUsePreviewHomepageFallback,
} from '../runtimeHost'

describe('runtimeHost', () => {
  it('treats Cloudflare Pages preview hosts as preview-only runtime targets', () => {
    const hostname = '92622931.hmrchan-frontend.pages.dev'

    expect(isPagesPreviewHost(hostname)).toBe(true)
    expect(shouldUsePreviewHomepageFallback(hostname)).toBe(true)
    expect(shouldEnableCloudflareAnalytics(hostname)).toBe(false)
    expect(shouldExposeFallbackPreviewNotice(hostname)).toBe(false)
    expect(getPreferredPreviewLocale(hostname)).toBe('zh-CN')
  })

  it('only exposes fallback notices on local development hosts', () => {
    expect(isLocalRuntimeHost('localhost')).toBe(true)
    expect(shouldExposeFallbackPreviewNotice('localhost')).toBe(true)
    expect(shouldUsePreviewHomepageFallback('localhost')).toBe(false)
    expect(getPreferredPreviewLocale('localhost')).toBeNull()
  })

  it('keeps production hosts on live runtime behavior', () => {
    const hostname = 'momichan.xyz'

    expect(isPagesPreviewHost(hostname)).toBe(false)
    expect(shouldUsePreviewHomepageFallback(hostname)).toBe(false)
    expect(shouldEnableCloudflareAnalytics(hostname)).toBe(true)
    expect(shouldExposeFallbackPreviewNotice(hostname)).toBe(false)
    expect(getPreferredPreviewLocale(hostname)).toBeNull()
  })
})
