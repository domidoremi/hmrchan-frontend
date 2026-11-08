import { describe, expect, it } from 'vitest'

import {
  createHealthRequestTracker,
  isExpectedHealthNotFoundDocument,
  isIgnoredOptionalEndpoint,
  isLocalPreviewEnvironmentBlocker,
  shouldIgnoreConsoleError,
  shouldIgnoreRequestIssue,
} from '../../../scripts/lib/frontend-health'

describe('frontend health filtering', () => {
  it.each([true, false])(
    'accepts a cancelled duplicate only after a successful GET: %s',
    (responseFirst) => {
      const failures = new Set<string>()
      const tracker = createHealthRequestTracker(failures)
      if (responseFirst) tracker.responded('GET', '/api/schedules?month=11', 200)
      tracker.failed('GET', '/api/schedules?month=11', 'net::ERR_ABORTED')
      if (!responseFirst) {
        expect(failures.size).toBe(1)
        tracker.responded('GET', '/api/schedules?month=11', 200)
      }
      expect(failures.size).toBe(0)
    }
  )

  it('retains network failures, failed replacements, distinct queries and writes', () => {
    const failures = new Set<string>()
    const tracker = createHealthRequestTracker(failures)
    tracker.failed('GET', '/api/schedules?month=10', 'net::ERR_ABORTED')
    tracker.failed('GET', '/api/schedules?month=11', 'net::ERR_FAILED')
    tracker.failed('GET', '/api/posts', 'net::ERR_ABORTED')
    tracker.failed('POST', '/api/comments', 'net::ERR_ABORTED')
    tracker.responded('GET', '/api/schedules?month=11', 200)
    tracker.responded('GET', '/api/posts', 503)
    tracker.responded('POST', '/api/comments', 200)
    expect(failures.size).toBe(4)
  })
  it('recognizes the deliberate missing-route document on the audited origin', () => {
    expect(
      isExpectedHealthNotFoundDocument(
        '/this-route-does-not-exist',
        'https://momichan.com/this-route-does-not-exist',
        'https://momichan.com'
      )
    ).toBe(true)
  })

  it.each([
    ['/explore', 'https://momichan.com/this-route-does-not-exist'],
    ['/this-route-does-not-exist', 'https://momichan.com/assets/missing.js'],
    ['/this-route-does-not-exist', 'https://momichan.com/api/missing'],
    ['/this-route-does-not-exist', 'https://other.example/this-route-does-not-exist'],
    ['/this-route-does-not-exist', ''],
  ])('keeps unrelated failures blocking: %s / %s', (route, url) => {
    expect(isExpectedHealthNotFoundDocument(route, url, 'https://momichan.com')).toBe(false)
  })

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

  it('classifies local preview upstream and client-report failures as environment blockers', () => {
    const options = {
      allowLocalPreviewApiNoise: true,
      baseOrigin: 'http://127.0.0.1:4174',
    }

    expect(
      isLocalPreviewEnvironmentBlocker('530 GET http://127.0.0.1:4174/api/posts', options)
    ).toBe(true)
    expect(
      isLocalPreviewEnvironmentBlocker(
        'GET http://127.0.0.1:4174/api/posts upstream unavailable',
        options
      )
    ).toBe(true)
    expect(
      isLocalPreviewEnvironmentBlocker(
        'POST http://127.0.0.1:4174/client-report client-report unavailable',
        options
      )
    ).toBe(true)
    expect(
      shouldIgnoreConsoleError(
        'Failed to load resource: the server responded with a status of 530 () http://127.0.0.1:4174/api/posts',
        false,
        null,
        options
      )
    ).toBe(true)
    expect(
      shouldIgnoreRequestIssue('http://127.0.0.1:4174/api/posts?status=530', false, options)
    ).toBe(true)
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
