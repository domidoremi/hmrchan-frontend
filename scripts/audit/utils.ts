import { spawn } from 'child_process'
import type { AuditStatus } from './types'

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

export function runCommand(cmd: string, args: string[] = [], cwd?: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd: cwd ?? process.cwd(),
      shell: true,
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

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const COLORS = {
  pass: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  fail: '\x1b[31m',  // red
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
} as const

export function colorize(text: string, status: AuditStatus | 'bold' | 'dim'): string {
  const color = COLORS[status] ?? COLORS.reset
  return `${color}${text}${COLORS.reset}`
}
