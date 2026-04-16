#!/usr/bin/env node

import process from 'node:process'
import { spawn } from 'node:child_process'
import { applyLocalAuditEnvToProcess, createLocalAuditEnv } from './lib/audit-env.js'
import { clearLocalAuditRateLimitState } from './lib/preview-shell.js'

applyLocalAuditEnvToProcess()

const STEPS = [
  { label: 'Smoke E2E', command: ['bun', 'run', 'test:e2e'] },
  { label: 'Frontend health', command: ['bun', 'run', 'check:frontend'] },
  { label: 'Prod regression preflight', command: ['bun', 'run', 'test:prod:regression', '--preflight'] },
]

function runStep({ label, command }) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${label} ===`)
    const [bin, ...args] = command
    const enforceAuth = label === 'Smoke E2E' || label === 'Frontend health' || label === 'Prod regression preflight'
    const includeContractFallback = label === 'Smoke E2E' || label === 'Frontend health'
    const child = spawn(bin, args, {
      stdio: 'inherit',
      shell: false,
      env: createLocalAuditEnv(process.env, {
        includeContractFallback,
        overrides: {
        ...(enforceAuth
          ? {
              E2E_REQUIRE_AUTH: process.env.E2E_REQUIRE_AUTH ?? 'true',
            }
          : {}),
        },
      }),
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${label} failed with exit code ${code ?? 'unknown'}`))
    })
    child.on('error', reject)
  })
}

for (const step of STEPS) {
  const clearedRateLimitKeys = await clearLocalAuditRateLimitState(process.env)
  if (clearedRateLimitKeys > 0) {
    console.log(`Cleared ${clearedRateLimitKeys} local audit rate-limit keys before ${step.label}.`)
  }
  await runStep(step)
}

console.log('\nRelease evidence checks completed.')
