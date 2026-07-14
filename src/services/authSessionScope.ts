export interface AuthSessionSnapshot {
  epoch: number
  principalId: string | null
}

export interface AuthSessionOperation {
  signal: AbortSignal
  snapshot: AuthSessionSnapshot
  isCurrent(): boolean
  dispose(): void
}

type AuthSessionListener = (snapshot: AuthSessionSnapshot) => void

let epoch = 0
let principalId: string | null = null
const activeControllers = new Set<AbortController>()
const listeners = new Set<AuthSessionListener>()

function normalizePrincipalId(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized || null
}

export function captureAuthSessionSnapshot(): AuthSessionSnapshot {
  return { epoch, principalId }
}

export function isAuthSessionSnapshotCurrent(snapshot: AuthSessionSnapshot): boolean {
  return snapshot.epoch === epoch && snapshot.principalId === principalId
}

export function transitionAuthSessionScope(
  nextPrincipalId: string | null | undefined
): AuthSessionSnapshot {
  epoch += 1
  principalId = normalizePrincipalId(nextPrincipalId)

  for (const controller of activeControllers) {
    controller.abort()
  }
  activeControllers.clear()

  const snapshot = captureAuthSessionSnapshot()
  for (const listener of listeners) {
    listener(snapshot)
  }
  return snapshot
}

export function createAuthSessionOperation(expectedPrincipalId: string): AuthSessionOperation {
  const expected = normalizePrincipalId(expectedPrincipalId)
  const snapshot = captureAuthSessionSnapshot()
  const controller = new AbortController()

  if (!expected || snapshot.principalId !== expected) {
    controller.abort()
  } else {
    activeControllers.add(controller)
  }

  return {
    signal: controller.signal,
    snapshot,
    isCurrent() {
      return !controller.signal.aborted && isAuthSessionSnapshotCurrent(snapshot)
    },
    dispose() {
      activeControllers.delete(controller)
    },
  }
}

export function subscribeAuthSessionScope(listener: AuthSessionListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
