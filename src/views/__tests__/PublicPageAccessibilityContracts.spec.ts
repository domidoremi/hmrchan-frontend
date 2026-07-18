import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const homeSource = readSource('src/views/HomePage.vue')
const exploreSource = readSource('src/views/ExplorePage.vue')
const communitySource = readSource('src/views/CommunityPage.vue')
const scheduleSource = readSource('src/views/SchedulePage.vue')
const letterbookSource = readSource('src/styles/stage-letterbook.css')

describe('public page accessibility contracts', () => {
  it('lets visible Home and Community copy participate in accessible control names', () => {
    expect(homeSource).not.toContain(':aria-label="$t(\'home.letterbook.todayTitle\')"')
    expect(communitySource).not.toContain(':aria-label="$t(\'community.loginToPost\')"')
  })

  it('uses page-level headings for route-level state indicators', () => {
    expect(exploreSource.match(/title-tag="h2"/g)).toHaveLength(2)
    expect(communitySource.match(/title-tag="h2"/g)).toHaveLength(6)
  })

  it('keeps schedule badges paper-backed and accent controls on high-contrast ink', () => {
    expect(scheduleSource.match(/--event-category-color/g)).toHaveLength(3)
    expect(scheduleSource).not.toContain("getCategoryColor(evt.category) + '16'")
    expect(letterbookSource).toContain('--letterbook-on-accent: #0c0408')
    expect(letterbookSource).toContain('--color-on-primary: var(--letterbook-on-accent)')
    expect(letterbookSource).toContain('color: var(--letterbook-ink)')
  })
})
