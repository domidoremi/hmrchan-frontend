import { describe, expect, it } from 'vitest'

import {
  getPreferredPreviewLocale,
  isLocalRuntimeHost,
  isPagesPreviewHost,
  shouldEnableCloudflareAnalytics,
} from '../runtimeHost'

describe('runtimeHost', () => {
  it('treats Cloudflare Pages preview hosts as preview-only runtime targets', () => {
    const hostname = '92622931.hmrchan-frontend.pages.dev'

    expect(isPagesPreviewHost(hostname)).toBe(true)
    expect(shouldEnableCloudflareAnalytics(hostname)).toBe(false)
    expect(getPreferredPreviewLocale(hostname)).toBe('zh-CN')
  })

  it('recognizes local development hosts', () => {
    expect(isLocalRuntimeHost('localhost')).toBe(true)
    expect(getPreferredPreviewLocale('localhost')).toBeNull()
  })

  it('keeps production hosts on live runtime behavior', () => {
    const hostname = 'momichan.com'

    expect(isPagesPreviewHost(hostname)).toBe(false)
    expect(shouldEnableCloudflareAnalytics(hostname)).toBe(true)
    expect(getPreferredPreviewLocale(hostname)).toBeNull()
  })
})
