import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  CommandRunError,
  getBunExecutable,
  buildSpawnCommand,
  resolveExecutable,
  runCommand,
  shouldUseShellForCommand,
} from '../../../scripts/lib/command-runner.js'

describe('command runner executable resolution', () => {
  it('resolves Windows command shims from PATH entries', () => {
    const binDir = mkdtempSync(path.join(tmpdir(), 'hmrchan-bin-'))
    const bunShim = path.join(binDir, 'bun.cmd')
    writeFileSync(bunShim, '@echo off\n', 'utf8')
    const env = {
      PATH: `${binDir};C:\\Windows\\system32`,
      PATHEXT: '.COM;.EXE;.BAT;.CMD',
    }

    expect(resolveExecutable('bun', { env, platform: 'win32' })).toBe(bunShim)
  })

  it('uses absolute BUN_EXECUTABLE before PATH lookup', () => {
    const env = {
      BUN_EXECUTABLE: 'G:\\tools\\bun.exe',
      PATH: 'G:\\bin',
    }

    expect(getBunExecutable({ env, platform: 'win32' })).toBe('G:\\tools\\bun.exe')
  })

  it('resolves command-like BUN_EXECUTABLE values through PATH', () => {
    const binDir = mkdtempSync(path.join(tmpdir(), 'hmrchan-bun-env-'))
    const bunExe = path.join(binDir, 'bun.exe')
    const bunShim = path.join(binDir, 'bun.cmd')
    writeFileSync(bunExe, '', 'utf8')
    writeFileSync(bunShim, `@echo off\nset "_TARGET=${bunExe}"\n`, 'utf8')
    const env = {
      BUN_EXECUTABLE: 'bun',
      PATH: binDir,
      PATHEXT: '.CMD',
    }

    expect(getBunExecutable({ env, platform: 'win32' })).toBe(bunExe)
  })

  it('runs Windows cmd shims through a shell', () => {
    expect(shouldUseShellForCommand('G:\\bin\\bun.cmd', { platform: 'win32' })).toBe(true)
    expect(shouldUseShellForCommand('/usr/local/bin/bun', { platform: 'linux' })).toBe(false)
  })

  it('settles timed out commands and writes artifacts', async () => {
    const artifactDir = mkdtempSync(path.join(tmpdir(), 'hmrchan-command-artifacts-'))

    await expect(
      runCommand([process.execPath, '-e', 'setTimeout(() => {}, 1000)'], {
        artifactDir,
        stdio: 'pipe',
        timeoutMs: 20,
        timeoutSettleGraceMs: 20,
      })
    ).rejects.toMatchObject({
      name: 'CommandRunError',
      status: 'timed-out',
      timedOut: true,
    } satisfies Partial<CommandRunError>)

    const commandArtifact = JSON.parse(readFileSync(path.join(artifactDir, 'command.json'), 'utf8'))
    expect(commandArtifact).toMatchObject({
      status: 'timed-out',
      timeoutMs: 20,
    })
    expect(readFileSync(path.join(artifactDir, 'stdout.tail.log'), 'utf8')).toBeDefined()
    expect(readFileSync(path.join(artifactDir, 'stderr.tail.log'), 'utf8')).toBeDefined()
  })

  it('wraps Windows command shims without Node shell args', () => {
    expect(
      buildSpawnCommand('G:\\bin\\bun.cmd', ['run', 'build'], { platform: 'win32' })
    ).toMatchObject({
      args: ['/d', '/s', '/c', 'G:\\bin\\bun.cmd run build'],
      shell: false,
    })
  })
})
