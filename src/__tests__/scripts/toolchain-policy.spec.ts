import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

const VUE_BETA_VERSION = '3.6.0-beta.13'
const VUE_LOCKED_PACKAGES = ['vue', '@vue/compiler-sfc', '@vue/server-renderer'] as const
const BUN_VERSION = '1.3.11'
const NODE_VERSION = '24.14.1'
const NODE_ENGINE_RANGE = '>=24.11.1 <25'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
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
    expect(packageJson.engines?.node).toBe(NODE_ENGINE_RANGE)
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

  it('keeps Vue runtime, compiler, and server renderer on the selected beta line', async () => {
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
      expect(declaredPackages[packageName]).toBe(VUE_BETA_VERSION)
      expect(rootWorkspaceLock).toContain(`"${packageName}": "${VUE_BETA_VERSION}"`)
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
})
