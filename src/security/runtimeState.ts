export type SecurityLevel = 'public' | 'authenticated' | 'sensitive'
export type DataSensitivity = 'none' | 'profile' | 'security'
export type RiskMode = 'normal' | 'degraded'

type RuntimeSecurityState = {
  currentSecurityLevel: SecurityLevel
  riskMode: RiskMode
}

const runtimeSecurityState: RuntimeSecurityState = {
  currentSecurityLevel: 'public',
  riskMode: 'normal',
}

export function getRuntimeSecurityState(): RuntimeSecurityState {
  return { ...runtimeSecurityState }
}

export function getCurrentSecurityLevel(): SecurityLevel {
  return runtimeSecurityState.currentSecurityLevel
}

export function getRiskMode(): RiskMode {
  return runtimeSecurityState.riskMode
}

export function setCurrentSecurityLevel(level: SecurityLevel): void {
  runtimeSecurityState.currentSecurityLevel = level
}

export function enterRiskMode(reason: string, detail?: Record<string, unknown>): void {
  runtimeSecurityState.riskMode = 'degraded'

  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('security:risk-mode-changed', {
      detail: {
        riskMode: 'degraded',
        reason,
        ...detail,
      },
    })
  )
}

export function resetRiskMode(): void {
  runtimeSecurityState.riskMode = 'normal'

  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('security:risk-mode-changed', {
      detail: {
        riskMode: 'normal',
      },
    })
  )
}
