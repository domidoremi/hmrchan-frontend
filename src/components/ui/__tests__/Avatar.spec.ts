import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('vue', async () => await import('vue/dist/vue.runtime-with-vapor.esm-browser.js'))
import { createApp, defineComponent, h, nextTick, vaporInteropPlugin, type App } from 'vue'
import Avatar from '../Avatar.vue'

const mountedApps: Array<{ app: App; host: HTMLDivElement }> = []

function mountAvatar(props: Record<string, unknown>) {
  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp(
    defineComponent({
      setup() {
        return () => h(Avatar, props)
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

describe('UiAvatar', () => {
  it('renders the provided image before any failure occurs', () => {
    const host = mountAvatar({
      src: 'https://example.com/avatar.jpg',
      alt: 'Avatar alt',
      fallback: 'A',
      size: 'xl',
      loading: 'eager',
      decoding: 'sync',
      fetchPriority: 'high',
    })

    const img = host.querySelector('img')
    const avatar = host.querySelector('.ui-avatar')

    expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg')
    expect(img?.getAttribute('alt')).toBe('Avatar alt')
    expect(img?.getAttribute('loading')).toBe('eager')
    expect(img?.getAttribute('decoding')).toBe('sync')
    expect(img?.getAttribute('fetchpriority')).toBe('high')
    expect(avatar?.classList.contains('ui-avatar--xl')).toBe(true)
  })

  it('falls back to the provided label after the image errors', async () => {
    const host = mountAvatar({
      src: 'https://example.com/avatar.jpg',
      fallback: 'A',
      shape: 'square',
    })

    const img = host.querySelector('img')
    img?.dispatchEvent(new Event('error'))
    await nextTick()

    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('.ui-avatar__fallback')?.textContent?.trim()).toBe('A')
    expect(host.querySelector('.ui-avatar')?.classList.contains('ui-avatar--square')).toBe(true)
  })

  it('skips inline sizing when custom size is requested', () => {
    const host = mountAvatar({
      fallback: 'A',
      size: 'custom',
    })

    expect(host.querySelector('.ui-avatar')?.getAttribute('style')).toBeNull()
  })
})
