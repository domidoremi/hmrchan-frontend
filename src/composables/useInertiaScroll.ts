/**
 * useInertiaScroll - 全局惯性滚动
 *
 * 设计目标：
 * - 原生滚动优先（滚轮/滚动条/方向键都立即响应）
 * - 在用户停止滚动后追加“惯性 + 粘性”收尾
 * - 不拦截 wheel，避免小滚动被忽略
 */

import { watch, onBeforeUnmount, type Ref } from 'vue'

// ==================== 参数 ====================

/** 惯性摩擦系数（每 16.67ms 一次） */
const FRICTION_FULL = 0.92
const FRICTION_REDUCED = 0.88

/** 触发惯性的最小速度（px/ms） */
const MIN_VELOCITY = 0.01

/** 停止阈值（px/ms） */
const STOP_VELOCITY = 0.0025

/** 判断“滚动结束”的时间间隔（ms） */
const END_DELAY = 90

/** 粘性：低速时额外衰减系数 */
const STICKY_DAMP = 0.7

// ==================== 工具 ====================

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

// ==================== Composable ====================

export interface UseInertiaScrollOptions {
  animationIntensity: Ref<string>
}

export function useInertiaScroll(options: UseInertiaScrollOptions) {
  const { animationIntensity } = options

  let enabled = true
  let friction = FRICTION_FULL
  let velocity = 0 // px/ms
  let lastY = 0
  let lastTime = 0
  let endTimer: ReturnType<typeof setTimeout> | null = null
  let rafId = 0
  let animating = false
  let isProgrammatic = false

  const reducedMotionQuery =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

  function shouldEnable(): boolean {
    if (isTouchDevice()) return false
    if (reducedMotionQuery?.matches) return false
    if (animationIntensity.value === 'none') return false
    return true
  }

  function updateFriction() {
    friction = animationIntensity.value === 'reduced' ? FRICTION_REDUCED : FRICTION_FULL
  }

  function stopInertia() {
    animating = false
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function startInertia() {
    if (animating) return
    if (!enabled) return
    if (Math.abs(velocity) < MIN_VELOCITY) return

    animating = true
    let prevTime = performance.now()

    const tick = (now: number) => {
      if (!animating) return
      const dt = Math.max(16, now - prevTime)
      prevTime = now

      // 指数摩擦衰减
      const decay = Math.pow(friction, dt / 16.67)
      velocity *= decay

      // 低速阶段增加“粘性”
      if (Math.abs(velocity) < MIN_VELOCITY * 1.5) {
        velocity *= STICKY_DAMP
      }

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const nextY = clamp(window.scrollY + velocity * dt, 0, maxScroll)
      isProgrammatic = true
      window.scrollTo(0, nextY)
      requestAnimationFrame(() => {
        isProgrammatic = false
      })

      if (Math.abs(velocity) < STOP_VELOCITY || nextY === 0 || nextY === maxScroll) {
        stopInertia()
        return
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  }

  function scheduleEnd() {
    if (endTimer) clearTimeout(endTimer)
    endTimer = setTimeout(() => {
      if (!enabled) return
      if (Math.abs(velocity) >= MIN_VELOCITY) startInertia()
    }, END_DELAY)
  }

  function onScroll() {
    if (!enabled) return
    if (isProgrammatic || animating) return

    const now = performance.now()
    const y = window.scrollY
    const dt = lastTime ? Math.max(16, now - lastTime) : 16
    const dy = y - lastY

    const instant = dy / dt
    // 速度平滑
    velocity = velocity * 0.6 + instant * 0.4

    lastY = y
    lastTime = now

    scheduleEnd()
  }

  function onUserInput() {
    if (animating) stopInertia()
    scheduleEnd()
  }

  function onKeyDown(e: KeyboardEvent) {
    // 方向键/翻页键触发惯性
    if (
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'PageUp' ||
      e.key === 'PageDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === ' '
    ) {
      onUserInput()
    }
  }

  function onReducedMotionChange() {
    enabled = shouldEnable()
    if (!enabled) stopInertia()
  }

  function mount() {
    enabled = shouldEnable()
    updateFriction()
    lastY = window.scrollY
    lastTime = performance.now()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onUserInput, { passive: true })
    window.addEventListener('pointerdown', onUserInput, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    reducedMotionQuery?.addEventListener('change', onReducedMotionChange)
  }

  function dispose() {
    stopInertia()
    if (endTimer) clearTimeout(endTimer)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('wheel', onUserInput)
    window.removeEventListener('pointerdown', onUserInput)
    window.removeEventListener('keydown', onKeyDown)
    reducedMotionQuery?.removeEventListener('change', onReducedMotionChange)
  }

  watch(animationIntensity, () => {
    enabled = shouldEnable()
    updateFriction()
    if (!enabled) stopInertia()
  })

  mount()
  onBeforeUnmount(dispose)
}
