import { describe, expect, it } from 'vitest'
import { buildStoryCardMotion } from '../storyDeckMotion'

describe('buildStoryCardMotion', () => {
  it('uses a stable left-biased preset for the first stacked card', () => {
    const motion = buildStoryCardMotion({
      index: 0,
      storyProgressIndex: -1,
      storyCardCount: 5,
      storyMergeProgress: 0,
      storyFooterFade: 0,
    })

    expect(motion['--story-origin-inline']).toBe('16%')
    expect(motion['--story-rotate-y']).toContain('-')
    expect(motion['--story-translate-x']).toContain('-')
  })

  it('uses a mirrored right-biased preset for the second stacked card', () => {
    const motion = buildStoryCardMotion({
      index: 1,
      storyProgressIndex: 0,
      storyCardCount: 5,
      storyMergeProgress: 0,
      storyFooterFade: 0,
    })

    expect(motion['--story-origin-inline']).toBe('84%')
    expect(motion['--story-rotate-y']).not.toContain('-')
    expect(motion['--story-translate-x']).not.toContain('-')
  })

  it('adds exit rotation and keeps the active card readable while moving forward', () => {
    const motion = buildStoryCardMotion({
      index: 0,
      storyProgressIndex: 0.55,
      storyCardCount: 5,
      storyMergeProgress: 0,
      storyFooterFade: 0,
    })

    expect(motion['--story-opacity']).not.toBe('0')
    expect(motion['--story-copy-opacity']).not.toBe('0')
    expect(motion['--story-translate-y']).toContain('calc(')
  })
})
