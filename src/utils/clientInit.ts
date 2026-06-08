type ClientInitEnv = {
  readonly VITE_ENABLE_CLIENT_INIT?: string
}

export function shouldEnableClientInit(env: ClientInitEnv): boolean {
  const raw = env.VITE_ENABLE_CLIENT_INIT
  if (raw === undefined || raw.trim() === '') return true
  return raw.trim().toLowerCase() !== 'false'
}

export function markClientInitDisabled(documentRef: Pick<Document, 'documentElement'>): void {
  documentRef.documentElement.dataset.clientInit = 'disabled'
}
