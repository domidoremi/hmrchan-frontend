import { spawn } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import type { AuditStatus } from './types'

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

interface RunCommandOptions {
  shell?: boolean
  env?: NodeJS.ProcessEnv
}

interface LocalNodeToolSpec {
  packageName: string
  binName?: string
}

const LOCAL_NODE_TOOLS: Record<string, LocalNodeToolSpec> = {
  vite: { packageName: 'vite', binName: 'vite' },
  eslint: { packageName: 'eslint', binName: 'eslint' },
  knip: { packageName: 'knip', binName: 'knip' },
  vitest: { packageName: 'vitest', binName: 'vitest' },
  'vue-tsc': { packageName: 'vue-tsc', binName: 'vue-tsc' },
}

function getSpawnCommand(cmd: string): string {
  if (process.platform !== 'win32') return cmd

  switch (cmd.toLowerCase()) {
    case 'npm':
      return 'npm.cmd'
    case 'npx':
      return 'npx.cmd'
    default:
      return cmd
  }
}

function getNodeCommand(): string {
  const execName = process.execPath.split(/[\\/]/).pop()?.toLowerCase() ?? ''
  if (execName.startsWith('node')) return process.execPath
  return process.platform === 'win32' ? 'node.exe' : 'node'
}

function resolveLocalNodeBin(command: string, cwd?: string): string | null {
  const workingDir = cwd ?? process.cwd()
  const spec = LOCAL_NODE_TOOLS[command]
  if (!spec) return null

  const packageJsonPath = resolve(workingDir, 'node_modules', spec.packageName, 'package.json')
  if (!existsSync(packageJsonPath)) return null

  type PackageJson = {
    bin?: string | Record<string, string>
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson

  let relativeBin: string | undefined
  if (typeof pkg.bin === 'string') {
    relativeBin = pkg.bin
  } else if (pkg.bin && typeof pkg.bin === 'object') {
    relativeBin = pkg.bin[spec.binName ?? command] ?? Object.values(pkg.bin)[0]
  }

  if (!relativeBin) return null
  return resolve(dirname(packageJsonPath), relativeBin)
}

export function runCommand(
  cmd: string,
  args: string[] = [],
  cwd?: string,
  options: RunCommandOptions = {}
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn(getSpawnCommand(cmd), args, {
      cwd: cwd ?? process.cwd(),
      env: { ...process.env, ...(options.env ?? {}) },
      shell: options.shell ?? false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })

    proc.on('error', (err) => {
      resolve({ stdout, stderr: stderr || err.message, exitCode: 1 })
    })
  })
}

export function runLocalNodeTool(
  command: keyof typeof LOCAL_NODE_TOOLS,
  args: string[] = [],
  cwd?: string
): Promise<CommandResult> {
  const binPath = resolveLocalNodeBin(command, cwd)
  if (!binPath) {
    return Promise.resolve({
      stdout: '',
      stderr: `Unable to resolve local CLI for "${command}". Try reinstalling node_modules.`,
      exitCode: 1,
    })
  }

  return runCommand(getNodeCommand(), [binPath, ...args], cwd)
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const COLORS = {
  pass: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  fail: '\x1b[31m', // red
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
} as const

export function colorize(text: string, status: AuditStatus | 'bold' | 'dim'): string {
  const color = COLORS[status] ?? COLORS.reset
  return `${color}${text}${COLORS.reset}`
}
