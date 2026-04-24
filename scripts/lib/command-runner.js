import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_COMMAND_TIMEOUT_MS = 5 * 60 * 1000
const COMMAND_TIMEOUT_SETTLE_GRACE_MS = 5 * 1000

export class CommandRunError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'CommandRunError'
    this.command = details.command ?? []
    this.status = details.status ?? 'failed'
    this.exitCode = details.exitCode ?? null
    this.signal = details.signal ?? null
    this.timedOut = Boolean(details.timedOut)
    this.artifactDir = details.artifactDir ?? null
  }
}

function isWindowsPlatform(platform = process.platform) {
  return platform === 'win32'
}

function hasPathSeparator(value) {
  return /[\\/]/.test(value)
}

function getPathDelimiter(platform = process.platform) {
  return isWindowsPlatform(platform) ? ';' : path.delimiter
}

function getPathEntries(env = process.env, platform = process.platform) {
  const rawPath = env.PATH || env.Path || env.path || ''
  return rawPath.split(getPathDelimiter(platform)).filter(Boolean)
}

function getExecutableCandidates(command, { env = process.env, platform = process.platform } = {}) {
  if (!isWindowsPlatform(platform) || hasPathSeparator(command)) {
    return [command]
  }

  const pathExt = (env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean)
  const commandExtension = path.extname(command).toLowerCase()
  const commandNames = commandExtension
    ? [command]
    : [command, ...pathExt.map((extension) => `${command}${extension}`)]

  return getPathEntries(env, platform).flatMap((entry) =>
    commandNames.map((commandName) => path.join(entry, commandName))
  )
}

export function resolveExecutable(
  command,
  { env = process.env, platform = process.platform } = {}
) {
  const trimmedCommand = String(command ?? '').trim()
  if (!trimmedCommand) {
    throw new Error('Cannot resolve an empty executable command')
  }

  if (!isWindowsPlatform(platform)) {
    return trimmedCommand
  }

  if (hasPathSeparator(trimmedCommand)) {
    return trimmedCommand
  }

  for (const candidate of getExecutableCandidates(trimmedCommand, { env, platform })) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return trimmedCommand
}

export function getBunExecutable({ env = process.env, platform = process.platform } = {}) {
  const resolvedBun = env.BUN_EXECUTABLE?.trim()
    ? resolveExecutable(env.BUN_EXECUTABLE.trim(), { env, platform })
    : process.versions?.bun && process.execPath
      ? process.execPath
      : resolveExecutable('bun', { env, platform })

  if (isWindowsPlatform(platform) && /\.cmd$/i.test(resolvedBun) && existsSync(resolvedBun)) {
    const wrapper = readFileSync(resolvedBun, 'utf8')
    const targetMatch = wrapper.match(/set\s+"_TARGET=([^"]+bun\.exe)"/i)
    const target = targetMatch?.[1]
    if (target && existsSync(target)) {
      return target
    }
  }

  return resolvedBun
}

export function getBunExecutableFromEnvOnly({
  env = process.env,
  platform = process.platform,
} = {}) {
  if (env.BUN_EXECUTABLE?.trim()) {
    return resolveExecutable(env.BUN_EXECUTABLE.trim(), { env, platform })
  }

  if (process.versions?.bun && process.execPath) {
    return process.execPath
  }

  return resolveExecutable('bun', { env, platform })
}

export function shouldUseShellForCommand(command, { platform = process.platform } = {}) {
  return isWindowsPlatform(platform) && /\.(?:cmd|bat)$/i.test(command)
}

export function buildSpawnCommand(command, args, { platform = process.platform } = {}) {
  if (!shouldUseShellForCommand(command, { platform })) {
    return { command, args, shell: false }
  }

  return {
    command: process.env.ComSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', [command, ...args].join(' ')],
    shell: false,
  }
}

export function getBunRunArgs(...args) {
  return ['--no-env-file', 'run', ...args]
}

function pushOutput(lines, chunk, maxLines = 400) {
  const text = chunk.toString()
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue
    lines.push(line)
    if (lines.length > maxLines) lines.shift()
  }
}

function terminateChild(child) {
  if (!child?.pid) return

  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      shell: false,
    }).on('error', () => undefined)
    return
  }

  try {
    process.kill(child.pid, 'SIGTERM')
  } catch {
    // ignore
  }
}

export async function runCommand(
  command,
  {
    env = process.env,
    cwd = process.cwd(),
    stdio = 'inherit',
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
    artifactDir = null,
    timeoutSettleGraceMs = COMMAND_TIMEOUT_SETTLE_GRACE_MS,
  } = {}
) {
  return new Promise((resolve, reject) => {
    const [bin, ...args] = command
    const resolvedBin = bin === 'bun' ? getBunExecutable({ env }) : resolveExecutable(bin, { env })
    const spawnCommand = buildSpawnCommand(resolvedBin, args)
    const captureOutput = Boolean(artifactDir)
    const stdoutLines = []
    const stderrLines = []
    const startedAt = new Date().toISOString()
    const child = spawn(spawnCommand.command, spawnCommand.args, {
      cwd,
      env,
      stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : stdio,
      shell: spawnCommand.shell,
    })

    child.stdout?.on('data', (chunk) => {
      pushOutput(stdoutLines, chunk)
      if (stdio === 'inherit') process.stdout.write(chunk)
    })
    child.stderr?.on('data', (chunk) => {
      pushOutput(stderrLines, chunk)
      if (stdio === 'inherit') process.stderr.write(chunk)
    })

    const writeArtifact = async (status, reason = null, extra = {}) => {
      if (!artifactDir) return
      const completedAt = new Date().toISOString()
      await mkdir(artifactDir, { recursive: true })
      await writeFile(
        path.join(artifactDir, 'command.json'),
        `${JSON.stringify(
          {
            command,
            resolvedCommand: spawnCommand.command,
            resolvedArgs: spawnCommand.args,
            status,
            reason,
            timeoutMs,
            startedAt,
            completedAt,
            durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
            ...extra,
            stdoutTail: stdoutLines,
            stderrTail: stderrLines,
          },
          null,
          2
        )}\n`,
        'utf8'
      )
      await writeFile(
        path.join(artifactDir, 'stdout.tail.log'),
        `${stdoutLines.join('\n')}\n`,
        'utf8'
      )
      await writeFile(
        path.join(artifactDir, 'stderr.tail.log'),
        `${stderrLines.join('\n')}\n`,
        'utf8'
      )
    }

    let settled = false
    let timedOut = false
    let forceTimeoutTimer = null

    const fail = async (message, details = {}) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (forceTimeoutTimer) clearTimeout(forceTimeoutTimer)
      await writeArtifact(details.status ?? 'failed', message, details).catch(() => undefined)
      reject(new CommandRunError(message, { command, artifactDir, ...details }))
    }

    const pass = async (details = {}) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (forceTimeoutTimer) clearTimeout(forceTimeoutTimer)
      await writeArtifact('passed', null, details).catch(() => undefined)
      resolve({ command, artifactDir, status: 'passed', ...details })
    }

    const timer = setTimeout(() => {
      timedOut = true
      terminateChild(child)
      forceTimeoutTimer = setTimeout(() => {
        void fail(`${command.join(' ')} timed out after ${timeoutMs}ms`, {
          status: 'timed-out',
          timedOut: true,
        })
      }, timeoutSettleGraceMs)
    }, timeoutMs)

    child.on('error', (error) => {
      void fail(error.message, { status: 'error' })
    })
    child.on('close', (code, signal) => {
      if (timedOut) {
        void fail(`${command.join(' ')} timed out after ${timeoutMs}ms`, {
          status: 'timed-out',
          exitCode: code,
          signal,
          timedOut: true,
        })
        return
      }
      if (code === 0) {
        void pass({ exitCode: code, signal })
        return
      }
      void fail(`${command.join(' ')} exited with code ${code ?? 'unknown'}`, {
        status: 'failed',
        exitCode: code,
        signal,
      })
    })
  })
}
