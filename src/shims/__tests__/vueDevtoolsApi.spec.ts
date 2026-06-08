import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  addCustomCommand,
  addCustomTab,
  onDevToolsClientConnected,
  onDevToolsConnected,
  removeCustomCommand,
  setupDevToolsPlugin,
  setupDevtoolsPlugin,
} from '../vueDevtoolsApi'

type DevtoolsShimApi = {
  addInspector: () => void
  addTimelineEvent: () => void
  addTimelineLayer: () => void
  getInspectorActions: () => Record<string, never>
  getInspectorNodeActions: () => Record<string, never>
  getSettings: () => Record<string, never>
  highlightElement: () => void
  notifyComponentUpdate: () => void
  now: () => number
  on: Record<string, () => void>
  sendInspectorState: () => void
  sendInspectorTree: () => void
  unhighlightElement: () => void
}

describe('vue devtools api shim', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes a no-op devtools api surface to plugin setup', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_713_312_000_000)
    let api: DevtoolsShimApi | undefined
    const setupFn = vi.fn((receivedApi: Record<string, unknown>) => {
      api = receivedApi as DevtoolsShimApi
    })

    setupDevToolsPlugin({ id: 'hmrchan' }, setupFn)

    expect(setupFn).toHaveBeenCalledOnce()
    expect(api).toEqual(
      expect.objectContaining({
        addInspector: expect.any(Function),
        addTimelineEvent: expect.any(Function),
        addTimelineLayer: expect.any(Function),
        getInspectorActions: expect.any(Function),
        getInspectorNodeActions: expect.any(Function),
        getSettings: expect.any(Function),
        highlightElement: expect.any(Function),
        notifyComponentUpdate: expect.any(Function),
        now: expect.any(Function),
        on: expect.any(Object),
        sendInspectorState: expect.any(Function),
        sendInspectorTree: expect.any(Function),
        unhighlightElement: expect.any(Function),
      })
    )

    expect(() => api?.addInspector()).not.toThrow()
    expect(() => api?.sendInspectorTree()).not.toThrow()
    expect(() => api?.sendInspectorState()).not.toThrow()
    expect(() => api?.notifyComponentUpdate()).not.toThrow()
    expect(() => api?.highlightElement()).not.toThrow()
    expect(() => api?.unhighlightElement()).not.toThrow()
    expect(() => api?.addTimelineLayer()).not.toThrow()
    expect(() => api?.addTimelineEvent()).not.toThrow()
    expect(api?.getInspectorNodeActions()).toEqual({})
    expect(api?.getInspectorActions()).toEqual({})
    expect(api?.getSettings()).toEqual({})
    expect(api?.now()).toBe(1_713_312_000_000)
  })

  it('provides no-op event hooks for optional inspector callbacks', () => {
    let api: DevtoolsShimApi | undefined

    setupDevToolsPlugin({}, (receivedApi) => {
      api = receivedApi as DevtoolsShimApi
    })

    expect(api?.on).toEqual(
      expect.objectContaining({
        editComponentState: expect.any(Function),
        editInspectorState: expect.any(Function),
        getInspectorState: expect.any(Function),
        getInspectorTree: expect.any(Function),
        inspectComponent: expect.any(Function),
        visitComponentTree: expect.any(Function),
      })
    )

    for (const hook of Object.values(api?.on ?? {})) {
      expect(() => hook()).not.toThrow()
    }
  })

  it('keeps compatibility aliases and exported extension no-ops callable', async () => {
    const asyncSetup = vi.fn(async () => undefined)

    expect(setupDevtoolsPlugin).toBe(setupDevToolsPlugin)
    expect(() => setupDevtoolsPlugin({}, asyncSetup)).not.toThrow()
    expect(asyncSetup).toHaveBeenCalledOnce()
    await expect(asyncSetup.mock.results[0]?.value).resolves.toBeUndefined()

    expect(() => addCustomCommand()).not.toThrow()
    expect(() => addCustomTab()).not.toThrow()
    expect(() => onDevToolsClientConnected()).not.toThrow()
    expect(() => onDevToolsConnected()).not.toThrow()
    expect(() => removeCustomCommand()).not.toThrow()
  })
})
