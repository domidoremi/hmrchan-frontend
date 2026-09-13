import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
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

if (result.status === 0) {
  console.log('Application type check passed with no diagnostics.')
  process.exit(0)
}

// Type diagnostics must fail release gates, not fit within an error allowance.
process.stderr.write(output)
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
