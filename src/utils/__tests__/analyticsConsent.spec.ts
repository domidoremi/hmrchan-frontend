import { beforeEach, describe, expect, it } from 'vitest'
import {
  canTrackAnalytics,
  canTrackPerformance,
  resetAnalyticsConsent,
  updateAnalyticsConsent,
} from '../analyticsConsent'

describe('analyticsConsent', () => {
  beforeEach(() => {
    resetAnalyticsConsent()
  })

  it('blocks analytics until explicit consent is granted', () => {
    expect(canTrackAnalytics()).toBe(false)
    expect(canTrackPerformance()).toBe(false)

    updateAnalyticsConsent({
      cookieConsent: true,
      analyticsEnabled: true,
      performanceCookiesEnabled: false,
    })

    expect(canTrackAnalytics()).toBe(true)
    expect(canTrackPerformance()).toBe(false)
  })

  it('allows analytics and performance independently once cookie consent is granted', () => {
    updateAnalyticsConsent({
      cookieConsent: true,
      analyticsEnabled: true,
      performanceCookiesEnabled: true,
    })

    expect(canTrackAnalytics()).toBe(true)
    expect(canTrackPerformance()).toBe(true)
  })
})
