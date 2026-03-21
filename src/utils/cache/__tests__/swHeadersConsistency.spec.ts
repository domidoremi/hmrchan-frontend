import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { SW_PATH } from '../swRegister'

describe('service worker path consistency', () => {
  it('keeps public/_headers aligned with the registered sw.js path', () => {
    const headersFile = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf-8')

    expect(SW_PATH).toBe('/sw.js')
    expect(headersFile).toContain('/sw.js')
    expect(headersFile).toContain('Cache-Control: no-cache, no-store, must-revalidate')
    expect(headersFile).not.toContain('/service-worker.js')
  })
})
