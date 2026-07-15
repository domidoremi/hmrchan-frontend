import { describe, expect, it } from 'vitest'

import {
  FeaturedRailSection,
  HeroSection,
  HomePagePreviewController,
  HomeQuickNav,
  LatestPostsSection,
  StoryDeckSection,
} from '../index'

describe('home component exports', () => {
  it('exposes the public home component boundary', () => {
    expect(
      [
        FeaturedRailSection,
        HeroSection,
        HomePagePreviewController,
        HomeQuickNav,
        LatestPostsSection,
        StoryDeckSection,
      ].every(Boolean)
    ).toBe(true)
  })
})
