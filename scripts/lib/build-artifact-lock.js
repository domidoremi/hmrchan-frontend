import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_LOCK_ROOT = path.resolve('.codex-temp', 'build-locks')
const DEFAULT_TIMEOUT_MS = 120_000
const DEFAULT_POLL_MS = 250

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function removeStaleLock(lockDir, staleAfterMs) {
  try {
    const info = await stat(lockDir)
    const ageMs = Date.now() - info.mtimeMs
    if (ageMs < staleAfterMs) return false
    await rm(lockDir, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

export async function withBuildArtifactLock(
  name,
  task,
  {
    lockRoot = DEFAULT_LOCK_ROOT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    pollMs = DEFAULT_POLL_MS,
    staleAfterMs = timeoutMs * 2,
    onWait,
  } = {}
) {
  const lockDir = path.join(lockRoot, `${name}.lock`)
  const startedAt = Date.now()
  let waitingNotified = false

  await mkdir(lockRoot, { recursive: true })

  while (true) {
    try {
      await mkdir(lockDir)
      break
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      if (code !== 'EEXIST') {
        throw error
      }

      await removeStaleLock(lockDir, staleAfterMs)

      if (!waitingNotified && typeof onWait === 'function') {
        waitingNotified = true
        onWait()
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for build artifact lock "${name}" after ${timeoutMs}ms`)
      }

      await sleep(pollMs)
    }
  }

  try {
    await writeFile(
      path.join(lockDir, 'owner.json'),
      `${JSON.stringify(
        {
          pid: process.pid,
          startedAt: new Date().toISOString(),
          cwd: process.cwd(),
        },
        null,
        2
      )}\n`,
      'utf8'
    )
  } catch {
    // Lock ownership metadata is best-effort only.
  }

  try {
    return await task()
  } finally {
    await rm(lockDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
