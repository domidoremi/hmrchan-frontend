import { ref } from 'vue'
import type { PostListItem } from '@/api/postService'

/**
 * 瀑布流多列布局 Composable
 * 核心原理：JS 智能分发到多个物理隔离的列容器，避免 CSS column-count 的重排问题
 */

interface MasonryOptions {
  /** 初始列数 */
  initialColumnCount?: number
  /** 卡片元信息高度（标题、作者等） */
  metaHeight?: number
  /** 卡片 padding */
  cardPadding?: number
}

export function useMasonryColumns(options: MasonryOptions = {}) {
  const { initialColumnCount = 3, metaHeight = 80, cardPadding = 32 } = options

  // 当前列数（响应式）
  const columnCount = ref(initialColumnCount)

  // 各列的数据
  const columns = ref<PostListItem[][]>([])

  // 虚拟高度表（内存中维护，避免读取 DOM offsetHeight）
  const columnHeights = ref<number[]>([])

  /**
   * 初始化列容器
   */
  function initColumns() {
    columns.value = Array.from({ length: columnCount.value }, () => [])
    columnHeights.value = Array(columnCount.value).fill(0)
  }

  /**
   * 估算单个卡片的渲染高度
   * @param post - 帖子数据
   * @param colWidth - 当前列宽
   */
  function estimateCardHeight(post: PostListItem, colWidth: number): number {
    // 1. 图片高度（精确计算，使用后端数据）
    let imgHeight = 0
    if (post.thumbnail_width && post.thumbnail_height && post.thumbnail_width > 0) {
      // 精确计算缩放后的图片高度
      imgHeight = Math.round((post.thumbnail_height / post.thumbnail_width) * colWidth)
    } else {
      // 降级：使用平台默认宽高比
      const platform = post.platform?.toLowerCase()
      const aspectRatios: Record<string, number> = {
        tiktok: 9 / 16, // 竖屏视频
        youtube: 16 / 9,
        twitter: 16 / 9,
        bilibili: 16 / 9,
        pixiv: 3 / 4, // 竖屏图片
        weibo: 4 / 3,
        instagram: 4 / 5, // Instagram 常见比例
      }
      const ratio = aspectRatios[platform] || 16 / 9
      imgHeight = Math.round(colWidth / ratio)
    }

    // 2. 标题高度（更精确的估算）
    const titleLength = post.title?.length || 0
    // 假设列宽约 300px，字体 14px，每行约 15 个汉字或 30 个英文字符
    const charsPerLine = Math.floor(colWidth / 20)
    const titleLines = Math.max(1, Math.ceil(titleLength / charsPerLine))
    const titleHeight = Math.min(titleLines * 24, 72) // 最多 3 行

    // 3. 总高度 = 图片 + 标题 + 元信息 + padding + gap
    return imgHeight + titleHeight + metaHeight + cardPadding + 16 // 16px gap
  }

  /**
   * 获取当前最矮的列索引（贪心算法 + 确定性平衡）
   * 当多列高度接近时，选择索引最小的列，保证结果可预测
   */
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

  /**
   * 分发单个帖子到最矮的列
   * @param post - 帖子数据
   * @param colWidth - 列宽
   */
  function distributePost(post: PostListItem, colWidth: number) {
    // 找到最矮列
    const targetIndex = getShortestColumnIndex()

    // 添加到该列
    const targetColumn = columns.value[targetIndex]
    if (targetColumn) {
      targetColumn.push(post)

      // 更新虚拟高度
      const cardHeight = estimateCardHeight(post, colWidth)
      const currentHeight = columnHeights.value[targetIndex] ?? 0
      columnHeights.value[targetIndex] = currentHeight + cardHeight
    }
  }

  /**
   * 批量分发帖子列表
   * @param posts - 帖子列表
   * @param colWidth - 列宽
   * @param append - 是否追加模式（false 则清空重建）
   * @param realHeights - 真实 DOM 高度（追加模式时必须提供，用于校准累积误差）
   */
  function distributePosts(
    posts: PostListItem[],
    colWidth: number,
    append = false,
    realHeights?: number[]
  ) {
    if (!append) {
      initColumns()
    } else if (realHeights && realHeights.length === columnCount.value) {
      // 🔑 关键修复：追加模式下，先用真实 DOM 高度校准虚拟高度
      // 消除之前批次的累积误差，避免所有新帖子堆积到单列

      // Safety Check: 验证 DOM 高度是否合理
      // 如果某列已有数据，但 DOM 报告高度为 0（可能是 ref 未挂载或隐藏），则忽略本次校准
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

    // 🔑 修复：逐个分发帖子，每次都找当前最矮的列
    // 确保帖子按顺序均匀分布到各列，而不是全部堆积到同一列
    posts.forEach((post) => {
      distributePost(post, colWidth)
    })
  }

  /**
   * 使用轮询策略分发帖子（备用方案）
   * 当高度估算不准确时，使用简单的轮询来保证均匀分布
   */
  function distributePostsRoundRobin(posts: PostListItem[], startIndex = 0) {
    posts.forEach((post, idx) => {
      const targetIndex = (startIndex + idx) % columnCount.value
      const targetColumn = columns.value[targetIndex]
      if (targetColumn) {
        targetColumn.push(post)
      }
    })
  }

  /**
   * 重新分配所有内容（用于响应式变化）
   * @param allPosts - 所有帖子数据
   * @param colWidth - 新的列宽
   */
  function redistribute(allPosts: PostListItem[], colWidth: number) {
    distributePosts(allPosts, colWidth, false)
  }

  /**
   * 获取当前列宽（基于容器宽度）
   * @param containerWidth - 容器宽度
   */
  function getColumnWidth(containerWidth: number): number {
    // 容器宽度 - 列间距
    const gap = 16 // 列间距
    const totalGap = gap * (columnCount.value - 1)
    return (containerWidth - totalGap) / columnCount.value
  }

  // 初始化
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
