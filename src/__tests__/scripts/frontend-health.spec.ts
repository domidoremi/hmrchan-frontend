import { describe, expect, it } from 'vitest'

import {
  isIgnoredOptionalEndpoint,
  shouldIgnoreConsoleError,
  shouldIgnoreRequestIssue,
} from '../../../scripts/lib/frontend-health'

describe('frontend health filtering', () => {
  it('ignores preview telemetry endpoint noise by default', () => {
    expect(isIgnoredOptionalEndpoint('http://127.0.0.1:4174/client-report')).toBe(true)
    expect(
      shouldIgnoreConsoleError(
        'Failed to load resource: the server responded with a status of 404 (Not Found) http://127.0.0.1:4174/client-report',
        false
      )
    ).toBe(true)
    expect(shouldIgnoreRequestIssue('http://127.0.0.1:4174/client-report', false)).toBe(true)
  })

  it('does not suppress api failures by default anymore', () => {
    expect(shouldIgnoreConsoleError('Failed to load resource: 503 /api/posts', false)).toBe(false)
    expect(shouldIgnoreRequestIssue('http://127.0.0.1:4174/api/posts', false)).toBe(false)
  })

  it('only suppresses preview-shell api noise when explicitly allowed', () => {
    const options = {
      allowLocalPreviewApiNoise: true,
      baseOrigin: 'http://127.0.0.1:4174',
    }

    expect(
      shouldIgnoreConsoleError('Failed to load resource: 503 /api/posts', false, null, options)
    ).toBe(true)
    expect(shouldIgnoreRequestIssue('http://127.0.0.1:4174/api/posts', false, options)).toBe(true)
  })

  it('ignores generic console resource errors when the failing URL is provided via location', () => {
    expect(
      shouldIgnoreConsoleError(
        'Failed to load resource: the server responded with a status of 404 (Not Found)',
        false,
        'http://127.0.0.1:4174/client-report'
      )
    ).toBe(true)
  })

  it('does not suppress issues when explicit api error collection is enabled', () => {
    expect(
      shouldIgnoreConsoleError(
        'Failed to load resource: the server responded with a status of 404 (Not Found) http://127.0.0.1:4174/client-report',
        true
      )
    ).toBe(false)
    expect(shouldIgnoreRequestIssue('http://127.0.0.1:4174/client-report', true)).toBe(false)
  })
})
