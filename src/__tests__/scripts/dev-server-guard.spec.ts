import { describe, expect, it } from 'vitest'
import { resolveConfig } from 'vite'

import {
  buildViteArgs,
  classifyServerPayload,
  parseDevServerArgs,
} from '../../../scripts/lib/dev-server-guard.mjs'

describe('dev server guard', () => {
  it('recognizes this repo shell markers', () => {
    expect(classifyServerPayload('<div id="app-root"></div>')).toBe('hmrchan-frontend')
    expect(classifyServerPayload('<meta content="MomiChan" />')).toBe('hmrchan-frontend')
  })

  it('recognizes foreign vite payload markers', () => {
    expect(classifyServerPayload('const wsToken = __WS_TOKEN__;')).toBe('foreign-vite')
    expect(classifyServerPayload('<!--app-context-->')).toBe('foreign-vite')
  })

  it('defaults to 127.0.0.1:5173 with automatic port fallback', () => {
    expect(parseDevServerArgs([])).toEqual({
      host: '127.0.0.1',
      port: 5173,
      strictPort: false,
    })
  })

  it('keeps an explicitly selected port strict', () => {
    expect(parseDevServerArgs(['--port', '4173'])).toEqual({
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    })
  })

  it('allows Vite to select the next available default port', async () => {
    const config = await resolveConfig({}, 'serve')

    expect(config.server.port).toBe(5173)
    expect(config.server.strictPort).toBe(false)
  })

  it('preserves explicit flags and injects only missing vite args', () => {
    expect(buildViteArgs([], { host: '127.0.0.1', strictPort: false })).toEqual([
      '--host',
      '127.0.0.1',
    ])

    expect(buildViteArgs([], { host: '127.0.0.1', strictPort: true })).toEqual([
      '--host',
      '127.0.0.1',
      '--strictPort',
    ])

    expect(buildViteArgs(['--host', '0.0.0.0', '--port', '4173'], { strictPort: true })).toEqual([
      '--host',
      '0.0.0.0',
      '--port',
      '4173',
      '--strictPort',
    ])
  })
})
