export interface AnalyticsConsentSnapshot {
  cookieConsent: boolean | null
  analyticsEnabled: boolean
  performanceCookiesEnabled: boolean
}

const DEFAULT_CONSENT: AnalyticsConsentSnapshot = {
  cookieConsent: null,
  analyticsEnabled: false,
  performanceCookiesEnabled: false,
}

let currentConsent: AnalyticsConsentSnapshot = { ...DEFAULT_CONSENT }

export function updateAnalyticsConsent(snapshot: Partial<AnalyticsConsentSnapshot>): void {
  currentConsent = {
    ...currentConsent,
    ...snapshot,
  }
}

export function resetAnalyticsConsent(): void {
  currentConsent = { ...DEFAULT_CONSENT }
}

export function getAnalyticsConsent(): AnalyticsConsentSnapshot {
  return { ...currentConsent }
}

export function canTrackAnalytics(snapshot: AnalyticsConsentSnapshot = currentConsent): boolean {
  return (
    snapshot.cookieConsent === true &&
    snapshot.analyticsEnabled === true &&
    snapshot.performanceCookiesEnabled === true
  )
}
