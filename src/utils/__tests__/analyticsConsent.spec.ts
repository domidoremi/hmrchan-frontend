import { beforeEach, describe, expect, it } from 'vitest'
import {
  canTrackAnalytics,
  resetAnalyticsConsent,
  updateAnalyticsConsent,
} from '../analyticsConsent'

describe('analyticsConsent', () => {
  beforeEach(() => {
    resetAnalyticsConsent()
  })

  it('blocks analytics until explicit consent is granted', () => {
    expect(canTrackAnalytics()).toBe(false)

    updateAnalyticsConsent({
      cookieConsent: true,
      analyticsEnabled: true,
      performanceCookiesEnabled: false,
    })

    expect(canTrackAnalytics()).toBe(false)
  })

  it('allows analytics when all required consent flags are enabled', () => {
    updateAnalyticsConsent({
      cookieConsent: true,
      analyticsEnabled: true,
      performanceCookiesEnabled: true,
    })

    expect(canTrackAnalytics()).toBe(true)
  })
})
