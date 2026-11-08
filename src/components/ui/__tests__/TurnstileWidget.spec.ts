import { flushPromises, mount } from '@vue/test-utils'
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

  it('keeps execute mode visible and resolves execute() with challenge token', async () => {
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

    expect(wrapper.classes()).not.toContain('turnstile-container--invisible')

    turnstile.setResponse(undefined)
    await expect(wrapper.vm.execute()).resolves.toBe('token-from-execute')
    expect(turnstile.api.execute).toHaveBeenCalledWith('widget-1')

    turnstile.setResponse('cached-token')
    await expect(wrapper.vm.execute()).resolves.toBe('cached-token')
    wrapper.unmount()
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
      ((code: unknown) => boolean) | undefined
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
    wrapper.unmount()
  })

  it('shares an in-flight execution and exposes interaction immediately', async () => {
    const turnstile = createTurnstileApi()
    turnstile.api.execute.mockImplementation(() => {})
    window.turnstile = turnstile.api
    const wrapper = mount(TurnstileWidget, {
      props: {
        siteKey: 'site-key',
        execution: 'execute',
        appearance: 'execute',
        autoExecute: true,
      },
    })
    await flushPromises()
    const first = wrapper.vm.execute()
    const second = wrapper.vm.execute()
    await flushPromises()
    expect(turnstile.api.execute).toHaveBeenCalledTimes(1)
    const options = turnstile.getLatestOptions()!
    ;(options['before-interactive-callback'] as () => void)()
    await flushPromises()
    expect(wrapper.attributes('data-status')).toBe('interactive_required')
    expect(wrapper.classes()).not.toContain('turnstile-container--invisible')
    ;(options.callback as (token: string) => void)('interactive-token')
    await expect(first).resolves.toBe('interactive-token')
    await expect(second).resolves.toBe('interactive-token')
    expect(wrapper.emitted('verify')).toEqual([['interactive-token']])
    wrapper.unmount()
  })

  it('leaves busy state after a timeout and starts a fresh challenge on retry', async () => {
    const turnstile = createTurnstileApi()
    turnstile.api.execute.mockImplementation(() => {})
    window.turnstile = turnstile.api
    const wrapper = mount(TurnstileWidget, {
      props: { siteKey: 'site-key', execution: 'execute' },
    })
    await flushPromises()
    const result = wrapper.vm.execute().catch((error: Error) => error)
    await flushPromises()
    ;(turnstile.getLatestOptions()!['timeout-callback'] as () => void)()
    expect(await result).toBeInstanceOf(Error)
    await flushPromises()
    expect(wrapper.attributes('data-status')).toBe('error')
    const retry = wrapper.vm.execute()
    await flushPromises()
    expect(turnstile.api.reset).toHaveBeenCalledOnce()
    ;(turnstile.getLatestOptions()!.callback as (token: string) => void)('fresh-token')
    await expect(retry).resolves.toBe('fresh-token')
    wrapper.unmount()
  })

  it('bounds a stalled execution instead of leaving the form busy forever', async () => {
    const turnstile = createTurnstileApi()
    turnstile.api.execute.mockImplementation(() => {})
    window.turnstile = turnstile.api
    const wrapper = mount(TurnstileWidget, { props: { siteKey: 'site-key', execution: 'execute' } })
    const result = wrapper.vm.execute().catch((error: Error) => error)
    await vi.advanceTimersByTimeAsync(120001)
    expect(await result).toBeInstanceOf(Error)
    expect(wrapper.attributes('data-status')).toBe('error')
    wrapper.unmount()
  })

  it('ignores callbacks and cancellation from a previous challenge after retry', async () => {
    const turnstile = createTurnstileApi()
    turnstile.api.execute.mockImplementation(() => {})
    window.turnstile = turnstile.api
    const wrapper = mount(TurnstileWidget, {
      props: {
        siteKey: 'site-key',
        execution: 'execute',
        autoExecute: true,
      },
    })
    await flushPromises()
    const previous = turnstile.getLatestOptions()!
    const retry = wrapper.vm.rerender()
    await flushPromises()
    ;(previous.callback as (token: string) => void)('obsolete-token')
    ;(previous['error-callback'] as (code: string) => void)('600010')
    expect(wrapper.emitted('error')).toBeUndefined()
    expect(wrapper.emitted('verify')).toBeUndefined()
    ;(turnstile.getLatestOptions()!.callback as (token: string) => void)('fresh-token')
    await retry
    expect(wrapper.emitted('verify')).toEqual([['fresh-token']])
    wrapper.unmount()
  })
})
