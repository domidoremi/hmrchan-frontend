export type PlainTextToolAction = 'emoji' | 'mention' | 'link' | 'quote' | 'code'

function ensureTrailingSpace(text: string): string {
  return text.endsWith(' ') || text.length === 0 ? text : `${text} `
}

export function createPlainTextSnippet(action: PlainTextToolAction): {
  text: string
  selectOffset?: [number, number]
} {
  switch (action) {
    case 'emoji':
      return { text: '✨ ' }
    case 'mention':
      return { text: '@', selectOffset: [1, 1] }
    case 'link':
      return { text: 'https://', selectOffset: [8, 8] }
    case 'quote':
      return { text: '> ', selectOffset: [2, 2] }
    case 'code':
      return { text: '```text\n\n```', selectOffset: [8, 8] }
    default:
      return { text: '' }
  }
}

export function applyPlainTextSnippet(
  source: string,
  action: PlainTextToolAction,
  selectionStart?: number | null,
  selectionEnd?: number | null
): {
  value: string
  caretStart: number
  caretEnd: number
} {
  const start = selectionStart ?? source.length
  const end = selectionEnd ?? start
  const prefix = source.slice(0, start)
  const suffix = source.slice(end)
  const safePrefix = ensureTrailingSpace(prefix)
  const { text, selectOffset } = createPlainTextSnippet(action)
  const nextValue = `${safePrefix}${text}${suffix}`
  const insertStart = safePrefix.length
  const [offsetStart, offsetEnd] = selectOffset ?? [text.length, text.length]

  return {
    value: nextValue,
    caretStart: insertStart + offsetStart,
    caretEnd: insertStart + offsetEnd,
  }
}
