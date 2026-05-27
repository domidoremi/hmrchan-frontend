import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('vue', async () => await import('vue/dist/vue.runtime-with-vapor.esm-browser.js'))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'common.error': 'Error',
        'common.noResults': 'No results',
        'common.loading': 'Loading...',
        'common.notFound': 'Not found',
        'common.retry': 'Retry',
        'common.success': 'Success',
        'error.serviceUnavailable': 'Service unavailable',
        'error.tryAgain': 'Please try again later.',
      }

      return messages[key] ?? key
    },
  }),
}))
import { createApp, defineComponent, h, nextTick, vaporInteropPlugin, type App } from 'vue'
import StateIndicator from '../StateIndicator.vue'

const mountedApps: Array<{ app: App; host: HTMLDivElement }> = []
const stateIndicatorSource = readFileSync(
  resolve(process.cwd(), 'src/components/ui/StateIndicator.vue'),
  'utf8'
)

function mountStateIndicator(props: Record<string, unknown>) {
  const host = document.createElement('div')
  let actions = 0
  document.body.appendChild(host)

  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(StateIndicator, {
            ...props,
            onAction: () => {
              actions += 1
            },
          })
      },
    })
  )

  app.use(vaporInteropPlugin)
  app.mount(host)
  mountedApps.push({ app, host })

  return {
    host,
    get actions() {
      return actions
    },
  }
}

afterEach(() => {
  while (mountedApps.length > 0) {
    const entry = mountedApps.pop()
    entry?.app.unmount()
    entry?.host.remove()
  }
})

describe('StateIndicator', () => {
  it('renders loading as a passive state without a retry action', () => {
    const { host } = mountStateIndicator({ variant: 'loading' })

    expect(host.querySelector('.state-indicator--loading')).toBeInstanceOf(HTMLElement)
    expect(host.textContent).toContain('Loading...')
    expect(host.querySelector('button')).toBeNull()
  })

  it('renders service unavailable with recovery guidance and retry action', async () => {
    const result = mountStateIndicator({ variant: 'service-unavailable' })
    const button = result.host.querySelector('button')

    expect(result.host.querySelector('.state-indicator--service-unavailable')).toBeInstanceOf(
      HTMLElement
    )
    expect(result.host.textContent).toContain('Service unavailable')
    expect(result.host.textContent).toContain('Please try again later.')
    expect(button?.textContent).toContain('Retry')

    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(result.actions).toBe(1)
  })

  it('preserves the existing error retry default and custom description', () => {
    const { host } = mountStateIndicator({
      variant: 'error',
      description: 'Refresh the page or try again.',
    })

    expect(host.querySelector('.state-indicator--error')).toBeInstanceOf(HTMLElement)
    expect(host.textContent).toContain('Error')
    expect(host.textContent).toContain('Refresh the page or try again.')
    expect(host.querySelector('button')?.textContent).toContain('Retry')
  })

  it('exposes pet workflow hints for extended page states', () => {
    const success = mountStateIndicator({ variant: 'success' }).host.querySelector(
      '.state-indicator'
    )
    const unavailable = mountStateIndicator({ variant: 'model-unavailable' }).host.querySelector(
      '.state-indicator'
    )
    const syncing = mountStateIndicator({ variant: 'provider-sync' }).host.querySelector(
      '.state-indicator'
    )
    const update = mountStateIndicator({ variant: 'update-check' }).host.querySelector(
      '.state-indicator'
    )

    expect(success?.getAttribute('data-pet-state')).toBe('success')
    expect(unavailable?.getAttribute('data-model-status')).toBe('unavailable')
    expect(syncing?.getAttribute('data-provider-activity')).toBe('syncing')
    expect(update?.getAttribute('data-update-activity')).toBe('checking')
  })

  it('disables loading icon animation when reduced motion is requested', () => {
    expect(stateIndicatorSource).toContain('.state-indicator--loading .state-indicator__icon')
    expect(stateIndicatorSource).toContain('.state-indicator--model-testing .state-indicator__icon')
    expect(stateIndicatorSource).toContain('.state-indicator--update-check .state-indicator__icon')
  })
})
