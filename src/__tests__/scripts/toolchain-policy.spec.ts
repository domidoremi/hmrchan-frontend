import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

const VUE_BETA_VERSION = '3.6.0-beta.13'
const VUE_LOCKED_PACKAGES = ['vue', '@vue/compiler-sfc', '@vue/server-renderer'] as const

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

type PackageJson = {
  packageManager?: string
  engines?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

describe('toolchain package policy', () => {
  it('keeps Bun and Node policy aligned with local runtime pins', async () => {
    const packageJson = await readJson<PackageJson>('package.json')
    const miseToml = await readFile('mise.toml', 'utf8')

    expect(packageJson.packageManager).toBe('bun@1.3.11')
    expect(packageJson.engines?.node).toBe('>=24.11.1 <25')
    expect(miseToml).toContain('node = "24.14.1"')
    expect(miseToml).toContain('bun = "1.3.11"')
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
})
