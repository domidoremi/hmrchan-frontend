#!/usr/bin/env node

import process from 'node:process'
import { spawn } from 'node:child_process'

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
    const child = spawn(bin, args, {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        ...(enforceAuth
          ? {
              E2E_REQUIRE_AUTH: process.env.E2E_REQUIRE_AUTH ?? 'true',
            }
          : {}),
      },
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
  await runStep(step)
}

console.log('\nRelease evidence checks completed.')
