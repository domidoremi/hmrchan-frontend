/**
 * 统一的响应式 Composable
 * 合并了原 useResponsive 和 useResponsiveLayout 的所有功能
 *
 * 提供：
 * - 断点检测和设备类型判断
 * - 布局相关的动态计算（导航栏高度、安全区域等）
 * - 容器宽度和间距的响应式计算
 * - Z-index 层级管理
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * Breakpoint 定义 (匹配 Tailwind CSS 默认值)
 */
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof breakpoints

/**
 * 统一的响应式 Composable
 * 提供断点检测和布局计算的完整功能
 */
export function useResponsive() {
  // ==================== 基础响应式 ====================
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0)
  const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 0)

  // 当前断点
  const breakpoint = computed<Breakpoint>(() => {
    const w = windowWidth.value
    if (w < breakpoints.sm) return 'xs'
    if (w < breakpoints.md) return 'sm'
    if (w < breakpoints.lg) return 'md'
    if (w < breakpoints.xl) return 'lg'
    if (w < breakpoints['2xl']) return 'xl'
    return '2xl'
  })

  // ==================== 设备类型检测 ====================
  const isMobile = computed(() => windowWidth.value < breakpoints.md)
  const isTablet = computed(
    () => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg,
  )
  const isDesktop = computed(() => windowWidth.value >= breakpoints.lg)
  const isLargeDesktop = computed(() => windowWidth.value >= breakpoints.xl)

  // 具体断点检测
  const isXs = computed(() => breakpoint.value === 'xs')
  const isSm = computed(() => breakpoint.value === 'sm')
  const isMd = computed(() => breakpoint.value === 'md')
  const isLg = computed(() => breakpoint.value === 'lg')
  const isXl = computed(() => breakpoint.value === 'xl')
  const is2xl = computed(() => breakpoint.value === '2xl')

  // Greater than or equal to
  const isSmAndUp = computed(() => windowWidth.value >= breakpoints.sm)
  const isMdAndUp = computed(() => windowWidth.value >= breakpoints.md)
  const isLgAndUp = computed(() => windowWidth.value >= breakpoints.lg)
  const isXlAndUp = computed(() => windowWidth.value >= breakpoints.xl)
  const is2xlAndUp = computed(() => windowWidth.value >= breakpoints['2xl'])

  // Less than
  const isSmAndDown = computed(() => windowWidth.value < breakpoints.md)
  const isMdAndDown = computed(() => windowWidth.value < breakpoints.lg)
  const isLgAndDown = computed(() => windowWidth.value < breakpoints.xl)
  const isXlAndDown = computed(() => windowWidth.value < breakpoints['2xl'])

  // 屏幕方向
  const isPortrait = computed(() => windowHeight.value > windowWidth.value)
  const isLandscape = computed(() => windowWidth.value > windowHeight.value)

  // 触摸设备检测
  const isTouchDevice = computed(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  })

  // ==================== 布局计算（来自 useResponsiveLayout）====================

  /**
   * 动态导航栏高度
   * - 移动端: 66px（顶部栏）
   * - 平板端: 72px
   * - 桌面端: 78px
   */
  const navbarHeight = computed(() => {
    if (windowWidth.value < breakpoints.md) return 66
    if (windowWidth.value < breakpoints.lg) return 72
    return 78
  })

  /**
   * 底部导航栏高度（仅移动端有）
   */
  const bottomNavHeight = computed(() => {
    return isMobile.value ? 64 : 0
  })

  /**
   * 安全区域底部偏移
   * 用于避免被底部导航栏遮挡
   */
  const safeAreaBottom = computed(() => {
    if (isMobile.value) {
      return bottomNavHeight.value + 16 // 底部导航 + 额外间距
    }
    return 16 // 桌面端最小间距
  })

  /**
   * 内容顶部偏移
   * 用于避免被顶部导航栏遮挡
   */
  const contentTopOffset = computed(() => {
    if (isMobile.value) return navbarHeight.value + 8
    if (isTablet.value) return navbarHeight.value + 16
    return navbarHeight.value + 24
  })

  /**
   * Sticky 定位的 top 值
   * 用于 position: sticky 元素
   */
  const stickyTopOffset = computed(() => {
    if (isMobile.value) return 8 // 移动端：底部导航，顶部只需小间距
    if (isTablet.value) return navbarHeight.value + 4
    return navbarHeight.value + 4
  })

  /**
   * Z-index 层级管理
   * 统一管理整个应用的 z-index 值
   */
  const zIndex = {
    base: 1,
    dropdown: 100,
    sticky: 500,
    navbar: 1000,
    drawer: 1500,
    modal: 2000,
    toast: 3000,
    tooltip: 4000,
  } as const

  /**
   * 动态容器宽度
   * 根据视口宽度返回合适的最大容器宽度
   */
  const containerWidth = computed(() => {
    const w = windowWidth.value
    if (w < 640) return '100%'
    if (w < breakpoints.md) return 'min(640px, 100%)'
    if (w < breakpoints.lg) return 'min(768px, 100%)'
    if (w < breakpoints.xl) return 'min(1024px, 100%)'
    return 'min(1200px, 100%)'
  })

  /**
   * 动态间距计算
   * 根据视口宽度动态调整间距值
   */
  const spacing = computed(() => {
    const w = windowWidth.value
    return {
      xs: Math.max(4, Math.min(8, w * 0.008)),
      sm: Math.max(8, Math.min(12, w * 0.012)),
      md: Math.max(12, Math.min(16, w * 0.016)),
      lg: Math.max(16, Math.min(24, w * 0.024)),
      xl: Math.max(24, Math.min(32, w * 0.032)),
    }
  })

  // ==================== 辅助方法 ====================

  /**
   * 检查当前断点是否匹配
   */
  function matches(bp: Breakpoint): boolean {
    return breakpoint.value === bp
  }

  /**
   * 检查宽度是否大于等于指定断点
   */
  function greaterThan(bp: Breakpoint): boolean {
    return windowWidth.value >= breakpoints[bp]
  }

  /**
   * 检查宽度是否小于指定断点
   */
  function lessThan(bp: Breakpoint): boolean {
    return windowWidth.value < breakpoints[bp]
  }

  /**
   * 检查宽度是否在两个断点之间
   */
  function between(min: Breakpoint, max: Breakpoint): boolean {
    return windowWidth.value >= breakpoints[min] && windowWidth.value < breakpoints[max]
  }

  /**
   * 更新窗口尺寸
   */
  function updateDimensions() {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }

  // ==================== 生命周期 ====================
  onMounted(() => {
    window.addEventListener('resize', updateDimensions)
    updateDimensions()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateDimensions)
  })

  // ==================== 返回 API ====================
  return {
    // 基础响应式
    windowWidth,
    windowHeight,
    breakpoint,
    breakpoints,

    // 设备类型
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,

    // 具体断点
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,

    // Greater than or equal
    isSmAndUp,
    isMdAndUp,
    isLgAndUp,
    isXlAndUp,
    is2xlAndUp,

    // Less than
    isSmAndDown,
    isMdAndDown,
    isLgAndDown,
    isXlAndDown,

    // 屏幕方向
    isPortrait,
    isLandscape,

    // 触摸设备
    isTouchDevice,

    // 布局计算（来自 useResponsiveLayout）
    navbarHeight,
    bottomNavHeight,
    safeAreaBottom,
    contentTopOffset,
    stickyTopOffset,
    zIndex,
    containerWidth,
    spacing,

    // 辅助方法
    matches,
    greaterThan,
    lessThan,
    between,
  }
}

/**
 * 响应式值 Composable
 * 根据当前断点返回不同的值
 *
 * @example
 * ```ts
 * const { value } = useResponsiveValue({
 *   xs: 1,
 *   sm: 2,
 *   md: 3,
 *   lg: 4,
 * }, 1)
 * ```
 */
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T,
): {
  value: import('vue').ComputedRef<T>
} {
  const { breakpoint } = useResponsive()

  const value = computed(() => {
    const currentBreakpoint = breakpoint.value as Breakpoint

    // 尝试精确匹配
    if (values[currentBreakpoint] !== undefined) {
      return values[currentBreakpoint] as T
    }

    // 回退到最接近的较小断点
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint)

    if (currentIndex !== -1) {
      for (let i = currentIndex; i < breakpointOrder.length; i++) {
        const bp = breakpointOrder[i] as Breakpoint
        const bpValue = values[bp]
        if (bpValue !== undefined) {
          return bpValue
        }
      }
    }

    return defaultValue
  })

  return { value }
}
