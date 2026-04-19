export const AUTH_ROUTE_NAMES = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'auth-callback',
])

export function isAuthRouteName(routeName: string | undefined): boolean {
  return Boolean(routeName && AUTH_ROUTE_NAMES.has(routeName))
}
