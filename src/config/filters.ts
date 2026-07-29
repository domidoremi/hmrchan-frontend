export const FILTERED_AUTHORS = ['twitter_unknown_unknown'] as const

export function isFilteredAuthor(authorName: string | null | undefined): boolean {
  if (!authorName) return false
  return FILTERED_AUTHORS.includes(authorName.toLowerCase() as (typeof FILTERED_AUTHORS)[number])
}
