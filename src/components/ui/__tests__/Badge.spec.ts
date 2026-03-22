import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, vaporInteropPlugin, type App } from 'vue'
import Badge from '../Badge.vue'

const mountedApps: Array<{ app: App; host: HTMLDivElement }> = []

function mountBadge(props: Record<string, unknown>, slotText = 'Badge text') {
  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(Badge, props, {
            default: () => [slotText],
          })
      },
    })
  )

  app.use(vaporInteropPlugin)
  app.mount(host)
  mountedApps.push({ app, host })
  return host
}

afterEach(() => {
  while (mountedApps.length > 0) {
    const entry = mountedApps.pop()
    entry?.app.unmount()
    entry?.host.remove()
  }
})

describe('UiBadge', () => {
  it('renders slot content with the requested variant and size classes', () => {
    const host = mountBadge({ variant: 'success', size: 'lg' }, 'Verified')
    const badge = host.querySelector('.ui-badge')

    expect(badge?.textContent?.trim()).toBe('Verified')
    expect(badge?.classList.contains('ui-badge--success')).toBe(true)
    expect(badge?.classList.contains('ui-badge--lg')).toBe(true)
  })
})
