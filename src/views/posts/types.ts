/**
 * Posts View Types
 * 帖子页面相关类型定义
 */

import type { Component } from 'vue'

/**
 * 平台选项
 */
export interface PlatformOption {
  value: string
  label: string
  icon: Component
}

/**
 * 排序选项
 */
export type SortOption = 'latest' | 'popular' | 'oldest'

/**
 * 视图模式
 */
export type ViewMode = 'grid' | 'list'

/**
 * 筛选器状态
 */
export interface FiltersState {
  searchQuery: string
  platform: string
  sortBy: SortOption
  viewMode: ViewMode
}

/**
 * 分页状态
 */
export interface PaginationState {
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

/**
 * 预览状态
 */
export interface PreviewState {
  isOpen: boolean
  postId: string | null
}

/**
 * 抽屉拖拽状态
 */
export interface DrawerDragState {
  isDragging: boolean
  startY: number
  currentY: number
  translateY: number
}

/**
 * 抽屉配置
 */
export interface DrawerConfig {
  closeThreshold: number
  handleHeight: number
}
