#!/usr/bin/env node

import process from 'node:process'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

export function resolveReleaseEvidenceCommand(env = process.env) {
  const controlledBaseUrl = env.CONTROLLED_BASE_URL?.trim()
  if (!controlledBaseUrl) {
    return {
      ok: false,
      code: 'missing-controlled-base-url',
      message:
        'CONTROLLED_BASE_URL is required for candidate release evidence. Run validate:release --mode local for local-only evidence, or set CONTROLLED_BASE_URL before candidate validation.',
      command: null,
    }
  }

  return {
    ok: true,
    code: 'candidate-release-evidence',
    message: 'Candidate release evidence requires controlled site validation.',
    command: ['node', 'scripts/validate-release.mjs', '--mode', 'candidate'],
  }
}

export function runReleaseEvidence({
  env = process.env,
  cwd = process.cwd(),
  spawnProcess = spawn,
} = {}) {
  const resolved = resolveReleaseEvidenceCommand(env)
  if (!resolved.ok) {
    console.error(resolved.message)
    return 1
  }

  const [command, ...args] = resolved.command
  const child = spawnProcess(command, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: false,
  })

  child.on('error', (error) => {
    console.error('Failed to start release validation candidate runner:', error)
    process.exit(1)
  })

  child.on('close', (code) => {
    process.exit(code ?? 1)
  })

  return 0
}

function isDirectCliRun() {
  const entryFile = process.argv[1]
  if (!entryFile) return false

  return import.meta.url === pathToFileURL(path.resolve(entryFile)).href
}

if (isDirectCliRun()) {
  const exitCode = runReleaseEvidence()
  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}
