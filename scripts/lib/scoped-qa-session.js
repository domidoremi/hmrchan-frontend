import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { isIP } from 'node:net'

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const configuredPages = new WeakSet()
let lastNavigationAt = 0

export async function paceScopedQaNavigation(env) {
  if (env.LOCAL_AUDIT_SCOPED_QA_SESSION !== 'true') return
  const delay = Math.max(0, lastNavigationAt + 6500 - Date.now())
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
  lastNavigationAt = Date.now()
}

export async function configureScopedQaPage(page, env, baseUrl) {
  const origin = validateScopedQaSettings(env, baseUrl)
  if (!origin) return
  await paceScopedQaNavigation(env)
  if (configuredPages.has(page)) return
  configuredPages.add(page)
  await page.evaluateOnNewDocument(() => {
    if (!window.PublicKeyCredential) return
    try {
      Object.defineProperty(window.PublicKeyCredential, 'isConditionalMediationAvailable', {
        configurable: true,
        value: async () => false,
      })
    } catch {
      // Leave browser behavior untouched when this property cannot be configured.
    }
  })
}

function docker(args, input) {
  return execFileSync('docker', args, {
    input,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 20000,
  })
}

function sql(statement) {
  return docker(
    [
      'exec',
      '-i',
      'hmrchan-postgres',
      'psql',
      '-X',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'hmrchan',
      '-d',
      'hmr_identity',
      '-At',
    ],
    statement
  ).trim()
}

function redis(commands) {
  const container = JSON.parse(docker(['inspect', 'hmrchan-identity-api']))[0]
  const secretFile = container.Config.Env.find((value) =>
    value.startsWith('REDIS_PASSWORD_FILE=')
  )?.slice('REDIS_PASSWORD_FILE='.length)
  if (!secretFile?.startsWith('/run/secrets/')) throw new Error('Redis secret file unavailable')
  const secret = docker(['exec', 'hmrchan-identity-api', 'cat', secretFile]).trim()
  const resp = [['AUTH', secret], ['SELECT', '2'], ...commands]
    .map(
      (parts) =>
        `*${parts.length}\r\n${parts.map((part) => `$${Buffer.byteLength(String(part))}\r\n${part}\r\n`).join('')}`
    )
    .join('')
  const result = docker(['exec', '-i', 'hmrchan-redis', 'redis-cli', '--pipe'], resp)
  if (!/errors: 0/.test(result)) throw new Error('Scoped fixture cache failed')
}

export function validateScopedQaSettings(env, baseUrl) {
  if (env.LOCAL_AUDIT_SCOPED_QA_SESSION !== 'true') return false
  const origin = new URL(baseUrl).origin
  const origins = String(env.LOCAL_AUDIT_SCOPED_ORIGINS || '').split(',')
  if (!origins.includes(origin)) throw new Error('Scoped QA origin is not explicitly allowed')
  if (!/^qa-[a-z0-9-]{6,40}$/.test(env.PRIMARY_USERNAME || ''))
    throw new Error('Dedicated QA account required')
  if (
    env.LOCAL_AUDIT_SCOPED_FINGERPRINT &&
    !/^[a-f0-9]{48}$/.test(env.LOCAL_AUDIT_SCOPED_FINGERPRINT)
  )
    throw new Error('Invalid scoped QA fingerprint')
  return origin
}

export function buildScopedQaCacheCommands(record, fingerprint, headers) {
  if (
    !/^[a-f0-9]{48}$/.test(fingerprint) ||
    record.fingerprint !== fingerprint ||
    !isIP(record.ip)
  ) {
    throw new Error('QA visitor binding did not match')
  }
  if (record.canonical && !/^[a-f0-9]{64}$/.test(record.canonical))
    throw new Error('Invalid QA canonical fingerprint')
  const commands = []
  for (const fp of new Set([record.fingerprint, record.canonical].filter(Boolean))) {
    commands.push(['SET', `visitor:${record.ip}:${fp}`, 'basic', 'EX', '600'])
    const trust = sha256(
      [
        record.ip,
        headers['user-agent'] || '',
        headers['sec-ch-ua'] || '',
        headers['sec-ch-ua-platform'] || '',
        headers['accept-language'] || '',
        fp,
      ].join('|')
    )
    commands.push(['SET', `turnstile:trust:${trust}`, '1', 'EX', '600'])
  }
  return commands
}

// This explicit fixture covers authenticated UI behavior, not CAPTCHA delivery.
// It never scans visitors or changes global rate limits and security configuration.
export async function prepareScopedQaSession(page, env, baseUrl) {
  const origin = validateScopedQaSettings(env, baseUrl)
  if (!origin) return false
  const count = sql(
    `SELECT count(*) FROM users WHERE username='${env.PRIMARY_USERNAME}' AND email LIKE '%@local-smoke.invalid';`
  )
  if (count !== '1') throw new Error('Dedicated QA account was not found')

  await configureScopedQaPage(page, env, baseUrl)
  const fingerprint = env.LOCAL_AUDIT_SCOPED_FINGERPRINT || randomBytes(24).toString('hex')
  await page.goto(`${origin}/robots.txt`, { waitUntil: 'domcontentloaded' })
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${origin}/api/v1/client/init` &&
      response.request().postData()?.includes(fingerprint)
  )
  const result = await page.evaluate(async (value) => {
    localStorage.setItem(
      'momi_device_fingerprint_v1',
      JSON.stringify({
        value,
        cachedAt: Date.now(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        source: 'oss_browser',
        componentsVersion: 'hmr-browser-fallback-v1',
      })
    )
    localStorage.removeItem('momi_client_security')
    const response = await fetch('/api/v1/client/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_fingerprint: value,
        client_type: 'web',
        fingerprint_source: 'oss_browser',
        fingerprint_components_version: 'hmr-browser-fallback-v1',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen_resolution: `${screen.width}x${screen.height}`,
        platform: navigator.platform,
        timestamp: Math.floor(Date.now() / 1000),
        nonce: crypto.randomUUID().replaceAll('-', ''),
        force_reissue: true,
      }),
    })
    const body = await response.json()
    if (!response.ok || !body.data?.client_token) throw new Error('Scoped QA initialization failed')
    return body.data
  }, fingerprint)
  const headers = (await responsePromise).request().headers()
  const hash = sha256(result.client_token)
  const row = sql(
    `UPDATE visitor_sessions v SET trust_level='basic', challenge_passed_at=NOW(), metadata_json=COALESCE(metadata_json,'{}'::jsonb)||jsonb_build_object('qa_fixture_owner','${env.PRIMARY_USERNAME}') WHERE client_token_hash='${hash}' AND client_fingerprint='${fingerprint}' AND (user_id IS NULL OR user_id=(SELECT id FROM users WHERE username='${env.PRIMARY_USERNAME}')) AND NOT is_blocked AND ((user_id IS NULL AND first_seen_at>NOW()-INTERVAL '2 minutes') OR metadata_json->>'qa_fixture_owner'='${env.PRIMARY_USERNAME}' OR EXISTS(SELECT 1 FROM user_devices d JOIN users u ON u.id=d.user_id WHERE u.username='${env.PRIMARY_USERNAME}' AND d.fingerprint IN(v.client_fingerprint,v.canonical_fingerprint))) RETURNING json_build_object('ip',ip_address,'fingerprint',client_fingerprint,'canonical',canonical_fingerprint);`
  )
  const record = JSON.parse(row.split('\n')[0])
  redis(buildScopedQaCacheCommands(record, fingerprint, headers))
  console.log(
    'Scoped QA fixture: one dedicated visitor; 10-minute cache; CAPTCHA delivery not covered.'
  )
  return true
}
