/**
 * 内容过滤配置
 *
 * 集中管理需要过滤的内容规则，便于维护和扩展
 */

/**
 * 需要过滤的作者名称（无效数据）
 * 这些作者的帖子将不会显示在列表中
 */
export const FILTERED_AUTHORS = ['twitter_unknown_unknown'] as const

/**
 * 检查作者是否应该被过滤
 */
export function isFilteredAuthor(authorName: string | null | undefined): boolean {
  if (!authorName) return false
  return FILTERED_AUTHORS.includes(authorName.toLowerCase() as typeof FILTERED_AUTHORS[number])
}
