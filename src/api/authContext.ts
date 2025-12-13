export type AuthTokenGetter = () => string | null
export type UnauthorizedHandler = () => void | Promise<void>

let getAuthToken: AuthTokenGetter = () => null
let onUnauthorized: UnauthorizedHandler = () => {}

export function setAuthTokenGetter(getter: AuthTokenGetter) {
  getAuthToken = getter
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler
}

export function readAuthToken(): string | null {
  try {
    return getAuthToken()
  } catch {
    return null
  }
}

export async function handleUnauthorized(): Promise<void> {
  try {
    await onUnauthorized()
  } catch {
    // ignore
  }
}
