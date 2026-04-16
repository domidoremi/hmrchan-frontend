import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveProductionContractEnv } from './lib/production-contract-env.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function runNodeScript(scriptPath, args = [], env = process.env) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const contract = resolveProductionContractEnv(process.env)

if (contract.injected) {
  console.log(
    `[build] VITE_CLIENT_CONTRACT_VERSION not set; using Cloudflare Pages commit SHA as the rollout contract (${contract.value.slice(
      0,
      12
    )}).`
  )
}

runNodeScript(path.join(rootDir, 'scripts/patch-lucide.mjs'), [], contract.env)
runNodeScript(
  path.join(rootDir, 'node_modules/vue-tsc/bin/vue-tsc.js'),
  ['--noEmit', '--pretty'],
  contract.env
)
runNodeScript(path.join(rootDir, 'node_modules/vite/bin/vite.js'), ['build'], contract.env)
