import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const turnstileMocks = vi.hoisted(() => ({
  classifyTurnstileError: vi.fn(() => 'unknown'),
  describeTurnstileError: vi.fn(() => 'Turnstile failed'),
  extractTurnstileErrorCode: vi.fn(() => 'bad-input'),
}))

vi.mock('@/utils/turnstile', () => ({
  classifyTurnstileError: turnstileMocks.classifyTurnstileError,
  describeTurnstileError: turnstileMocks.describeTurnstileError,
  extractTurnstileErrorCode: turnstileMocks.extractTurnstileErrorCode,
  TURNSTILE_HOSTNAME_MISMATCH_CODE: '110200',
}))

import TurnstileWidget from '../TurnstileWidget.vue'

type RenderOptions = Record<string, unknown>

function createTurnstileApi() {
  let response: string | undefined
  let latestOptions: RenderOptions | null = null

  return {
    api: {
      render: vi.fn((_container: HTMLElement, options: RenderOptions) => {
        latestOptions = options
        return 'widget-1'
      }),
      execute: vi.fn(() => {
        const callback = latestOptions?.callback as ((token: string) => void) | undefined
        callback?.('token-from-execute')
      }),
      reset: vi.fn(),
      remove: vi.fn(),
      getResponse: vi.fn(() => response),
    },
    getLatestOptions: () => latestOptions,
    setResponse: (value: string | undefined) => {
      response = value
    },
  }
}

describe('TurnstileWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    turnstileMocks.classifyTurnstileError.mockReset()
    turnstileMocks.classifyTurnstileError.mockReturnValue('unknown')
    turnstileMocks.describeTurnstileError.mockReset()
    turnstileMocks.describeTurnstileError.mockReturnValue('Turnstile failed')
    turnstileMocks.extractTurnstileErrorCode.mockReset()
    turnstileMocks.extractTurnstileErrorCode.mockReturnValue('bad-input')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete window.turnstile
    delete window.onTurnstileLoad
  })

  it('renders on mount, emits verify, and rerenders when siteKey changes', async () => {
    const turnstile = createTurnstileApi()
    window.turnstile = turnstile.api

    const wrapper = mount(TurnstileWidget, {
      props: {
        siteKey: 'site-key-1',
        size: 'compact',
      },
    })

    await vi.advanceTimersByTimeAsync(100)

    expect(turnstile.api.render).toHaveBeenCalledTimes(1)
    expect(wrapper.classes()).toContain('turnstile-container--compact')
    ;(turnstile.getLatestOptions()?.callback as (token: string) => void)?.('verified-token')
    expect(wrapper.emitted('verify')?.[0]).toEqual(['verified-token'])

    await wrapper.setProps({ siteKey: 'site-key-2' })
    expect(turnstile.api.remove).toHaveBeenCalledWith('widget-1')
    expect(turnstile.api.render).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    expect(turnstile.api.remove).toHaveBeenCalledWith('widget-1')
  })

  it('supports invisible execute mode and resolves execute() with challenge token', async () => {
    const turnstile = createTurnstileApi()
    window.turnstile = turnstile.api

    const wrapper = mount(TurnstileWidget, {
      props: {
        siteKey: 'site-key',
        execution: 'execute',
        appearance: 'execute',
      },
    })

    await vi.advanceTimersByTimeAsync(100)

    expect(wrapper.classes()).toContain('turnstile-container--invisible')

    turnstile.setResponse(undefined)
    await expect(wrapper.vm.execute()).resolves.toBe('token-from-execute')
    expect(turnstile.api.execute).toHaveBeenCalledWith('widget-1')

    turnstile.setResponse('cached-token')
    await expect(wrapper.vm.execute()).resolves.toBe('cached-token')
  })

  it('emits normalized errors from challenge callbacks and supports reset()', async () => {
    const turnstile = createTurnstileApi()
    window.turnstile = turnstile.api
    turnstileMocks.classifyTurnstileError.mockReturnValue('network')
    turnstileMocks.extractTurnstileErrorCode.mockReturnValue('110100')
    turnstileMocks.describeTurnstileError.mockReturnValue('Network unavailable')

    const wrapper = mount(TurnstileWidget, {
      props: {
        siteKey: 'site-key',
      },
    })

    await vi.advanceTimersByTimeAsync(100)

    const errorCallback = turnstile.getLatestOptions()?.['error-callback'] as
      | ((code: unknown) => boolean)
      | undefined
    expect(errorCallback?.('110100')).toBe(true)

    const emittedError = wrapper.emitted('error')?.[0]?.[0] as Error & {
      code?: string
      kind?: string
    }
    expect(emittedError).toBeInstanceOf(Error)
    expect(emittedError.message).toBe('Network unavailable')
    expect(emittedError.code).toBe('110100')
    expect(emittedError.kind).toBe('network')

    wrapper.vm.reset()
    expect(turnstile.api.reset).toHaveBeenCalledWith('widget-1')
  })
})
