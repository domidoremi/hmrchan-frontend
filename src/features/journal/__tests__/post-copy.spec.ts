import { describe, expect, it } from 'vitest'
import { postCopyPresentation } from '../post-copy'

describe('journal card copy', () => {
  it('hides whitespace-equivalent repetition while preserving the original fields', () => {
    const post = Object.freeze({ title: '  First\nsecond  ', text: 'First  second\n' })
    expect(postCopyPresentation(post)).toEqual({
      showTextTitle: false,
      showImageExcerpt: false,
    })
    expect(post).toEqual({ title: '  First\nsecond  ', text: 'First  second\n' })
  })

  it('hides a known local fallback and retains the full distinct body for an image excerpt', () => {
    const text = `First paragraph\n\n${'完整正文🙂'.repeat(40)}`
    const post = Object.freeze({
      title: text.slice(0, 100),
      titleOrigin: 'fallback' as const,
      text,
      textOrigin: 'post' as const,
    })
    expect(postCopyPresentation(post)).toEqual({
      showTextTitle: false,
      showImageExcerpt: true,
    })
    expect(post.text).toBe(text)
  })

  it('uses the primary text entry when no separate body exists', () => {
    expect(postCopyPresentation({ title: 'Only title', text: '' })).toEqual({
      showTextTitle: false,
      showImageExcerpt: false,
    })
  })

  it.each([
    {
      name: 'a short independent title reused at the start of the body',
      title: 'A real title',
      text: `A real title\n${'Additional body. '.repeat(5)}`,
      showTextTitle: true,
    },
    {
      name: 'an unknown long prefix without a trailing ellipsis',
      title: '文'.repeat(100),
      text: '文'.repeat(100) + '尾'.repeat(32),
      showTextTitle: true,
    },
    {
      name: 'the exact 80 and 32 code point summary boundary',
      title: '文'.repeat(80) + '...',
      text: '文'.repeat(80) + '尾'.repeat(32),
      showTextTitle: false,
    },
    {
      name: 'a single-character ellipsis at the same summary boundary',
      title: '文'.repeat(80) + '…',
      text: '文'.repeat(80) + '尾'.repeat(32),
      showTextTitle: false,
    },
    {
      name: 'a short ellipsis title',
      title: 'A real title...',
      text: 'A real title' + '尾'.repeat(80),
      showTextTitle: true,
    },
    {
      name: 'a 79 code point prefix',
      title: '文'.repeat(79) + '...',
      text: '文'.repeat(79) + '尾'.repeat(32),
      showTextTitle: true,
    },
    {
      name: 'a long prefix with only 31 additional code points',
      title: '文'.repeat(80) + '...',
      text: '文'.repeat(80) + '尾'.repeat(31),
      showTextTitle: true,
    },
    {
      name: 'a long prefix with no additional body',
      title: '文'.repeat(80) + '...',
      text: '文'.repeat(80),
      showTextTitle: true,
    },
    {
      name: 'a punctuation difference in the long prefix',
      title: '文'.repeat(79) + '，...',
      text: '文'.repeat(79) + '。' + '尾'.repeat(32),
      showTextTitle: true,
    },
    {
      name: 'a case difference in the long prefix',
      title: 'A'.repeat(80) + '...',
      text: 'a'.repeat(80) + '尾'.repeat(32),
      showTextTitle: true,
    },
    {
      name: 'an emoji prefix with 80 UTF-16 units but only 40 code points',
      title: '🙂'.repeat(40) + '...',
      text: '🙂'.repeat(40) + '尾'.repeat(32),
      showTextTitle: true,
    },
    {
      name: 'an emoji remainder with 32 UTF-16 units but only 16 code points',
      title: '文'.repeat(80) + '...',
      text: '文'.repeat(80) + '🙂'.repeat(16),
      showTextTitle: true,
    },
    {
      name: 'a genuine 80 and 32 emoji code point summary',
      title: '🙂'.repeat(80) + '...',
      text: '🙂'.repeat(80) + '🙂'.repeat(32),
      showTextTitle: false,
    },
    {
      name: 'equivalent paragraph whitespace in a long summary prefix',
      title: '  ' + '文 '.repeat(40) + '文...  ',
      text: '文\n'.repeat(40) + '文' + '尾'.repeat(32),
      showTextTitle: false,
    },
  ])('handles $name without modifying input', ({ title, text, showTextTitle }) => {
    const post = Object.freeze({ title, text, textOrigin: 'post' as const })
    expect(postCopyPresentation(post)).toEqual({
      showTextTitle,
      showImageExcerpt: true,
    })
    expect(post).toEqual({ title, text, textOrigin: 'post' })
  })

  it.each(['favorite-note', 'unknown', undefined] as const)(
    'keeps distinct original titles when displayed text origin is %s',
    (textOrigin) => {
      const text = '文'.repeat(80) + '尾'.repeat(32)
      const fallback = Object.freeze({
        title: 'Original body',
        titleOrigin: 'fallback' as const,
        text,
        textOrigin,
      })
      const summary = Object.freeze({
        title: '文'.repeat(80) + '...',
        titleOrigin: 'unknown' as const,
        text,
        textOrigin,
      })
      expect(postCopyPresentation(fallback)).toEqual({
        showTextTitle: true,
        showImageExcerpt: true,
      })
      expect(postCopyPresentation(summary)).toEqual({
        showTextTitle: true,
        showImageExcerpt: true,
      })
      expect(fallback.text).toBe(text)
      expect(summary.text).toBe(text)
    }
  )
})
