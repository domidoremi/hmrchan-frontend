/**
 * Responsive composable
 * Provides breakpoint detection and responsive utilities
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * Breakpoint definitions (matching Tailwind CSS defaults)
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
 * Responsive composable
 */
export function useResponsive() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 0)
  const height = ref(typeof window !== 'undefined' ? window.innerHeight : 0)

  /**
   * Current breakpoint
   */
  const breakpoint = computed<Breakpoint>(() => {
    const w = width.value
    if (w < breakpoints.sm) return 'xs'
    if (w < breakpoints.md) return 'sm'
    if (w < breakpoints.lg) return 'md'
    if (w < breakpoints.xl) return 'lg'
    if (w < breakpoints['2xl']) return 'xl'
    return '2xl'
  })

  /**
   * Device type detection
   */
  const isMobile = computed(() => width.value < breakpoints.md)
  const isTablet = computed(() => width.value >= breakpoints.md && width.value < breakpoints.lg)
  const isDesktop = computed(() => width.value >= breakpoints.lg)

  /**
   * Specific breakpoint checks
   */
  const isXs = computed(() => breakpoint.value === 'xs')
  const isSm = computed(() => breakpoint.value === 'sm')
  const isMd = computed(() => breakpoint.value === 'md')
  const isLg = computed(() => breakpoint.value === 'lg')
  const isXl = computed(() => breakpoint.value === 'xl')
  const is2xl = computed(() => breakpoint.value === '2xl')

  /**
   * Greater than or equal to breakpoint
   */
  const isSmAndUp = computed(() => width.value >= breakpoints.sm)
  const isMdAndUp = computed(() => width.value >= breakpoints.md)
  const isLgAndUp = computed(() => width.value >= breakpoints.lg)
  const isXlAndUp = computed(() => width.value >= breakpoints.xl)
  const is2xlAndUp = computed(() => width.value >= breakpoints['2xl'])

  /**
   * Less than breakpoint
   */
  const isSmAndDown = computed(() => width.value < breakpoints.md)
  const isMdAndDown = computed(() => width.value < breakpoints.lg)
  const isLgAndDown = computed(() => width.value < breakpoints.xl)
  const isXlAndDown = computed(() => width.value < breakpoints['2xl'])

  /**
   * Orientation
   */
  const isPortrait = computed(() => height.value > width.value)
  const isLandscape = computed(() => width.value > height.value)

  /**
   * Touch device detection
   */
  const isTouchDevice = computed(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  })

  /**
   * Update dimensions
   */
  function updateDimensions() {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  /**
   * Check if current breakpoint matches
   */
  function matches(bp: Breakpoint): boolean {
    return breakpoint.value === bp
  }

  /**
   * Check if width is greater than or equal to breakpoint
   */
  function greaterThan(bp: Breakpoint): boolean {
    return width.value >= breakpoints[bp]
  }

  /**
   * Check if width is less than breakpoint
   */
  function lessThan(bp: Breakpoint): boolean {
    return width.value < breakpoints[bp]
  }

  /**
   * Check if width is between two breakpoints
   */
  function between(min: Breakpoint, max: Breakpoint): boolean {
    return width.value >= breakpoints[min] && width.value < breakpoints[max]
  }

  // Setup resize listener
  onMounted(() => {
    window.addEventListener('resize', updateDimensions)
    updateDimensions()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateDimensions)
  })

  return {
    // Dimensions
    width,
    height,

    // Breakpoint
    breakpoint,

    // Device types
    isMobile,
    isTablet,
    isDesktop,

    // Specific breakpoints
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

    // Orientation
    isPortrait,
    isLandscape,

    // Touch
    isTouchDevice,

    // Methods
    matches,
    greaterThan,
    lessThan,
    between,
  }
}

/**
 * Responsive value composable
 * Returns different values based on current breakpoint
 */
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T,
): {
  value: import('vue').ComputedRef<T>
} {
  const { breakpoint } = useResponsive()

  const value = computed(() => {
    const currentBreakpoint = breakpoint.value

    // Try exact match first
    if (currentBreakpoint && values[currentBreakpoint] !== undefined) {
      return values[currentBreakpoint] as T
    }

    // Fall back to closest smaller breakpoint
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
    const currentIndex = currentBreakpoint ? breakpointOrder.indexOf(currentBreakpoint) : -1

    if (currentIndex !== -1) {
      for (let i = currentIndex; i < breakpointOrder.length; i++) {
        const bp = breakpointOrder[i]
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
