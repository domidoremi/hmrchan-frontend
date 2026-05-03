type DevtoolsDescriptor = Record<string, unknown>
type DevtoolsSetupFn = (api: Record<string, unknown>) => void | Promise<void>

const noop = (): void => {}
const noopReturnObject = (): Record<string, never> => ({})
const createEventHooks = (): Record<string, typeof noop> => ({
  inspectComponent: noop,
  visitComponentTree: noop,
  getInspectorTree: noop,
  getInspectorState: noop,
  editInspectorState: noop,
  editComponentState: noop,
})

export function setupDevToolsPlugin(
  _descriptor: DevtoolsDescriptor,
  setupFn: DevtoolsSetupFn
): void {
  void setupFn({
    addInspector: noop,
    sendInspectorTree: noop,
    sendInspectorState: noop,
    on: createEventHooks(),
    notifyComponentUpdate: noop,
    highlightElement: noop,
    unhighlightElement: noop,
    addTimelineLayer: noop,
    addTimelineEvent: noop,
    getInspectorNodeActions: noopReturnObject,
    getInspectorActions: noopReturnObject,
    getSettings: noopReturnObject,
    now: () => Date.now(),
  })
}

export const setupDevtoolsPlugin = setupDevToolsPlugin
export const addCustomCommand = noop
export const addCustomTab = noop
export const onDevToolsClientConnected = noop
export const onDevToolsConnected = noop
export const removeCustomCommand = noop
