import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import {
  getProductionContractEnvPolicy,
  resolveProductionContractEnv,
} from '../../../scripts/lib/production-contract-env.js'

const VUE_RUNTIME_VERSION = '3.5.35'
const VUE_LOCKED_PACKAGES = ['vue', '@vue/compiler-sfc', '@vue/server-renderer'] as const
const BUN_VERSION = '1.3.14'
const NODE_VERSION = '24.14.1'
const NODE_ENGINE_RANGE = '>=24.11.1 <25'
const PAGES_RUNTIME_ENV_KEYS = [
  'BUN_VERSION',
  'SKIP_DEPENDENCY_INSTALL',
  'API_BASE_URL',
  'ENABLE_INTERNAL_API_GATEWAY',
  'GOOGLE_AUTH_ENABLED',
  'VITE_CLIENT_CONTRACT_VERSION',
] as const
const LOCAL_PRIVATE_ENV_KEYS = new Set(['VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION'])
const RETIRED_CLIENT_ENV_KEYS = new Set(['VITE_API_ENDPOINT', 'VITE_API_URL'])

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

function parseEnvVarNames(content: string): Set<string> {
  const names = new Set<string>()
  for (const line of content.split('\n')) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=/)
    const name = match?.[1]
    if (name) names.add(name)
  }
  return names
}

function extractWranglerVars(
  content: string,
  envName: 'production' | 'preview'
): Map<string, string> {
  const blockMatch = content.match(
    new RegExp(`\\[env\\.${envName}\\.vars\\]([\\s\\S]*?)(?:\\n\\[|\\n# =|$)`)
  )
  const block = blockMatch?.[1] ?? ''
  const vars = new Map<string, string>()

  for (const line of block.split('\n')) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"$/)
    const name = match?.[1]
    const value = match?.[2]
    if (name !== undefined && value !== undefined) vars.set(name, value)
  }

  return vars
}

type PackageJson = {
  packageManager?: string
  engines?: Record<string, string>
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

type LighthouseConfig = {
  ci?: {
    collect?: {
      url?: string[]
    }
  }
}

describe('toolchain package policy', () => {
  it('keeps Bun and Node policy aligned with local runtime pins', async () => {
    const packageJson = await readJson<PackageJson>('package.json')
    const miseToml = await readFile('mise.toml', 'utf8')
    const nodeVersion = (await readFile('.node-version', 'utf8')).trim()
    const readme = await readFile('README.md', 'utf8')
    const wranglerToml = await readFile('wrangler.toml', 'utf8')

    expect(packageJson.packageManager).toBe(`bun@${BUN_VERSION}`)
    expect(packageJson.engines?.['node']).toBe(NODE_ENGINE_RANGE)
    expect(miseToml).toContain(`node = "${NODE_VERSION}"`)
    expect(miseToml).toContain(`bun = "${BUN_VERSION}"`)
    expect(nodeVersion).toBe(NODE_VERSION)
    expect(readme).toContain(`Node.js \`${NODE_ENGINE_RANGE}\``)
    expect(readme).toContain(`Bun \`${BUN_VERSION}\``)
    expect(wranglerToml.match(/BUN_VERSION\s*=\s*"([^"]+)"/g)).toEqual([
      `BUN_VERSION = "${BUN_VERSION}"`,
      `BUN_VERSION = "${BUN_VERSION}"`,
    ])
  })

  it('keeps Vue runtime, compiler, and server renderer on the selected stable line', async () => {
    const packageJson = await readJson<PackageJson>('package.json')
    const bunLock = await readFile('bun.lock', 'utf8')
    const workspaceStart = bunLock.indexOf('"workspaces"')
    const workspaceEnd = bunLock.indexOf('"overrides"')
    const rootWorkspaceLock = bunLock.slice(workspaceStart, workspaceEnd)
    const declaredPackages = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    for (const packageName of VUE_LOCKED_PACKAGES) {
      expect(declaredPackages[packageName]).toBe(VUE_RUNTIME_VERSION)
      expect(rootWorkspaceLock).toContain(`"${packageName}": "${VUE_RUNTIME_VERSION}"`)
    }
  })

  it('keeps the light audit gate aligned with frontend release contracts', async () => {
    const packageJson = await readJson<PackageJson>('package.json')

    expect(packageJson.scripts?.['audit:light']).toBe(
      'bun run scripts/audit/index.ts --only=security,env-config,pwa,i18n,frontend-contract'
    )
  })

  it('keeps Lighthouse CI route sampling aligned with indexed public routes', async () => {
    const lighthouseConfig = await readJson<LighthouseConfig>('lighthouserc.json')

    expect(lighthouseConfig.ci?.collect?.url).toEqual([
      'http://127.0.0.1:5173/',
      'http://127.0.0.1:5173/explore',
      'http://127.0.0.1:5173/community',
      'http://127.0.0.1:5173/schedule',
      'http://127.0.0.1:5173/about',
      'http://127.0.0.1:5173/contact',
      'http://127.0.0.1:5173/join-us',
    ])
  })

  it('keeps Cloudflare Pages runtime env aligned between production and preview', async () => {
    const wranglerToml = await readFile('wrangler.toml', 'utf8')
    const productionVars = extractWranglerVars(wranglerToml, 'production')
    const previewVars = extractWranglerVars(wranglerToml, 'preview')

    for (const key of PAGES_RUNTIME_ENV_KEYS) {
      expect(productionVars.get(key), `production ${key}`).toBeTruthy()
      expect(previewVars.get(key), `preview ${key}`).toBe(productionVars.get(key))
    }

    expect(productionVars.get('BUN_VERSION')).toBe(BUN_VERSION)
    expect(productionVars.get('SKIP_DEPENDENCY_INSTALL')).toBe('true')
    expect(productionVars.get('ENABLE_INTERNAL_API_GATEWAY')).toBe('true')
    expect(productionVars.get('GOOGLE_AUTH_ENABLED')).toBe('true')
    expect(wranglerToml).toContain('[[env.production.services]]')
    expect(wranglerToml).toContain('[[env.preview.services]]')
    expect(wranglerToml.match(/binding\s*=\s*"INTERNAL_API_GATEWAY"/g)).toHaveLength(2)
  })

  it('keeps local env examples aligned with the production client env policy', async () => {
    const envExample = await readFile('.env.example', 'utf8')
    const exampleVars = parseEnvVarNames(envExample)
    const policy = getProductionContractEnvPolicy()
    const documentedStrippedKeys = policy.stripClientEnvKeys.filter(
      (key: string) => !LOCAL_PRIVATE_ENV_KEYS.has(key)
    )

    for (const key of documentedStrippedKeys) {
      expect(envExample, `${key} must stay documented as local-only or retired`).toContain(key)
      if (!RETIRED_CLIENT_ENV_KEYS.has(key)) {
        expect(exampleVars.has(key), `${key} must stay available for local configuration`).toBe(
          true
        )
      }
    }

    for (const key of RETIRED_CLIENT_ENV_KEYS) {
      expect(exampleVars.has(key), `${key} must stay retired from assignable examples`).toBe(false)
    }

    for (const key of ['API_BASE_URL', 'ENABLE_INTERNAL_API_GATEWAY', 'GOOGLE_AUTH_ENABLED']) {
      expect(exampleVars.has(key), `${key} belongs to wrangler.toml, not .env.example`).toBe(false)
    }

    const resolved = resolveProductionContractEnv({
      CF_PAGES: '1',
      CF_PAGES_COMMIT_SHA: 'commit-contract',
      VITE_API_BASE_URL: 'https://raw-api.example.com',
      VITE_IDENTITY_API_BASE_URL: 'https://identity.example.com',
      VITE_ENABLE_DEBUG: 'true',
      VITE_ENABLE_DEVTOOLS: 'true',
    })

    expect(resolved.value).toBe('commit-contract')
    expect(resolved.env.VITE_CLIENT_CONTRACT_VERSION).toBe('commit-contract')
    expect(resolved.env.VITE_API_BASE_URL).toBeUndefined()
    expect(resolved.env.VITE_IDENTITY_API_BASE_URL).toBeUndefined()
    expect(resolved.env.VITE_ENABLE_DEBUG).toBe('false')
    expect(resolved.env.VITE_ENABLE_DEVTOOLS).toBe('false')
    expect(resolved.sanitized.strippedKeys).toEqual([
      'VITE_API_BASE_URL',
      'VITE_IDENTITY_API_BASE_URL',
    ])
    expect(resolved.sanitized.forcedKeys).toEqual(['VITE_ENABLE_DEBUG', 'VITE_ENABLE_DEVTOOLS'])
  })
})
