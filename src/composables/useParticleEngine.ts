/**
 * useParticleEngine - 高性能粒子引擎
 *
 * 特性：
 * - 对象池模式：复用粒子对象，避免 GC 压力
 * - requestAnimationFrame 驱动，GPU 友好
 * - 页面不可见时自动暂停渲染
 * - 响应 animationIntensity 和 prefers-reduced-motion
 * - devicePixelRatio 自适应（上限 2）
 * - ResizeObserver + debounce 处理尺寸变化
 */

import { watch, type Ref } from 'vue'
import type { ParticleEffectConfig, ParticleEffectType } from '@/stores/settings'

// ==================== 粒子数据结构 ====================

interface Particle {
  x: number
  y: number
  /** 水平速度（px/frame） */
  vx: number
  /** 垂直速度（px/frame） */
  vy: number
  /** 粒子尺寸 */
  size: number
  /** 透明度 */
  alpha: number
  /** 额外状态（闪烁相位、摇摆偏移等） */
  phase: number
  /** 是否激活 */
  active: boolean
}

// ==================== 粒子工厂（每种效果的初始化逻辑） ====================

type ParticleInitializer = (p: Particle, w: number, h: number, config: ParticleEffectConfig) => void

type ParticleUpdater = (
  p: Particle,
  w: number,
  h: number,
  dt: number,
  config: ParticleEffectConfig
) => void

type ParticleRenderer = (
  ctx: CanvasRenderingContext2D,
  p: Particle,
  config: ParticleEffectConfig
) => void

// ---------- Rain ----------

const initRain: ParticleInitializer = (p, w, h, config) => {
  p.x = Math.random() * w * 1.2 - w * 0.1
  p.y = Math.random() * -h
  p.vx = -0.5 + Math.random() * -1 // 轻微斜向
  p.vy = 4 + Math.random() * 6
  p.size = 1 + Math.random() * 1.5
  p.alpha = (0.15 + Math.random() * 0.35) * config.opacity
  p.phase = 0
  p.active = true
}

const updateRain: ParticleUpdater = (p, w, h, dt, config) => {
  const speed = config.speed * dt
  p.x += p.vx * speed
  p.y += p.vy * speed

  // 超出屏幕底部时重置到顶部
  if (p.y > h || p.x < -20) {
    p.x = Math.random() * w * 1.2 - w * 0.1
    p.y = Math.random() * -60
    p.alpha = (0.15 + Math.random() * 0.35) * config.opacity
  }
}

const renderRain: ParticleRenderer = (ctx, p, config) => {
  const color = config.color || 'rgba(174, 194, 224'
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  ctx.lineTo(p.x + p.vx * 2, p.y + p.size * 6)
  ctx.strokeStyle = color.startsWith('rgba(') ? `${color}, ${p.alpha})` : withAlpha(color, p.alpha)
  ctx.lineWidth = p.size * 0.6
  ctx.lineCap = 'round'
  ctx.stroke()
}

// ---------- Snow ----------

const initSnow: ParticleInitializer = (p, w, h, config) => {
  p.x = Math.random() * w
  p.y = Math.random() * -h
  p.vx = 0
  p.vy = 0.5 + Math.random() * 1.5
  p.size = 1.5 + Math.random() * 3
  p.alpha = (0.3 + Math.random() * 0.5) * config.opacity
  p.phase = Math.random() * Math.PI * 2
  p.active = true
}

const updateSnow: ParticleUpdater = (p, w, h, dt, config) => {
  const speed = config.speed * dt
  p.phase += 0.01 * speed
  p.x += Math.sin(p.phase) * 0.5 * speed
  p.y += p.vy * speed

  if (p.y > h + 10) {
    p.x = Math.random() * w
    p.y = -10
    p.alpha = (0.3 + Math.random() * 0.5) * config.opacity
  }
}

const renderSnow: ParticleRenderer = (ctx, p, config) => {
  const color = config.color || '#ffffff'
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(color, p.alpha)
  ctx.fill()
}

// ---------- Stars ----------

const initStars: ParticleInitializer = (p, w, h, config) => {
  p.x = Math.random() * w
  p.y = Math.random() * h
  p.vx = 0
  p.vy = 0
  p.size = 0.5 + Math.random() * 2
  p.alpha = (0.2 + Math.random() * 0.6) * config.opacity
  p.phase = Math.random() * Math.PI * 2
  p.active = true
}

const updateStars: ParticleUpdater = (p, _w, _h, dt, config) => {
  p.phase += 0.005 * config.speed * dt
  // 闪烁效果：alpha 在 baseAlpha 的 ±40% 范围振荡
  const baseAlpha = (0.3 + p.size * 0.15) * config.opacity
  p.alpha = baseAlpha * (0.6 + 0.4 * Math.sin(p.phase))
}

const renderStars: ParticleRenderer = (ctx, p, config) => {
  const color = config.color || '#ffffff'
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(color, p.alpha)
  ctx.fill()

  // 大粒子添加十字光芒
  if (p.size > 1.5) {
    const glow = p.size * 2
    ctx.beginPath()
    ctx.moveTo(p.x - glow, p.y)
    ctx.lineTo(p.x + glow, p.y)
    ctx.moveTo(p.x, p.y - glow)
    ctx.lineTo(p.x, p.y + glow)
    ctx.strokeStyle = withAlpha(color, p.alpha * 0.3)
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
}

// ==================== 效果注册表 ====================

interface EffectDescriptor {
  /** 基准粒子数量（密度 1 时） */
  baseCount: number
  init: ParticleInitializer
  update: ParticleUpdater
  render: ParticleRenderer
}

const EFFECTS: Record<Exclude<ParticleEffectType, 'none'>, EffectDescriptor> = {
  rain: { baseCount: 200, init: initRain, update: updateRain, render: renderRain },
  snow: { baseCount: 120, init: initSnow, update: updateSnow, render: renderSnow },
  stars: { baseCount: 100, init: initStars, update: updateStars, render: renderStars },
}

// ==================== 工具函数 ====================

/** 给任意 CSS 颜色附加 alpha（简易实现） */
function withAlpha(color: string, alpha: number): string {
  // 如果已经是 rgba 格式
  if (color.startsWith('rgba(')) {
    return color.replace(/[\d.]+\)$/, `${alpha})`)
  }
  // hex 颜色转 rgba
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(255,255,255,${alpha})`
    return `rgba(${r},${g},${b},${alpha})`
  }
  return `rgba(255,255,255,${alpha})`
}

// ==================== 对象池 ====================

function createPool(capacity: number): Particle[] {
  const pool: Particle[] = []
  for (let i = 0; i < capacity; i++) {
    pool.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      alpha: 0,
      phase: 0,
      active: false,
    })
  }
  return pool
}

// ==================== 主引擎 ====================

export interface UseParticleEngineOptions {
  canvas: Ref<HTMLCanvasElement | null>
  config: Ref<ParticleEffectConfig>
  /** 动效强度（来自 settings store） */
  animationIntensity: Ref<string>
}

export function useParticleEngine(options: UseParticleEngineOptions) {
  const { canvas, config, animationIntensity } = options

  let ctx: CanvasRenderingContext2D | null = null
  let pool: Particle[] = []
  let rafId = 0
  let lastTime = 0
  let running = false
  let canvasW = 0
  let canvasH = 0
  let dpr = 1
  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  let currentEffect: EffectDescriptor | null = null

  // 减少动态效果的媒体查询
  const reducedMotionQuery =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

  /** 是否应当运行 */
  function shouldRun(): boolean {
    const type = config.value.type
    if (type === 'none') return false
    if (animationIntensity.value === 'none') return false
    if (reducedMotionQuery?.matches) return false
    return true
  }

  /** 获取密度乘数（联动 animationIntensity） */
  function getDensityMultiplier(): number {
    const intensity = animationIntensity.value
    if (intensity === 'reduced') return 0.4
    if (intensity === 'full') return 1.2
    return 1 // normal
  }

  /** 计算实际粒子数量 */
  function getParticleCount(): number {
    const type = config.value.type
    if (type === 'none') return 0
    const base = EFFECTS[type].baseCount
    return Math.round(base * config.value.density * getDensityMultiplier())
  }

  /** 调整 canvas 尺寸 */
  function resize() {
    const el = canvas.value
    if (!el) return

    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvasW = window.innerWidth
    canvasH = window.innerHeight

    el.width = canvasW * dpr
    el.height = canvasH * dpr
    el.style.width = '100vw'
    el.style.height = '100dvh'

    ctx = el.getContext('2d', { alpha: true })
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }

  /** 初始化/重新初始化粒子池 */
  function initParticles() {
    const type = config.value.type
    if (type === 'none') return

    currentEffect = EFFECTS[type]
    const count = getParticleCount()

    // 扩容或缩容池
    if (pool.length < count) {
      pool = [...pool, ...createPool(count - pool.length)]
    }

    // 初始化粒子
    for (let i = 0; i < pool.length; i++) {
      if (i < count) {
        currentEffect.init(pool[i]!, canvasW, canvasH, config.value)
      } else {
        pool[i]!.active = false
      }
    }
  }

  /** 动画帧 */
  function tick(timestamp: number) {
    if (!running || !ctx || !currentEffect) return

    // 计算 delta time（归一化到 60fps => dt=1）
    if (lastTime === 0) lastTime = timestamp
    const elapsed = timestamp - lastTime
    lastTime = timestamp
    const dt = Math.min(elapsed / 16.67, 3) // cap at 3x to prevent jumps

    // 清屏
    ctx.clearRect(0, 0, canvasW, canvasH)

    const count = getParticleCount()

    for (let i = 0; i < count && i < pool.length; i++) {
      const p = pool[i]!
      if (!p.active) continue

      currentEffect.update(p, canvasW, canvasH, dt, config.value)
      currentEffect.render(ctx, p, config.value)
    }

    rafId = requestAnimationFrame(tick)
  }

  /** 启动渲染循环 */
  function start() {
    if (running) return
    if (!shouldRun()) return

    resize()
    initParticles()
    running = true
    lastTime = 0
    rafId = requestAnimationFrame(tick)
  }

  /** 停止渲染循环 */
  function stop() {
    running = false
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    // 清屏
    if (ctx) {
      ctx.clearRect(0, 0, canvasW, canvasH)
    }
  }

  // ---- 可见性处理 ----

  function onVisibilityChange() {
    if (document.hidden) {
      stop()
    } else if (shouldRun()) {
      start()
    }
  }

  // ---- resize 处理（debounced） ----

  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (!running) return
      resize()
      initParticles()
    }, 200)
  }

  // ---- reduced motion 处理 ----

  function onReducedMotionChange() {
    if (reducedMotionQuery?.matches) {
      stop()
    } else if (shouldRun()) {
      start()
    }
  }

  // ---- 生命周期 ----

  function mount() {
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('resize', onResize, { passive: true })
    reducedMotionQuery?.addEventListener('change', onReducedMotionChange)

    if (shouldRun()) {
      start()
    }
  }

  function dispose() {
    stop()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('resize', onResize)
    reducedMotionQuery?.removeEventListener('change', onReducedMotionChange)
    if (resizeTimer) clearTimeout(resizeTimer)
    pool = []
    ctx = null
    currentEffect = null
  }

  // ---- 响应配置变化 ----

  watch(
    config,
    (newCfg, oldCfg) => {
      if (newCfg.type === 'none') {
        stop()
        return
      }

      // 类型变化 => 完全重新初始化
      if (newCfg.type !== oldCfg?.type) {
        stop()
        if (shouldRun()) start()
        return
      }

      // 密度变化 => 调整粒子数量
      if (newCfg.density !== oldCfg?.density) {
        initParticles()
      }
    },
    { deep: true }
  )

  watch(animationIntensity, () => {
    if (!shouldRun()) {
      stop()
    } else if (!running) {
      start()
    } else {
      // 密度可能变了，重新初始化粒子
      initParticles()
    }
  })

  return {
    mount,
    dispose,
    start,
    stop,
  }
}
