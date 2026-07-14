import { describe, expect, it, vi } from 'vitest'

import { cleanupChrome, main } from '../../../scripts/lighthouse-audit.mjs'

describe('Lighthouse audit CLI', () => {
  it('returns a failing exit code when the audit throws', async () => {
    const logger = {
      error: vi.fn(),
    }

    const exitCode = await main(async () => {
      throw new Error('audit failed')
    }, logger)

    expect(exitCode).toBe(1)
    expect(logger.error).toHaveBeenCalledWith('❌ Lighthouse audit failed:', 'audit failed')
  })

  it('returns a successful exit code when the audit completes', async () => {
    const exitCode = await main(async () => undefined)

    expect(exitCode).toBe(0)
  })

  it('warns without failing when Chrome cleanup is denied', async () => {
    const logger = {
      warn: vi.fn(),
    }
    const chrome = {
      kill: vi.fn().mockRejectedValue(Object.assign(new Error('access denied'), { code: 'EPERM' })),
    }

    await expect(cleanupChrome(chrome, logger)).resolves.toBeUndefined()
    expect(logger.warn).toHaveBeenCalledWith('⚠️ Chrome cleanup warning: access denied')
  })
})
