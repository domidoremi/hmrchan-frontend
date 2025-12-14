export type UnauthorizedHandler = () => void | Promise<void>
export type AuthTokenGetter = () => string | null

let onUnauthorized: UnauthorizedHandler = () => {}
let getAuthToken: AuthTokenGetter = () => null

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler
}

export function setAuthTokenGetter(getter: AuthTokenGetter) {
  getAuthToken = getter
}

export function readAuthToken(): string | null {
  return getAuthToken()
}

export async function handleUnauthorized(): Promise<void> {
  try {
    await onUnauthorized()
  } catch {
    // ignore
  }
}
