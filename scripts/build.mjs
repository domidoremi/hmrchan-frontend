import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { resolveProductionContractEnv } from './lib/production-contract-env.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wranglerRuntimeDir = path.join(rootDir, 'dist', '.wrangler')

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

const productionEnv = {
  ...process.env,
  ...loadEnv('production', rootDir, ''),
}
const contract = resolveProductionContractEnv(productionEnv)

if (contract.injected) {
  console.log(
    `[build] VITE_CLIENT_CONTRACT_VERSION not set; using Cloudflare Pages commit SHA as the rollout contract (${contract.value.slice(
      0,
      12
    )}).`
  )
}

if (contract.sanitized?.strippedKeys?.length) {
  console.log(
    `[build] Stripped production-incompatible client env keys: ${contract.sanitized.strippedKeys.join(
      ', '
    )}.`
  )
}

if (contract.sanitized?.forcedKeys?.length) {
  console.log(
    `[build] Forced production-safe client env values for: ${contract.sanitized.forcedKeys.join(
      ', '
    )}.`
  )
}

runNodeScript(path.join(rootDir, 'scripts/patch-lucide.mjs'), [], contract.env)
runNodeScript(path.join(rootDir, 'scripts/type-check.mjs'), [], contract.env)
try {
  rmSync(wranglerRuntimeDir, { recursive: true, force: true })
} catch (error) {
  console.warn(
    `[build] Unable to clear stale ${path.relative(rootDir, wranglerRuntimeDir)}: ${
      error instanceof Error ? error.message : String(error)
    }`
  )
}
runNodeScript(path.join(rootDir, 'node_modules/vite/bin/vite.js'), ['build'], contract.env)
runNodeScript(
  path.join(rootDir, 'scripts/generate-sitemap.js'),
  [
    '--output',
    path.join('dist', 'sitemap.xml'),
    '--robots-output',
    path.join('dist', 'robots.txt'),
  ],
  contract.env
)
