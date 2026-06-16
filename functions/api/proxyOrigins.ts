export interface ProxyOriginEnv {
  ALLOWED_PREVIEW_ORIGINS?: string
}

const ALLOWED_ORIGINS = [
  'https://momichan.com',
  'https://www.momichan.com',
  'https://next.momichan.com',
  'https://himeri.momichan.com',
]
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

export function parseAllowedPreviewOrigins(env: ProxyOriginEnv): string[] {
  return (env.ALLOWED_PREVIEW_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function isAllowedOrigin(
  origin: string | null,
  isDev: boolean,
  env: ProxyOriginEnv
): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (isDev && DEV_ORIGINS.includes(origin)) return true
  if (parseAllowedPreviewOrigins(env).includes(origin)) return true
  return false
}
