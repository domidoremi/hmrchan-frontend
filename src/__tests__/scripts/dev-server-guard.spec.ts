import { describe, expect, it, vi } from 'vitest'

import {
  buildViteArgs,
  findAvailableDevPort,
  parseDevServerArgs,
} from '../../../scripts/lib/dev-server-guard.mjs'

describe('dev server guard', () => {
  it('defaults to an auto-selected port starting at 127.0.0.1:5173', () => {
    expect(parseDevServerArgs([])).toEqual({
      host: '127.0.0.1',
      port: 5173,
      portIsExplicit: false,
      strictPort: true,
    })
  })

  it('selects the first available port in ascending order', async () => {
    const isPortAvailable = vi.fn(async (port: number) => port >= 5175)

    await expect(
      findAvailableDevPort({
        startPort: 5173,
        host: '127.0.0.1',
        isPortAvailable,
      })
    ).resolves.toBe(5175)

    expect(isPortAvailable.mock.calls.map(([port]) => port)).toEqual([5173, 5174, 5175])
  })

  it('keeps an explicit port distinguishable from the default', () => {
    expect(parseDevServerArgs(['--host=0.0.0.0', '--port=6000'])).toMatchObject({
      host: '0.0.0.0',
      port: 6000,
      portIsExplicit: true,
    })
  })

  it('passes the selected host and port explicitly while retaining strict binding', () => {
    expect(buildViteArgs([], { host: '127.0.0.1', port: 5174, strictPort: true })).toEqual([
      '--host',
      '127.0.0.1',
      '--port',
      '5174',
      '--strictPort',
    ])

    expect(
      buildViteArgs(['--host', '0.0.0.0', '--port', '6000'], {
        host: '127.0.0.1',
        port: 5174,
        strictPort: true,
      })
    ).toEqual(['--host', '0.0.0.0', '--port', '6000', '--strictPort'])
  })
})
