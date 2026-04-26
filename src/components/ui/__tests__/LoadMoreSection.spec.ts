import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('vue', async () => await import('vue/dist/vue.runtime-with-vapor.esm-browser.js'))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, number>) => {
      if (key === 'common.showing') {
        return `Showing ${params?.count ?? 0} / ${params?.total ?? 0}`
      }
      if (key === 'common.loadMore') return 'Load More'
      if (key === 'common.loadingMore') return 'Loading more...'
      if (key === 'common.scrollToLoad') return 'Keep scrolling'
      if (key === 'common.noMoreItems') return 'No more items'
      if (key === 'common.loading') return 'Loading...'
      return key
    },
  }),
}))
import { createApp, defineComponent, h, vaporInteropPlugin, type App } from 'vue'
import LoadMoreSection from '../LoadMoreSection.vue'

const mountedApps: Array<{ app: App; host: HTMLDivElement }> = []
const loadMoreSectionSource = readFileSync(
  resolve(process.cwd(), 'src/components/ui/LoadMoreSection.vue'),
  'utf8'
)

function mountLoadMoreSection(props: Record<string, unknown>) {
  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp(
    defineComponent({
      setup() {
        return () => h(LoadMoreSection, props)
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

describe('LoadMoreSection', () => {
  it('renders a single manual load-more action and a non-redundant scroll hint', () => {
    const host = mountLoadMoreSection({
      count: 12,
      total: 48,
      hasMore: true,
      loading: false,
    })

    expect(host.querySelector('.ghost-action')).toBeNull()
    expect(host.querySelectorAll('.load-more-btn')).toHaveLength(1)
    expect(host.textContent).toContain('Keep scrolling')
    expect(host.textContent).toContain('Load More')
  })

  it('keeps the animated progress glow clipped inside the progress fill', () => {
    const host = mountLoadMoreSection({
      count: 12,
      total: 48,
      hasMore: true,
      loading: false,
    })

    const fill = host.querySelector('.progress-fill')
    const glow = host.querySelector('.progress-glow')

    expect(fill).toBeInstanceOf(HTMLElement)
    expect(glow).toBeInstanceOf(HTMLElement)
    expect(loadMoreSectionSource).toContain('overflow: hidden')
    expect(loadMoreSectionSource).toContain('inset-inline-start: 0')
    expect(loadMoreSectionSource).not.toContain('translateX(-30%)')
  })
})
