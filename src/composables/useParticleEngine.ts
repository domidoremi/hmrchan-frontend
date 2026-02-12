/**
 * useParticleEngine - 高性能粒子引擎 v4
 *
 * 增强点：
 * - 星星尾迹
 * - 雪花旋转
 * - 雨滴溅起波纹
 * - 主题感知（浅色/深色默认色）
 * - 鼠标/页面切换扰动
 */

import { watch, type Ref } from 'vue'
import type { ParticleEffectConfig, ParticleEffectType } from '@/stores/settings'

// ==================== 粒子结构 ====================

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  phase: number
  depth: number
  rot: number
  spin: number
  px: number
  py: number
  splash: number
  active: boolean
}

type Initializer = (p: Particle, w: number, h: number, cfg: ParticleEffectConfig) => void
type Updater = (p: Particle, w: number, h: number, dt: number, cfg: ParticleEffectConfig) => void
type Renderer = (
  ctx: CanvasRenderingContext2D,
  p: Particle,
  cfg: ParticleEffectConfig,
  isDark: boolean
) => void

// 0=low, 1=mid, 2=high
let renderQuality = 2

// ==================== 主题色 ====================

function defaultRainColor(isDark: boolean): string {
  return isDark ? '#aec2e0' : '#334155'
}
function defaultSnowColor(isDark: boolean): string {
  return isDark ? '#e2e8f0' : '#475569'
}
function defaultStarColor(isDark: boolean): string {
  return isDark ? '#fef3c7' : '#b45309'
}

function resolveColor(
  cfg: ParticleEffectConfig,
  type: 'rain' | 'snow' | 'stars',
  isDark: boolean
): string {
  if (cfg.color) return cfg.color
  switch (type) {
    case 'rain':
      return defaultRainColor(isDark)
    case 'snow':
      return defaultSnowColor(isDark)
    case 'stars':
      return defaultStarColor(isDark)
  }
}

function drawSnowflakeLite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number
) {
  const arm = r
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = Math.max(0.4, r * 0.16)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - arm, y)
  ctx.lineTo(x + arm, y)
  ctx.moveTo(x, y - arm)
  ctx.lineTo(x, y + arm)
  ctx.stroke()
}

// ==================== 工具 ====================

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba(')) {
    return color.replace(/[\d.]+\)$/, `${alpha})`)
  }
  if (color.startsWith('#')) {
    const hex =
      color.length === 4
        ? color[1]! + color[1]! + color[2]! + color[2]! + color[3]! + color[3]!
        : color.slice(1, 7)
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(128,128,128,${alpha})`
    return `rgba(${r},${g},${b},${alpha})`
  }
  return `rgba(128,128,128,${alpha})`
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

function clampAlpha(a: number): number {
  return Math.min(Math.max(a, 0), 1)
}

function getRenderScale(type: ParticleEffectType, intensity: string, quality: number): number {
  let base = 1
  if (type === 'rain') base = 0.9
  if (type === 'snow') base = 0.85
  if (type === 'stars') base = 0.8
  if (intensity === 'reduced') base *= 0.92
  if (intensity === 'full') base *= 1
  if (quality === 1) base *= 0.9
  if (quality === 0) base *= 0.8
  return clamp(base, 0.6, 1)
}

// ==================== 形状绘制 ====================

function drawSnowflake(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number
) {
  const arm = r
  const branch = r * 0.35
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = Math.max(0.4, r * 0.18)
  ctx.lineCap = 'round'

  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i
    const cos = Math.cos(ang)
    const sin = Math.sin(ang)
    const x2 = x + cos * arm
    const y2 = y + sin * arm

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    const bx = x + cos * (arm * 0.6)
    const by = y + sin * (arm * 0.6)
    const perp = ang + Math.PI / 2
    const px = Math.cos(perp) * branch
    const py = Math.sin(perp) * branch
    ctx.beginPath()
    ctx.moveTo(bx - px * 0.5, by - py * 0.5)
    ctx.lineTo(bx + px * 0.5, by + py * 0.5)
    ctx.stroke()
  }
}

function drawStarSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number
) {
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = Math.max(0.35, r * 0.2)
  ctx.lineCap = 'round'

  const arm = r * 1.6
  const diag = r * 1.1

  ctx.beginPath()
  ctx.moveTo(x - arm, y)
  ctx.lineTo(x + arm, y)
  ctx.moveTo(x, y - arm)
  ctx.lineTo(x, y + arm)
  ctx.moveTo(x - diag, y - diag)
  ctx.lineTo(x + diag, y + diag)
  ctx.moveTo(x - diag, y + diag)
  ctx.lineTo(x + diag, y - diag)
  ctx.stroke()
}

function drawStarCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number
) {
  const w = r * 0.75
  ctx.fillStyle = withAlpha(color, alpha)
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - w, y)
  ctx.closePath()
  ctx.fill()
}

// ==================== Rain ====================

const initRain: Initializer = (p, w, h, cfg) => {
  const r = Math.random()
  p.depth = r < 0.3 ? 0 : r < 0.75 ? 1 : 2
  const depthFactor = [0.5, 1, 1.6][p.depth]!

  p.x = Math.random() * w * 1.3 - w * 0.15
  p.y = Math.random() * -h
  p.vx = (-0.3 - Math.random() * 0.8) * depthFactor
  p.vy = (3 + Math.random() * 4) * depthFactor
  p.size = (0.5 + Math.random() * 0.9) * depthFactor
  p.alpha = ([0.14, 0.28, 0.5][p.depth]! + Math.random() * 0.15) * cfg.opacity
  p.phase = Math.random() * Math.PI * 2
  p.rot = 0
  p.spin = 0
  p.px = p.x
  p.py = p.y
  p.splash = 0
  p.active = true
}

let windPhase = 0
const updateRain: Updater = (p, w, h, dt, cfg) => {
  const speed = cfg.speed * dt
  const prevY = p.y
  const wind = Math.sin(p.phase + windPhase) * 0.2
  p.x += (p.vx + wind) * speed
  p.y += p.vy * speed

  if (p.y > h - 2 && prevY <= h - 2) {
    p.splash = 1
  }

  if (p.y > h + 20 || p.x < -40) {
    p.x = Math.random() * w * 1.3 - w * 0.15
    p.y = Math.random() * -80 - 20
    p.alpha = ([0.14, 0.28, 0.5][p.depth]! + Math.random() * 0.15) * cfg.opacity
    p.splash = 0
  }
}

const renderRain: Renderer = (ctx, p, cfg, isDark) => {
  const color = resolveColor(cfg, 'rain', isDark)
  const alpha = clampAlpha(p.alpha * (isDark ? 1 : 1.35))
  const len = p.size * (p.depth === 2 ? 12 : p.depth === 1 ? 9 : 6)
  const x1 = p.x
  const y1 = p.y
  const x2 = p.x + p.vx * 1.8
  const y2 = p.y + len

  const grad = ctx.createLinearGradient(x1, y1, x2, y2)
  grad.addColorStop(0, withAlpha(color, 0))
  grad.addColorStop(0.35, withAlpha(color, alpha * 0.45))
  grad.addColorStop(1, withAlpha(color, alpha))

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = grad
  ctx.lineWidth = Math.max(0.6, p.size * 0.75)
  ctx.lineCap = 'round'
  ctx.stroke()

  if (renderQuality >= 1 && p.depth === 2) {
    ctx.beginPath()
    ctx.moveTo(x1 - p.vx * 0.4, y1 + len * 0.2)
    ctx.lineTo(x2 - p.vx * 0.2, y2)
    ctx.strokeStyle = withAlpha(color, alpha * 0.35)
    ctx.lineWidth = Math.max(0.4, p.size * 0.35)
    ctx.stroke()
  }
}

// ==================== Snow ====================

const initSnow: Initializer = (p, w, h, cfg) => {
  const r = Math.random()
  p.depth = r < 0.35 ? 0 : r < 0.75 ? 1 : 2

  const depthFactor = [0.45, 1, 1.8][p.depth]!
  p.x = Math.random() * w
  p.y = Math.random() * -h
  p.vx = (Math.random() - 0.5) * 0.3
  p.vy = (0.3 + Math.random() * 0.9) * depthFactor
  p.size = (0.9 + Math.random() * 1.6) * depthFactor
  p.alpha = ([0.18, 0.38, 0.65][p.depth]! + Math.random() * 0.15) * cfg.opacity
  p.phase = Math.random() * Math.PI * 2
  p.rot = Math.random() * Math.PI * 2
  const spinBase = 0.006 + Math.random() * 0.014
  p.spin = (Math.random() < 0.5 ? -1 : 1) * spinBase * (p.depth === 2 ? 1.4 : 1)
  p.px = p.x
  p.py = p.y
  p.splash = 0
  p.active = true
}

const updateSnow: Updater = (p, w, h, dt, cfg) => {
  const speed = cfg.speed * dt
  p.phase += 0.008 * speed * [1.2, 1, 0.7][p.depth]!
  p.rot += p.spin * dt

  const drift = Math.sin(p.phase) * (0.4 + p.depth * 0.25) * speed
  const jitter = (Math.random() - 0.5) * 0.12 * speed
  p.x += drift + jitter + p.vx * speed
  p.y += p.vy * speed

  if (p.y > h + 20) {
    p.x = Math.random() * w
    p.y = -10 - Math.random() * 30
    p.alpha = ([0.18, 0.38, 0.65][p.depth]! + Math.random() * 0.15) * cfg.opacity
  }
  if (p.x < -20) p.x = w + 10
  if (p.x > w + 20) p.x = -10
}

const renderSnow: Renderer = (ctx, p, cfg, isDark) => {
  const color = resolveColor(cfg, 'snow', isDark)
  const alpha = clampAlpha(p.alpha * (isDark ? 1 : 1.35))
  if (p.depth === 0 || renderQuality === 0) {
    drawSnowflakeLite(ctx, p.x, p.y, Math.max(0.8, p.size * 0.9), color, alpha)
    return
  }

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  drawSnowflake(ctx, 0, 0, p.size, color, alpha)
  ctx.restore()
}

// ==================== Stars ====================

const initStars: Initializer = (p, w, h, cfg) => {
  const r = Math.random()
  p.depth = r < 0.6 ? 0 : r < 0.9 ? 1 : 2

  p.x = Math.random() * w
  p.y = Math.random() * h
  const speed = [
    0.015 + Math.random() * 0.03,
    0.03 + Math.random() * 0.05,
    0.05 + Math.random() * 0.08,
  ][p.depth]!
  const ang = Math.random() * Math.PI * 2
  p.vx = Math.cos(ang) * speed
  p.vy = Math.sin(ang) * speed
  p.size = [0.4 + Math.random() * 0.8, 0.9 + Math.random() * 1.7, 1.6 + Math.random() * 2.6][
    p.depth
  ]!
  p.alpha = ([0.18, 0.4, 0.62][p.depth]! + Math.random() * 0.2) * cfg.opacity
  p.phase = Math.random() * Math.PI * 2
  p.rot = Math.random() * Math.PI * 2
  p.spin = 0
  p.px = p.x
  p.py = p.y
  p.splash = 0
  p.active = true
}

const updateStars: Updater = (p, w, h, dt, cfg) => {
  p.px = p.x
  p.py = p.y

  const drift = cfg.speed * dt
  p.x += p.vx * drift
  p.y += p.vy * drift

  if (p.x < -10) p.x = w + 10
  if (p.x > w + 10) p.x = -10
  if (p.y < -10) p.y = h + 10
  if (p.y > h + 10) p.y = -10

  const freq = [0.003, 0.006, 0.012][p.depth]!
  p.phase += freq * cfg.speed * dt
  const baseAlpha = ([0.18, 0.4, 0.62][p.depth]! + p.size * 0.05) * cfg.opacity
  const twinkle = p.depth === 0 ? 0.25 : p.depth === 1 ? 0.4 : 0.55
  p.alpha = baseAlpha * (1 - twinkle + twinkle * Math.sin(p.phase))
}

const renderStars: Renderer = (ctx, p, cfg, isDark) => {
  const color = resolveColor(cfg, 'stars', isDark)
  const alpha = clampAlpha(p.alpha * (isDark ? 1 : 1.35))

  // 尾迹（仅中/近景 + 中高质量）
  if (renderQuality >= 1 && p.depth >= 1) {
    const dx = p.x - p.px
    const dy = p.y - p.py
    const moveLen = Math.hypot(dx, dy)
    const dir = moveLen > 0.001 ? Math.atan2(dy, dx) : p.rot
    const trailLen = (p.depth === 2 ? 18 : 12) + Math.min(10, moveLen * 120)
    const tx = Math.cos(dir)
    const ty = Math.sin(dir)
    const x0 = p.x - tx * trailLen
    const y0 = p.y - ty * trailLen
    if (renderQuality === 2) {
      const grad = ctx.createLinearGradient(x0, y0, p.x, p.y)
      grad.addColorStop(0, withAlpha(color, 0))
      grad.addColorStop(1, withAlpha(color, alpha * 0.6))
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(p.x, p.y)
      ctx.strokeStyle = grad
      ctx.lineWidth = p.depth === 2 ? 1.2 : 0.6
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(p.x, p.y)
      ctx.strokeStyle = withAlpha(color, alpha * 0.35)
      ctx.lineWidth = p.depth === 2 ? 1 : 0.5
      ctx.stroke()
    }
  }
  drawStarCore(ctx, p.x, p.y, p.size, color, alpha)

  if (renderQuality >= 1 && p.depth >= 1) {
    drawStarSparkle(ctx, p.x, p.y, p.size, color, alpha * 0.6)
  }
}

// ==================== 效果注册表 ====================

interface EffectDescriptor {
  baseCount: number
  init: Initializer
  update: Updater
  render: Renderer
}

const EFFECTS: Record<Exclude<ParticleEffectType, 'none'>, EffectDescriptor> = {
  rain: { baseCount: 260, init: initRain, update: updateRain, render: renderRain },
  snow: { baseCount: 170, init: initSnow, update: updateSnow, render: renderSnow },
  stars: { baseCount: 150, init: initStars, update: updateStars, render: renderStars },
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
      depth: 0,
      rot: 0,
      spin: 0,
      px: 0,
      py: 0,
      splash: 0,
      active: false,
    })
  }
  return pool
}

// ==================== 干扰/波纹 ====================

interface Disturbance {
  x: number
  y: number
  strength: number
  radius: number
  ttl: number
  maxTtl: number
}

// ==================== 主引擎 ====================

export interface UseParticleEngineOptions {
  canvas: Ref<HTMLCanvasElement | null>
  config: Ref<ParticleEffectConfig>
  animationIntensity: Ref<string>
  resolvedTheme: Ref<string>
}

export function useParticleEngine(options: UseParticleEngineOptions) {
  const { canvas, config, animationIntensity, resolvedTheme } = options

  let ctx: CanvasRenderingContext2D | null = null
  let pool: Particle[] = []
  let rafId = 0
  let lastTime = 0
  let running = false
  let paused = false
  let quality = 2
  let avgFrame = 16.67
  let qualityTick = 0
  let canvasW = 0
  let canvasH = 0
  let dpr = 1
  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  let currentEffect: EffectDescriptor | null = null

  const reducedMotionQuery =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

  const pointer = {
    x: 0,
    y: 0,
    energy: 0,
    active: false,
    lastTime: 0,
  }

  const impulses: Disturbance[] = []

  function addImpulse(x: number, y: number, strength = 220, radius = 320, ttl = 600) {
    impulses.push({ x, y, strength, radius, ttl, maxTtl: ttl })
    if (impulses.length > 6) impulses.shift()
  }

  function isDark(): boolean {
    return resolvedTheme.value === 'dark'
  }

  function shouldRun(): boolean {
    if (config.value.type === 'none') return false
    if (animationIntensity.value === 'none') return false
    if (reducedMotionQuery?.matches) return false
    return true
  }

  function getDensityMultiplier(): number {
    const i = animationIntensity.value
    if (i === 'reduced') return 0.4
    if (i === 'full') return 1.2
    return 1
  }

  function getParticleCount(): number {
    const type = config.value.type
    if (type === 'none') return 0
    const qualityFactor = quality === 2 ? 1 : quality === 1 ? 0.8 : 0.6
    return Math.round(
      EFFECTS[type].baseCount * config.value.density * getDensityMultiplier() * qualityFactor
    )
  }

  function resize() {
    const el = canvas.value
    if (!el) return

    const prevW = canvasW
    const prevH = canvasH
    const scale = getRenderScale(config.value.type, animationIntensity.value, quality)
    dpr = Math.min(window.devicePixelRatio || 1, 2) * scale
    canvasW = window.innerWidth
    canvasH = window.innerHeight

    if (prevW > 0 && prevH > 0 && (prevW !== canvasW || prevH !== canvasH)) {
      const sx = canvasW / prevW
      const sy = canvasH / prevH
      for (const p of pool) {
        p.x *= sx
        p.y *= sy
        p.px *= sx
        p.py *= sy
      }
    }

    el.width = canvasW * dpr
    el.height = canvasH * dpr

    ctx = el.getContext('2d', { alpha: true })
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
      ctx.imageSmoothingEnabled = true
    }
  }

  function initParticles() {
    const type = config.value.type
    if (type === 'none') return

    currentEffect = EFFECTS[type]
    const count = getParticleCount()

    if (pool.length < count) {
      pool = [...pool, ...createPool(count - pool.length)]
    }

    for (let i = 0; i < pool.length; i++) {
      if (i < count) currentEffect.init(pool[i]!, canvasW, canvasH, config.value)
      else pool[i]!.active = false
    }
  }

  function applyDisturbance(p: Particle, dt: number) {
    if (renderQuality === 0) return
    if (pointer.active && pointer.energy > 0.5) {
      const dx = p.x - pointer.x
      const dy = p.y - pointer.y
      const radius = 160 + p.depth * 90
      const r2 = radius * radius
      const d2 = dx * dx + dy * dy
      if (d2 < r2) {
        const d = Math.sqrt(d2) || 1
        const force = (1 - d2 / r2) * pointer.energy * (0.015 + p.depth * 0.01) * dt
        p.x += (dx / d) * force
        p.y += (dy / d) * force
      }
    }

    for (let i = impulses.length - 1; i >= 0; i--) {
      const imp = impulses[i]!
      const dx = p.x - imp.x
      const dy = p.y - imp.y
      const r2 = imp.radius * imp.radius
      const d2 = dx * dx + dy * dy
      if (d2 < r2) {
        const d = Math.sqrt(d2) || 1
        const t = imp.ttl / imp.maxTtl
        const force = (1 - d2 / r2) * imp.strength * t * (0.01 + p.depth * 0.01) * dt
        p.x += (dx / d) * force
        p.y += (dy / d) * force
      }
    }
  }

  function tick(timestamp: number) {
    if (!running || !ctx || !currentEffect) return

    if (lastTime === 0) lastTime = timestamp
    const elapsed = timestamp - lastTime
    lastTime = timestamp
    const dt = Math.min(elapsed / 16.67, 3)

    // 动态质量调节（目标 60-240hz）
    avgFrame = avgFrame * 0.9 + elapsed * 0.1
    if (++qualityTick >= 30) {
      qualityTick = 0
      let next = quality
      if (avgFrame > 28 && quality > 0) next = quality - 1
      else if (avgFrame > 22 && quality > 1) next = quality - 1
      else if (avgFrame < 14 && quality < 2) next = quality + 1
      else if (avgFrame < 16 && quality < 1) next = quality + 1

      if (next !== quality) {
        quality = next
        renderQuality = quality
        resize()
        initParticles()
      }
    }

    windPhase = timestamp * 0.00012

    pointer.energy *= 0.9
    if (pointer.energy < 0.2) pointer.energy = 0

    for (let i = impulses.length - 1; i >= 0; i--) {
      impulses[i]!.ttl -= elapsed
      if (impulses[i]!.ttl <= 0) impulses.splice(i, 1)
    }

    ctx.clearRect(0, 0, canvasW, canvasH)

    const count = getParticleCount()
    const dark = isDark()

    for (let i = 0; i < count && i < pool.length; i++) {
      const p = pool[i]!
      if (!p.active) continue
      currentEffect.update(p, canvasW, canvasH, dt, config.value)

      applyDisturbance(p, dt)
      currentEffect.render(ctx, p, config.value, dark)
    }

    rafId = requestAnimationFrame(tick)
  }

  function start() {
    if (running) {
      if (paused) resume()
      return
    }
    if (!shouldRun()) return
    resize()
    if (!pool.length) initParticles()
    running = true
    paused = false
    renderQuality = quality
    lastTime = 0
    rafId = requestAnimationFrame(tick)
  }

  function stop() {
    running = false
    paused = false
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    if (ctx) ctx.clearRect(0, 0, canvasW, canvasH)
  }

  function pause() {
    if (!running || paused) return
    paused = true
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function resume() {
    if (!running || !paused) return
    paused = false
    // 若尺寸变化，进行缩放但不重置粒子
    resize()
    lastTime = 0
    rafId = requestAnimationFrame(tick)
  }

  // ---- 事件 ----

  function onVisibilityChange() {
    if (document.hidden) {
      pause()
    } else if (shouldRun()) {
      resume()
    }
  }

  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (!running) return
      resize()
      initParticles()
    }, 200)
  }

  function onReducedMotionChange() {
    if (reducedMotionQuery?.matches) stop()
    else if (shouldRun()) start()
  }

  function onPointerMove(e: PointerEvent) {
    const now = performance.now()
    const dt = pointer.lastTime ? Math.max(16, now - pointer.lastTime) : 16
    const dx = e.clientX - pointer.x
    const dy = e.clientY - pointer.y
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.active = true
    pointer.lastTime = now
    const speed = Math.hypot(dx, dy) / dt
    pointer.energy = clamp(speed * 120, 6, 140)
  }

  function onPointerDown(e: PointerEvent) {
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.active = true
    pointer.energy = Math.max(pointer.energy, 80)
    addImpulse(pointer.x, pointer.y, 240, 340, 700)
  }

  function onPointerLeave() {
    pointer.active = false
  }

  function onParticleBurst(event: Event) {
    const detail = (event as CustomEvent).detail as
      | { x?: number; y?: number; strength?: number; radius?: number }
      | undefined
    const x = detail?.x ?? canvasW * 0.5
    const y = detail?.y ?? canvasH * 0.35
    const strength = detail?.strength ?? 220
    const radius = detail?.radius ?? 360
    addImpulse(x, y, strength, radius, 700)
  }

  // ---- 生命周期 ----

  function mount() {
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('resize', onResize, { passive: true })
    reducedMotionQuery?.addEventListener('change', onReducedMotionChange)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave, { passive: true })
    window.addEventListener('blur', onPointerLeave, { passive: true })
    window.addEventListener('particle-burst', onParticleBurst)

    if (shouldRun()) start()
  }

  function dispose() {
    stop()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('resize', onResize)
    reducedMotionQuery?.removeEventListener('change', onReducedMotionChange)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointerleave', onPointerLeave)
    window.removeEventListener('blur', onPointerLeave)
    window.removeEventListener('particle-burst', onParticleBurst)
    if (resizeTimer) clearTimeout(resizeTimer)
    pool = []
    ctx = null
    currentEffect = null
  }

  // ---- 响应变化 ----

  watch(
    config,
    (newCfg, oldCfg) => {
      if (newCfg.type === 'none') {
        stop()
        return
      }
      if (newCfg.type !== oldCfg?.type) {
        stop()
        if (shouldRun()) start()
        return
      }
      if (newCfg.density !== oldCfg?.density) initParticles()
    },
    { deep: true }
  )

  watch(animationIntensity, () => {
    if (!shouldRun()) stop()
    else if (!running) start()
    else {
      resize()
      initParticles()
    }
  })

  return { mount, dispose, start, stop }
}
