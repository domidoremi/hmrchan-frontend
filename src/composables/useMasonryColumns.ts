import { ref } from 'vue'
import type { PostListItem } from '@/api/postService'

interface MasonryOptions {
  initialColumnCount?: number

  metaHeight?: number

  cardPadding?: number
}

export function useMasonryColumns(options: MasonryOptions = {}) {
  const { initialColumnCount = 3, metaHeight = 80, cardPadding = 32 } = options

  const columnCount = ref(initialColumnCount)

  const columns = ref<PostListItem[][]>([])

  const columnHeights = ref<number[]>([])

  function initColumns() {
    columns.value = Array.from({ length: columnCount.value }, () => [])
    columnHeights.value = Array(columnCount.value).fill(0)
  }

  function estimateCardHeight(post: PostListItem, colWidth: number): number {
    let imgHeight = 0
    if (post.thumbnail_width && post.thumbnail_height && post.thumbnail_width > 0) {
      imgHeight = Math.round((post.thumbnail_height / post.thumbnail_width) * colWidth)
    } else {
      const platform = post.platform?.toLowerCase()
      const aspectRatios: Record<string, number> = {
        tiktok: 9 / 16,
        youtube: 16 / 9,
        twitter: 16 / 9,
        bilibili: 16 / 9,
        pixiv: 3 / 4,
        weibo: 4 / 3,
        instagram: 4 / 5,
      }
      const ratio = aspectRatios[platform] || 16 / 9
      imgHeight = Math.round(colWidth / ratio)
    }

    const titleLength = post.title?.length || 0

    const charsPerLine = Math.floor(colWidth / 20)
    const titleLines = Math.max(1, Math.ceil(titleLength / charsPerLine))
    const titleHeight = Math.min(titleLines * 24, 72)

    return imgHeight + titleHeight + metaHeight + cardPadding + 16 // 16px gap
  }

  function getShortestColumnIndex(): number {
    if (columnHeights.value.length === 0) return 0

    const heights = columnHeights.value.slice(0, columnCount.value)
    let minHeight = Infinity
    let minIndex = 0

    for (let i = 0; i < columnCount.value; i++) {
      const height = heights[i] ?? 0
      if (height < minHeight) {
        minHeight = height
        minIndex = i
      }
    }

    return minIndex
  }

  function distributePost(post: PostListItem, colWidth: number) {
    const targetIndex = getShortestColumnIndex()

    const targetColumn = columns.value[targetIndex]
    if (targetColumn) {
      targetColumn.push(post)

      const cardHeight = estimateCardHeight(post, colWidth)
      const currentHeight = columnHeights.value[targetIndex] ?? 0
      columnHeights.value[targetIndex] = currentHeight + cardHeight
    }
  }

  function distributePosts(
    posts: PostListItem[],
    colWidth: number,
    append = false,
    realHeights?: number[]
  ) {
    if (!append) {
      initColumns()
    } else if (realHeights && realHeights.length === columnCount.value) {
      let isValid = true
      for (let i = 0; i < columnCount.value; i++) {
        if ((columns.value[i]?.length ?? 0) > 0 && realHeights[i] === 0) {
          isValid = false
          break
        }
      }

      if (isValid) {
        columnHeights.value = [...realHeights]
      }
    }

    posts.forEach((post) => {
      distributePost(post, colWidth)
    })
  }

  function distributePostsRoundRobin(posts: PostListItem[], startIndex = 0) {
    posts.forEach((post, idx) => {
      const targetIndex = (startIndex + idx) % columnCount.value
      const targetColumn = columns.value[targetIndex]
      if (targetColumn) {
        targetColumn.push(post)
      }
    })
  }

  function redistribute(allPosts: PostListItem[], colWidth: number) {
    distributePosts(allPosts, colWidth, false)
  }

  function getColumnWidth(containerWidth: number): number {
    const gap = 16
    const totalGap = gap * (columnCount.value - 1)
    return (containerWidth - totalGap) / columnCount.value
  }

  initColumns()

  return {
    columns,
    columnCount,
    columnHeights,
    distributePosts,
    distributePost,
    distributePostsRoundRobin,
    redistribute,
    getColumnWidth,
    initColumns,
  }
}
