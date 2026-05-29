export type SecurityPanelId = 'credentials' | 'mfa' | 'devices' | 'activity'

export interface SecurityPanelDefinition {
  id: SecurityPanelId
  hash: string
  aliases?: string[]
}

export interface SecurityPanelCardCopy {
  credentialsKicker: string
  credentialsTitle: string
  credentialsDescription: string
  credentialsMetaLabel: string
  mfaKicker: string
  mfaTitle: string
  mfaDescription: string
  mfaMetaLabel: string
  devicesKicker: string
  devicesTitle: string
  devicesDescription: string
  devicesMetaLabel: string
  activityKicker: string
  activityTitle: string
  activityDescription: string
  activityMetaLabel: string
}

export interface SecurityPanelCard<TIcon = unknown> {
  id: SecurityPanelId
  panelId: SecurityPanelId
  hash: string
  icon: TIcon
  kicker: string
  title: string
  description: string
  metaLabel: string
  metaValue: string
}

export const SECURITY_PANEL_DEFINITIONS: readonly SecurityPanelDefinition[] = [
  {
    id: 'credentials',
    hash: '#credentials',
    aliases: ['#email'],
  },
  {
    id: 'mfa',
    hash: '#mfa',
  },
  {
    id: 'devices',
    hash: '#devices',
  },
  {
    id: 'activity',
    hash: '#activity',
  },
]

const DEFAULT_SECURITY_PANEL: SecurityPanelId = 'credentials'

export function resolveSecurityPanelFromHash(hash: string): SecurityPanelId {
  const normalizedHash = hash.trim().toLowerCase()
  const panel = SECURITY_PANEL_DEFINITIONS.find(
    (definition) =>
      definition.hash === normalizedHash || definition.aliases?.includes(normalizedHash)
  )

  return panel?.id ?? DEFAULT_SECURITY_PANEL
}

export function getSecurityPanelHash(panelId: SecurityPanelId): string {
  return (
    SECURITY_PANEL_DEFINITIONS.find((definition) => definition.id === panelId)?.hash ??
    SECURITY_PANEL_DEFINITIONS[0].hash
  )
}

export function shouldReplaceSecurityPanelHash(options: {
  currentHash: string
  panelId: SecurityPanelId
}): boolean {
  const { currentHash, panelId } = options
  return currentHash !== getSecurityPanelHash(panelId)
}

export function formatSecurityCount(value: number | null | undefined): string {
  return String(value ?? 0)
}

export function hasSecurityRiskSignals(failedLogins: number | null | undefined): boolean {
  return (failedLogins ?? 0) > 0
}

export function resolveLastLoginLabel(options: {
  value?: string | null
  fallback: string
  format: (value: string) => string
}): string {
  const { value, fallback, format } = options
  return value ? format(value) : fallback
}

export function buildSecurityPanelCards<TIcon>(options: {
  copy: SecurityPanelCardCopy
  icons: Record<SecurityPanelId, TIcon>
  authSourceSummaryLabel: string
  email: string
  unavailableLabel: string
  sessionCountLabel: string
  securityEventsCount: number | null | undefined
}): Array<SecurityPanelCard<TIcon>> {
  const {
    copy,
    icons,
    authSourceSummaryLabel,
    email,
    unavailableLabel,
    sessionCountLabel,
    securityEventsCount,
  } = options

  return SECURITY_PANEL_DEFINITIONS.map((definition) => {
    switch (definition.id) {
      case 'mfa':
        return {
          id: definition.id,
          panelId: definition.id,
          hash: definition.hash,
          icon: icons.mfa,
          kicker: copy.mfaKicker,
          title: copy.mfaTitle,
          description: copy.mfaDescription,
          metaLabel: copy.mfaMetaLabel,
          metaValue: authSourceSummaryLabel,
        }
      case 'devices':
        return {
          id: definition.id,
          panelId: definition.id,
          hash: definition.hash,
          icon: icons.devices,
          kicker: copy.devicesKicker,
          title: copy.devicesTitle,
          description: copy.devicesDescription,
          metaLabel: copy.devicesMetaLabel,
          metaValue: sessionCountLabel,
        }
      case 'activity':
        return {
          id: definition.id,
          panelId: definition.id,
          hash: definition.hash,
          icon: icons.activity,
          kicker: copy.activityKicker,
          title: copy.activityTitle,
          description: copy.activityDescription,
          metaLabel: copy.activityMetaLabel,
          metaValue: formatSecurityCount(securityEventsCount),
        }
      case 'credentials':
      default:
        return {
          id: definition.id,
          panelId: definition.id,
          hash: definition.hash,
          icon: icons.credentials,
          kicker: authSourceSummaryLabel,
          title: copy.credentialsTitle,
          description: copy.credentialsDescription,
          metaLabel: copy.credentialsMetaLabel,
          metaValue: email || unavailableLabel,
        }
    }
  })
}

export function resolveActiveSecurityPanelCard<TIcon>(options: {
  cards: Array<SecurityPanelCard<TIcon>>
  activePanel: SecurityPanelId
}): SecurityPanelCard<TIcon> | undefined {
  const { cards, activePanel } = options
  return cards.find((panel) => panel.id === activePanel) ?? cards[0]
}

export function resolveSecurityLoadErrorMessage(options: {
  error: unknown
  isApiError: (error: unknown) => error is { message: string }
  fallbackMessage: string
}): string {
  const { error, isApiError, fallbackMessage } = options
  return isApiError(error) ? error.message : fallbackMessage
}

export function buildSecurityRefreshTasks(tasks: {
  fetchProfile: () => Promise<unknown>
  fetchSessions: () => Promise<unknown>
  fetchSecuritySummary: () => Promise<unknown>
}): Array<Promise<unknown>> {
  const { fetchProfile, fetchSessions, fetchSecuritySummary } = tasks
  return [fetchProfile(), fetchSessions(), fetchSecuritySummary()]
}
