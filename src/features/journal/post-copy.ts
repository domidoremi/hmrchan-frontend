import type { JournalPost } from './models'

type PostCopyInput = Pick<JournalPost, 'title' | 'text' | 'titleOrigin' | 'textOrigin'>

export interface PostCopyPresentation {
  showTextTitle: boolean
  showImageExcerpt: boolean
}

const SUMMARY_PREFIX_MIN = 80
const SUMMARY_REMAINDER_MIN = 32
const TRAILING_ELLIPSIS = /(?:…|\.\.\.)$/u

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

function hasAtLeastCodePoints(value: string, minimum: number, start = 0): boolean {
  let offset = start
  let count = 0
  while (offset < value.length && count < minimum) {
    offset += (value.codePointAt(offset) ?? 0) > 0xffff ? 2 : 1
    count += 1
  }
  return count >= minimum
}

function looksLikeSummary(title: string, text: string): boolean {
  if (!TRAILING_ELLIPSIS.test(title)) return false
  const prefix = title.replace(TRAILING_ELLIPSIS, '').trimEnd()
  return (
    hasAtLeastCodePoints(prefix, SUMMARY_PREFIX_MIN) &&
    text.startsWith(prefix) &&
    hasAtLeastCodePoints(text, SUMMARY_REMAINDER_MIN, prefix.length)
  )
}

export function postCopyPresentation(post: PostCopyInput): PostCopyPresentation {
  const title = normalizeWhitespace(post.title)
  const text = normalizeWhitespace(post.text)
  const hasDistinctText = Boolean(text && text !== title)
  const redundantPostTitle =
    post.textOrigin === 'post' &&
    (post.titleOrigin === 'fallback' ? text.startsWith(title) : looksLikeSummary(title, text))
  return {
    showTextTitle: Boolean(title) && hasDistinctText && !redundantPostTitle,
    showImageExcerpt: hasDistinctText,
  }
}
