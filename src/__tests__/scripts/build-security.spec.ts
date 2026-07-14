import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const checkerPath = resolve('scripts/check-build-security.mjs')
const fixtureRoots: string[] = []

async function createBuildFixture(runtimeSource: string): Promise<string> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'hmr-build-security-'))
  const distDir = join(projectRoot, 'dist')
  const runtimeFile = 'assets/js/main-test.js'
  const runtimePath = join(distDir, runtimeFile)

  fixtureRoots.push(projectRoot)
  await mkdir(dirname(runtimePath), { recursive: true })
  await mkdir(join(distDir, '.vite'), { recursive: true })
  await Promise.all([
    writeFile(join(distDir, 'index.html'), '<div id="app-root"></div>'),
    writeFile(
      join(distDir, '.vite', 'manifest.json'),
      JSON.stringify({
        'src/main.ts': {
          file: runtimeFile,
          isDynamicEntry: true,
        },
      })
    ),
    writeFile(runtimePath, runtimeSource),
  ])

  return projectRoot
}

function runBuildSecurityCheck(projectRoot: string) {
  return spawnSync(process.execPath, [checkerPath], {
    cwd: projectRoot,
    encoding: 'utf8',
  })
}

afterEach(async () => {
  await Promise.all(
    fixtureRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  )
})

describe('build security application runtime contract', () => {
  it('rejects an import-only application runtime', async () => {
    const projectRoot = await createBuildFixture('import "./vue-runtime.js";\n')

    const result = runBuildSecurityCheck(projectRoot)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('startup entry may have been tree-shaken')
  })

  it('accepts an application runtime that mounts the configured root', async () => {
    const projectRoot = await createBuildFixture('createApp(App).mount("#app-root");\n')

    const result = runBuildSecurityCheck(projectRoot)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Security checks passed')
  })
})
