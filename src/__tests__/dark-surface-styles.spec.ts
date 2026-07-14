import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const postCardSkeletonSource = readFileSync(
  resolve(process.cwd(), 'src/components/business/PostCardSkeleton.vue'),
  'utf8'
)
const publicPagesSource = readFileSync(
  resolve(process.cwd(), 'src/styles/public-pages.css'),
  'utf8'
)

describe('theme-aware shared surfaces', () => {
  it('derives post skeleton containers from semantic surfaces instead of fixed light gradients', () => {
    expect(postCardSkeletonSource).toContain('var(--semantic-surface-base)')
    expect(postCardSkeletonSource).toContain('var(--semantic-surface-muted)')
    expect(postCardSkeletonSource).not.toContain(
      'linear-gradient(160deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.78))'
    )
    expect(postCardSkeletonSource).not.toContain(
      'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.82))'
    )
  })

  it('composes editorial surfaces from the page theme instead of a fixed white panel', () => {
    expect(publicPagesSource).toContain('radial-gradient(circle at top right')
    expect(publicPagesSource).toContain('var(--page-card-bg)')
    expect(publicPagesSource).not.toContain(
      'linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.74))'
    )
  })
})
