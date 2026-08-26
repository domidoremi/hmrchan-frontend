import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const pagePrimitivesSource = readFileSync(
  resolve(process.cwd(), 'src/styles/components/page-primitives.css'),
  'utf8'
)
const profileSettingsSource = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/profile-settings-page-view.css'),
  'utf8'
)
const searchPageSource = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/search-page-view.css'),
  'utf8'
)
const explorePageSource = readFileSync(resolve(process.cwd(), 'src/views/ExplorePage.vue'), 'utf8')
const communityPageSource = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/community-page-view.css'),
  'utf8'
)
const profilePageSource = readFileSync(resolve(process.cwd(), 'src/views/ProfilePage.vue'), 'utf8')
const profileSecurityPageSource = readFileSync(
  resolve(process.cwd(), 'src/views/ProfileSecurityPage.vue'),
  'utf8'
)
const postDetailPageSource = readFileSync(
  resolve(process.cwd(), 'src/views/PostDetailPage.vue'),
  'utf8'
)
const aboutPageSource = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/about-page-view.css'),
  'utf8'
)
const authCompatSource = readFileSync(resolve(process.cwd(), 'src/styles/auth-compat.css'), 'utf8')
const publicPagesSource = readFileSync(
  resolve(process.cwd(), 'src/styles/public-pages.css'),
  'utf8'
)
const homePageSource = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/home-page-view.css'),
  'utf8'
)
const stageLetterbookSource = readFileSync(
  resolve(process.cwd(), 'src/styles/stage-letterbook.css'),
  'utf8'
)
const appShellSource = readFileSync(resolve(process.cwd(), 'src/App.vue'), 'utf8')

describe('responsive layout contracts', () => {
  it('keeps shared page shells stacking hero and toolbar controls on narrow screens', () => {
    expect(pagePrimitivesSource).toContain('@media (max-width: 768px)')
    expect(pagePrimitivesSource).toContain('.page-hero-shell__header')
    expect(pagePrimitivesSource).toContain('flex-direction: column')
    expect(pagePrimitivesSource).toContain('.page-hero-shell__actions')
    expect(pagePrimitivesSource).toContain('align-items: stretch')
    expect(pagePrimitivesSource).toContain('.page-toolbar-shell > :where(')
    expect(pagePrimitivesSource).toContain('flex: 1 1 100%')
  })

  it('lets shared section copy shrink to its content after mobile headers stack', () => {
    expect(publicPagesSource).toContain('@media (max-width: 48rem)')
    expect(publicPagesSource).toContain('.page-section-copy {')
    expect(publicPagesSource).toContain('flex: 0 1 auto')
    expect(publicPagesSource).toContain('inline-size: 100%')
  })

  it('keeps home section actions in the mobile column instead of wrapping off canvas', () => {
    expect(homePageSource).toContain('.page-section-copy {')
    expect(homePageSource).toContain('flex: 0 1 auto')
    expect(homePageSource).toContain('inline-size: 100%')
  })

  it('keeps profile settings sections fluid instead of capped by viewport-coupled widths', () => {
    expect(profileSettingsSource).toContain('.settings-section {')
    expect(profileSettingsSource).toContain('inline-size: 100%')
    expect(profileSettingsSource).toContain('max-inline-size: 100%')
    expect(profileSettingsSource).toContain('.settings-form {')
    expect(profileSettingsSource).toContain('display: grid')
    expect(profileSettingsSource).toContain('.field-hint-row {')
    expect(profileSettingsSource).toContain('flex-wrap: wrap')
    expect(profileSettingsSource).toContain('.account-actions > *')
    expect(profileSettingsSource).toContain('flex: 1 1 100%')
  })

  it('lets search filters, hints, and history items wrap on small viewports', () => {
    expect(searchPageSource).toContain('.search-filters {')
    expect(searchPageSource).toContain('min-inline-size: 0')
    expect(searchPageSource).toContain('.login-hint-content {')
    expect(searchPageSource).toContain('flex-direction: column')
    expect(searchPageSource).toContain('.search-history-item__query {')
    expect(searchPageSource).toContain('overflow-wrap: anywhere')
    expect(searchPageSource).toContain('@media (max-width: 640px)')
    expect(searchPageSource).toContain('flex-basis: 100%')
  })

  it('lets explore masonry collapse to a single flowing column on phones', () => {
    expect(explorePageSource).toContain('.posts-masonry-js {')
    expect(explorePageSource).toContain('align-items: flex-start')
    expect(explorePageSource).toContain('@media (max-width: 767px)')
    expect(explorePageSource).toContain('flex-direction: column')
    expect(explorePageSource).toContain('.masonry-column {')
    expect(explorePageSource).toContain('inline-size: 100%')
  })

  it('front-loads community actions and lets hero controls wrap on phones', () => {
    expect(communityPageSource).toContain('.community-priority-grid {')
    expect(communityPageSource).toContain(
      'grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr))'
    )
    expect(communityPageSource).toContain('.community-priority-card__actions {')
    expect(communityPageSource).toContain('flex-wrap: wrap')
    expect(communityPageSource).toContain('.community-hero__actions {')
    expect(communityPageSource).toContain('justify-content: stretch')
  })

  it('front-loads profile actions and keeps command cards fluid', () => {
    expect(profilePageSource).toContain('.profile-command-grid {')
    expect(profilePageSource).toContain(
      'grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr))'
    )
    expect(profilePageSource).toContain('.profile-command-link {')
    expect(profilePageSource).toContain('justify-content: space-between')
    expect(profilePageSource).toContain('@media (max-width: 768px)')
  })

  it('keeps profile security workspace chips and entry meta wrapping on smaller screens', () => {
    expect(profileSecurityPageSource).toContain('.security-workspace__chips {')
    expect(profileSecurityPageSource).toContain('flex-wrap: wrap')
    expect(profileSecurityPageSource).toContain('.security-entry__footer {')
    expect(profileSecurityPageSource).toContain('flex-wrap: wrap')
    expect(profileSecurityPageSource).toContain('@media (max-width: 768px)')
    expect(profileSecurityPageSource).toContain('flex: 1 1 calc(50% - 0.75rem)')
    expect(profileSecurityPageSource).toContain('overflow-wrap: anywhere')
  })

  it('keeps post detail top-aligned while centering the shell inside the stage', () => {
    expect(postDetailPageSource).toContain('.post-stage {')
    expect(postDetailPageSource).toContain('align-items: flex-start')
    expect(postDetailPageSource).toContain('justify-content: center')
    expect(postDetailPageSource).toContain('inline-size: 100%')
    expect(postDetailPageSource).toContain('.post-shell {')
    expect(postDetailPageSource).toContain('flex: 0 1 var(--container-max)')
    expect(postDetailPageSource).toContain('inline-size: min(100%, var(--container-max))')
    expect(postDetailPageSource).toContain('max-inline-size: var(--container-max)')
    expect(postDetailPageSource).toContain('min-inline-size: 0')
    expect(postDetailPageSource).toContain('.post-header {')
    expect(postDetailPageSource).toContain('min-block-size: 0')
    expect(postDetailPageSource).toContain('.post-text-panel {')
    expect(postDetailPageSource).toContain(
      'max-height: min(82svh, calc(100dvh - 2 * var(--spacing-4)))'
    )
  })

  it('lets about link metadata and tech badges wrap instead of truncating on narrow screens', () => {
    expect(aboutPageSource).toContain('.link-desc {')
    expect(aboutPageSource).toContain('overflow-wrap: anywhere')
    expect(aboutPageSource).toContain('.tech-header {')
    expect(aboutPageSource).toContain('flex-wrap: wrap')
    expect(aboutPageSource).toContain('.tech-version-badge {')
    expect(aboutPageSource).toContain('white-space: normal')
  })

  it('lets the About section title keep content height after mobile headers stack', () => {
    expect(aboutPageSource).toContain('@media (max-width: 48rem)')
    expect(aboutPageSource).toContain('.about-page .about-section-title {')
    expect(aboutPageSource).toContain('flex: 0 1 auto')
    expect(aboutPageSource).toContain('inline-size: 100%')
  })

  it('lets auth inline states and short viewports degrade into a single flowing column', () => {
    expect(authCompatSource).toContain('#app .auth-inline-state__content,')
    expect(authCompatSource).toContain('min-inline-size: 0')
    expect(authCompatSource).toContain('@media (max-width: 48rem)')
    expect(authCompatSource).toContain('#app .auth-inline-state {')
    expect(authCompatSource).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(authCompatSource).toContain('@media (max-height: 52rem)')
    expect(authCompatSource).toContain('place-items: start center')
  })

  it('reserves room for the auth back control beside long mobile titles', () => {
    expect(stageLetterbookSource).toContain('#app .auth-shell__copy {')
    expect(stageLetterbookSource).toContain('max-inline-size: calc(100% - 3.5rem)')
  })

  it('keeps global navigation chrome out of auth entry layouts', () => {
    expect(appShellSource).toContain('<AppSideNav v-if="!isAuthRoute" chromeless />')
    expect(appShellSource).toContain("'passkey-recovery'")
    expect(appShellSource).toContain("'passkey-recovery-detail'")
    expect(appShellSource).toMatch(/main\.main--auth\s*\{[^}]*padding-bottom:\s*0/s)
  })

  it('keeps home hero actions compact with centered labels', () => {
    expect(stageLetterbookSource).toContain('#app .home-fold .hero-btn {')
    expect(stageLetterbookSource).toContain('block-size: 2.75rem')
    expect(stageLetterbookSource).toContain('padding-block: 0')
    expect(stageLetterbookSource).toContain('text-align: center')
    expect(stageLetterbookSource).toContain('#app .home-fold .hero-btn .btn-content {')
    expect(stageLetterbookSource).toContain('transform: none')
  })
})
