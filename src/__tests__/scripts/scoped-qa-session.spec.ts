import { describe, expect, it } from 'vitest'
import {
  buildScopedQaCacheCommands,
  validateScopedQaSettings,
} from '../../../scripts/lib/scoped-qa-session.js'

const origin = 'https://candidate.example.com'
const settings = {
  LOCAL_AUDIT_SCOPED_QA_SESSION: 'true',
  LOCAL_AUDIT_SCOPED_ORIGINS: origin,
  PRIMARY_USERNAME: 'qa-design-0123456789ab',
}
const fingerprint = 'a'.repeat(48)
const canonical = 'b'.repeat(64)

describe('scoped QA session isolation', () => {
  it('requires an explicit opt-in and an exact origin', () => {
    expect(validateScopedQaSettings({}, origin)).toBe(false)
    expect(validateScopedQaSettings(settings, `${origin}/login`)).toBe(origin)
    expect(() => validateScopedQaSettings(settings, 'https://other.example.com')).toThrow()
    expect(() => validateScopedQaSettings(settings, `${origin}.evil.test`)).toThrow()
    expect(() =>
      validateScopedQaSettings({ ...settings, LOCAL_AUDIT_SCOPED_ORIGINS: '*' }, origin)
    ).toThrow()
  })

  it('refuses ordinary accounts and SQL metacharacters', () => {
    for (const name of ['admin', 'real-user', "qa-example';--"]) {
      expect(() =>
        validateScopedQaSettings({ ...settings, PRIMARY_USERNAME: name }, origin)
      ).toThrow()
    }
  })

  it('limits cache writes to the exact fresh visitor and a ten-minute lifetime', () => {
    const commands = buildScopedQaCacheCommands(
      { ip: '127.0.0.1', fingerprint, canonical },
      fingerprint,
      { 'user-agent': 'QA Browser', 'accept-language': 'en-US' }
    )
    expect(commands).toHaveLength(4)
    expect(
      commands
        .filter((command: string[]) => command[1]?.startsWith('visitor:'))
        .map((command: string[]) => command[1])
    ).toEqual([`visitor:127.0.0.1:${fingerprint}`, `visitor:127.0.0.1:${canonical}`])
    expect(
      commands.every(
        (command: string[]) =>
          command[0] === 'SET' &&
          command[3] === 'EX' &&
          command[4] === '600' &&
          !command[1]?.includes('*')
      )
    ).toBe(true)
  })

  it('refuses a different visitor, malformed identity, or an invalid IP', () => {
    for (const record of [
      { ip: '127.0.0.1', fingerprint: 'c'.repeat(48), canonical },
      { ip: '127.0.0.1:*', fingerprint, canonical },
      { ip: '127.0.0.1', fingerprint, canonical: '*' },
    ]) {
      expect(() => buildScopedQaCacheCommands(record, fingerprint, {})).toThrow()
    }
    expect(() =>
      buildScopedQaCacheCommands({ ip: '127.0.0.1', fingerprint: '*', canonical }, '*', {})
    ).toThrow()
  })

  it('binds the Turnstile fixture to the actual browser headers', () => {
    const record = { ip: '127.0.0.1', fingerprint, canonical }
    const first = buildScopedQaCacheCommands(record, fingerprint, { 'user-agent': 'QA A' })
    const second = buildScopedQaCacheCommands(record, fingerprint, { 'user-agent': 'QA B' })
    expect(first[1]?.[1]).not.toBe(second[1]?.[1])
    expect(first[0]).toEqual(second[0])
  })
})
