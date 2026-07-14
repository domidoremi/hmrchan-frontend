import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const maxDiagnostics = 477
const result = spawnSync(
  process.execPath,
  [
    'node_modules/vue-tsc/bin/vue-tsc.js',
    '--noEmit',
    '--pretty',
    'false',
    '--project',
    'tsconfig.app.json',
  ],
  {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  }
)

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
const diagnostics = [...output.matchAll(/\berror TS\d+:/gu)]
const files = new Set(
  [...output.matchAll(/(?:^|\n)([^\r\n(]+\.(?:ts|tsx|vue))\(\d+,\d+\): error TS\d+:/gu)].map(
    (match) => match[1]
  )
)

if (result.status === 0) {
  console.log('Application type check passed with no diagnostics.')
  process.exit(0)
}

if (result.error || diagnostics.length === 0) {
  process.stderr.write(output)
  if (result.error) console.error(result.error.message)
  process.exit(result.status ?? 1)
}

const summary =
  `Application type-error budget: ${diagnostics.length}/${maxDiagnostics} diagnostics` +
  ` across ${files.size} files.`

if (diagnostics.length > maxDiagnostics) {
  console.error(summary)
  process.stderr.write(output)
  process.exit(1)
}

console.log(summary)
