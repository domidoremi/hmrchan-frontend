#!/usr/bin/env node

import { spawn } from 'node:child_process'

import {
  assertDevOriginIsSafe,
  buildViteArgs,
  parseDevServerArgs,
} from './lib/dev-server-guard.mjs'

async function runNodeScript(scriptPath) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    })

    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${scriptPath} exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  const passthroughArgs = process.argv.slice(2)
  const options = parseDevServerArgs(passthroughArgs)

  await assertDevOriginIsSafe({
    port: options.port,
  })

  await runNodeScript('scripts/patch-lucide.mjs')

  const viteArgs = buildViteArgs(passthroughArgs, {
    host: options.host,
    strictPort: options.strictPort,
  })

  console.log(`dev server target: http://${options.host}:${options.port}/`)

  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...viteArgs], {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })

  child.on('error', (error) => {
    console.error(error)
    process.exit(1)
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
