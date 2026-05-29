import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const communityPageSource = readFileSync(
  resolve(process.cwd(), 'src/views/CommunityPage.vue'),
  'utf8'
)
const communityPageStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/community-page-view.css'),
  'utf8'
)
const stylesIndex = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8')

describe('CommunityPage styles', () => {
  it('keeps page presentation in the layered page-system stylesheet', () => {
    expect(communityPageSource).not.toContain('<style')
    expect(stylesIndex).toContain(
      "@import './page-systems/community-page-view.css' layer(page-systems);"
    )
    expect(communityPageStyles).toContain('.community-page .community-priority-grid {')
    expect(communityPageStyles).toContain('.community-page .discussions-list {')
  })

  it('keeps migrated selectors scoped under the community page root', () => {
    expect(communityPageStyles).toContain('.community-page .community-hero__actions {')
    expect(communityPageStyles).toContain('.community-page .community-priority-card__actions {')
    expect(communityPageStyles).toContain('@media (max-width: 640px)')
    expect(communityPageStyles).not.toContain('\n.community-hero__actions {')
    expect(communityPageStyles).not.toContain('\n.discussions-list {')
  })
})
