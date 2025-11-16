import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 响应式布局 composable
 * 提供动态计算的响应式布局值
 */
export function useResponsiveLayout() {
  const windowWidth = ref(window.innerWidth)
  const windowHeight = ref(window.innerHeight)

  // 动态计算导航栏高度
  const navbarHeight = computed(() => {
    if (windowWidth.value < 768) return 66 // 移动端顶部栏
    if (windowWidth.value < 1024) return 72 // 平板端
    return 78 // 桌面端
  })

  // 动态计算底部导航栏高度（仅移动端）
  const bottomNavHeight = computed(() => {
    if (windowWidth.value < 768) return 64
    return 0
  })

  // 动态计算安全区域
  const safeAreaBottom = computed(() => {
    if (windowWidth.value < 768) {
      // 移动端：底部导航栏 + 安全区域
      return bottomNavHeight.value + 16 // 16px 额外间距
    }
    return 16 // 桌面端最小间距
  })

  // 动态计算内容顶部偏移（避免被导航栏遮挡）
  const contentTopOffset = computed(() => {
    if (windowWidth.value < 768) return navbarHeight.value + 8
    if (windowWidth.value < 1024) return navbarHeight.value + 16
    return navbarHeight.value + 24
  })

  // 动态计算detail-topbar的sticky定位
  const stickyTopOffset = computed(() => {
    if (windowWidth.value < 768) return 8 // 移动端：底部导航，顶部只需小间距
    if (windowWidth.value < 1024) return navbarHeight.value + 4 // 平板端
    return navbarHeight.value + 4 // 桌面端
  })

  // z-index层级管理
  const zIndex = {
    base: 1,
    dropdown: 100,
    sticky: 500,
    navbar: 1000,
    drawer: 1500,
    modal: 2000,
    toast: 3000,
    tooltip: 4000,
  }

  // 响应式断点
  const isMobile = computed(() => windowWidth.value < 768)
  const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024)
  const isDesktop = computed(() => windowWidth.value >= 1024)
  const isLargeDesktop = computed(() => windowWidth.value >= 1280)

  // 动态计算容器宽度
  const containerWidth = computed(() => {
    if (windowWidth.value < 640) return '100%'
    if (windowWidth.value < 768) return 'min(640px, 100%)'
    if (windowWidth.value < 1024) return 'min(768px, 100%)'
    if (windowWidth.value < 1280) return 'min(1024px, 100%)'
    return 'min(1200px, 100%)'
  })

  // 动态计算间距
  const spacing = computed(() => {
    const width = windowWidth.value
    return {
      xs: Math.max(4, Math.min(8, width * 0.008)),
      sm: Math.max(8, Math.min(12, width * 0.012)),
      md: Math.max(12, Math.min(16, width * 0.016)),
      lg: Math.max(16, Math.min(24, width * 0.024)),
      xl: Math.max(24, Math.min(32, width * 0.032)),
    }
  })

  // 更新窗口尺寸
  const updateSize = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }

  // 监听窗口resize
  onMounted(() => {
    window.addEventListener('resize', updateSize)
    updateSize()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateSize)
  })

  return {
    windowWidth,
    windowHeight,
    navbarHeight,
    bottomNavHeight,
    safeAreaBottom,
    contentTopOffset,
    stickyTopOffset,
    zIndex,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    containerWidth,
    spacing,
  }
}
