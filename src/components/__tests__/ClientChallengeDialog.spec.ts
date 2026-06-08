import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockVerify = vi.hoisted(() => vi.fn())

vi.mock('@/api/clientSecurityService', () => ({
  clientSecurityService: {
    verify: mockVerify,
  },
}))

type TurnstileOptions = {
  sitekey: string
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
}

type TurnstileMock = {
  render: ReturnType<typeof vi.fn<(container: HTMLElement, options: TurnstileOptions) => string>>
  remove: ReturnType<typeof vi.fn<(widgetId: string) => void>>
  reset: ReturnType<typeof vi.fn<(widgetId: string) => void>>
}

function turnstileWindow() {
  return window as typeof window & { turnstile?: TurnstileMock }
}

function installTurnstileMock() {
  let latestOptions: TurnstileOptions | null = null
  const turnstile: TurnstileMock = {
    render: vi.fn((_container, options) => {
      latestOptions = options
      return 'widget-1'
    }),
    remove: vi.fn(),
    reset: vi.fn(),
  }
  turnstileWindow().turnstile = turnstile

  return {
    get options() {
      if (!latestOptions) {
        throw new Error('Turnstile widget was not rendered')
      }
      return latestOptions
    },
    turnstile,
  }
}

async function importBridgeAndDialog() {
  const bridge = await import('@/api/clientChallengeBridge')
  const { default: ClientChallengeDialog } = await import('@/components/ClientChallengeDialog.vue')
  return { bridge, ClientChallengeDialog }
}

describe('ClientChallengeDialog', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    mockVerify.mockReset()
    mockVerify.mockResolvedValue({ success: true, trust_level: 'basic' })
    Reflect.deleteProperty(turnstileWindow(), 'turnstile')
    document.body.innerHTML = ''
    document.head.querySelector('#hmr-turnstile-script')?.remove()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    Reflect.deleteProperty(turnstileWindow(), 'turnstile')
    document.body.innerHTML = ''
    document.head.querySelector('#hmr-turnstile-script')?.remove()
  })

  it('renders Turnstile with the requested site key and resolves the pending challenge', async () => {
    const turnstile = installTurnstileMock()
    const { bridge, ClientChallengeDialog } = await importBridgeAndDialog()
    const pending = bridge.requestClientChallenge('site-key-1')
    const wrapper = mount(ClientChallengeDialog, { attachTo: document.body })

    await flushPromises()

    expect(turnstile.turnstile.render).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        sitekey: 'site-key-1',
      })
    )

    turnstile.options.callback('turnstile-token')
    await flushPromises()

    await expect(pending).resolves.toBe(true)
    expect(mockVerify).toHaveBeenCalledWith('turnstile-token')
    expect(bridge.clientChallengeState.isOpen.value).toBe(false)

    wrapper.unmount()
  })

  it('shows an error and resets the widget when verification fails', async () => {
    const turnstile = installTurnstileMock()
    mockVerify.mockRejectedValueOnce(new Error('verify failed'))
    const { bridge, ClientChallengeDialog } = await importBridgeAndDialog()
    bridge.setClientChallengeSiteKey('site-key-1')
    const wrapper = mount(ClientChallengeDialog, { attachTo: document.body })

    await flushPromises()
    turnstile.options.callback('turnstile-token')
    await flushPromises()

    expect(document.body.textContent).toContain('验证暂时不可用，请稍后重试。')
    expect(turnstile.turnstile.reset).toHaveBeenCalledWith('widget-1')

    wrapper.unmount()
  })

  it('resets the widget when Turnstile expires', async () => {
    const turnstile = installTurnstileMock()
    const { bridge, ClientChallengeDialog } = await importBridgeAndDialog()
    bridge.setClientChallengeSiteKey('site-key-1')
    const wrapper = mount(ClientChallengeDialog, { attachTo: document.body })

    await flushPromises()
    turnstile.options['expired-callback']()

    expect(turnstile.turnstile.reset).toHaveBeenCalledWith('widget-1')

    wrapper.unmount()
  })

  it('marks the dialog unavailable when no site key is configured', async () => {
    const turnstile = installTurnstileMock()
    const { ClientChallengeDialog } = await importBridgeAndDialog()
    const wrapper = mount(ClientChallengeDialog, { attachTo: document.body })

    await flushPromises()

    expect(document.body.textContent).toContain('验证暂时不可用，请稍后重试。')
    expect(turnstile.turnstile.render).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('dismisses the pending challenge from the secondary action', async () => {
    installTurnstileMock()
    const { bridge, ClientChallengeDialog } = await importBridgeAndDialog()
    const pending = bridge.requestClientChallenge('site-key-1')
    const wrapper = mount(ClientChallengeDialog, { attachTo: document.body })

    await flushPromises()
    document.body
      .querySelector<HTMLButtonElement>('button.hmr-client-challenge__secondary')
      ?.click()
    await flushPromises()

    await expect(pending).resolves.toBe(false)
    expect(bridge.clientChallengeState.isOpen.value).toBe(false)

    wrapper.unmount()
  })

  it('removes the rendered widget on unmount', async () => {
    const turnstile = installTurnstileMock()
    const { bridge, ClientChallengeDialog } = await importBridgeAndDialog()
    bridge.setClientChallengeSiteKey('site-key-1')
    const wrapper = mount(ClientChallengeDialog, { attachTo: document.body })

    await flushPromises()
    wrapper.unmount()

    expect(turnstile.turnstile.remove).toHaveBeenCalledWith('widget-1')
  })
})
