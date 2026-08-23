import { describe, expect, it } from 'vitest'

import {
  calculateAge,
  extractVersion,
  useHmrAboutContent,
} from '@/hmr/composables/useHmrAboutContent'

describe('useHmrAboutContent', () => {
  it('exposes the main-site profile and verified external destinations', () => {
    const about = useHmrAboutContent()

    expect(about.profileItems).toHaveLength(11)
    expect(about.officialLinks.map((item) => item.id)).toEqual([
      'group-site',
      'member-page',
      'schedule',
      'fan-club',
      'shop',
    ])
    expect(about.personalLinks.find((item) => item.id === 'x')?.url).toBe(
      'https://x.com/himeri_momiyama'
    )
    expect(about.groupSocialLinks).toHaveLength(11)
  })

  it('uses current official documentation links for the actual next stack', () => {
    const technologies = useHmrAboutContent().techStack
    const byId = new Map(technologies.map((item) => [item.id, item]))

    expect(byId.get('vite')?.url).toBe('https://vite.dev/')
    expect(byId.get('cloudflare')?.url).toBe('https://developers.cloudflare.com/pages/')
    expect(byId.get('bun')?.version).toBe('1.4.0')
    expect(byId.has('gsap')).toBe(false)
    expect(byId.has('pinia-persisted-state')).toBe(false)
  })

  it('extracts display versions from package ranges', () => {
    expect(extractVersion('3.5.40')).toBe('3.5')
    expect(extractVersion('^11.4.8')).toBe('11.4')
    expect(extractVersion('npm:rolldown-vite@^8.1.5')).toBe('8.1')
    expect(extractVersion('workspace:*')).toBe('N/A')
  })

  it('derives age from the March 22 birthday instead of storing a stale value', () => {
    expect(calculateAge(new Date(2026, 2, 21))).toBe(21)
    expect(calculateAge(new Date(2026, 2, 22))).toBe(22)
  })
})
