<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as THREE from 'three'
import { prefersReducedMotion } from '@/utils/performance'
import { storeToRefs } from 'pinia'
import { useSettingsStore, useThemeStore } from '@/stores'
import {
  useContextualBackground,
  type BackgroundState,
} from '@/composables/useContextualBackground'

type PlatformKey = 'core' | 'instagram' | 'tiktok' | 'youtube' | 'twitter'
type ThemeMode = 'light' | 'dark'

const PLATFORM_CONFIG: Record<
  Exclude<PlatformKey, 'core'>,
  { label: string; accent: string; icon: string }
> = {
  instagram: { label: 'Instagram', accent: '#E1306C', icon: 'IG' },
  tiktok: { label: 'TikTok', accent: '#00F2EA', icon: 'TT' },
  youtube: { label: 'YouTube', accent: '#FF0033', icon: 'YT' },
  twitter: { label: 'X', accent: '#1D9BF0', icon: 'X' },
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const route = useRoute()

const settingsStore = useSettingsStore()
const themeStore = useThemeStore()
const { currentState } = useContextualBackground()
const { resolvedTheme } = storeToRefs(themeStore)
const themeMode = computed(() => (resolvedTheme.value === 'dark' ? 'dark' : 'light'))

const shouldRender3D = computed(
  () => settingsStore.shouldAnimate && !prefersReducedMotion() && !!canvasRef.value
)

// GSAP is lazy-loaded (to avoid blocking initial render)
let gsap: typeof import('gsap').default | null = null
let ScrollTrigger: typeof import('gsap/ScrollTrigger').default | null = null
type LoopProfile = {
  orbitSpeed: number
  coreSpin: number
  coreTilt: number
  wobbleAmp: number
  wobbleSpeed: number
  particleSpeed: number
  linkPulse: number
  cameraZ: number
  cameraY: number
  cameraBreath: number
  cameraBreathSpeed: number
}

async function loadGsap() {
  if (!gsap) {
    const mod = await import('gsap')
    gsap = mod.default
  }
  return gsap
}

async function loadScrollTrigger() {
  if (!ScrollTrigger) {
    const gsapLib = await loadGsap()
    const stMod = await import('gsap/ScrollTrigger')
    ScrollTrigger = stMod.default
    gsapLib.registerPlugin(ScrollTrigger)
  }
  return ScrollTrigger
}

// Three.js scene refs
const rendererRef = shallowRef<THREE.WebGLRenderer | null>(null)
const sceneRef = shallowRef<THREE.Scene | null>(null)
const cameraRef = shallowRef<THREE.PerspectiveCamera | null>(null)

// Two-layer rig so scroll choreography (big motion) doesn't fight idle drift / mouse parallax.
const scrollRigRef = shallowRef<THREE.Group | null>(null)
const idleRigRef = shallowRef<THREE.Group | null>(null)

const coreRef = shallowRef<THREE.Mesh | null>(null)
const cardsRef = shallowRef<Record<PlatformKey, THREE.Group> | null>(null)
const linkLinesRef = shallowRef<Record<Exclude<PlatformKey, 'core'>, THREE.Line> | null>(null)
const particlesRef = shallowRef<THREE.InstancedMesh | null>(null)

type Killable = { kill: () => void }
const hubScrollTriggers: Killable[] = []

const loopState: LoopProfile = {
  orbitSpeed: 0.06,
  coreSpin: 0.18,
  coreTilt: 0.08,
  wobbleAmp: 0.08,
  wobbleSpeed: 0.6,
  particleSpeed: 1,
  linkPulse: 0.24,
  cameraZ: 4.6,
  cameraY: 0.15,
  cameraBreath: 0.06,
  cameraBreathSpeed: 0.6,
}

const loopProfiles: Record<'hero' | 'bento' | 'posts', LoopProfile> = {
  hero: {
    orbitSpeed: 0.055,
    coreSpin: 0.2,
    coreTilt: 0.1,
    wobbleAmp: 0.08,
    wobbleSpeed: 0.65,
    particleSpeed: 1,
    linkPulse: 0.22,
    cameraZ: 4.6,
    cameraY: 0.15,
    cameraBreath: 0.05,
    cameraBreathSpeed: 0.6,
  },
  bento: {
    orbitSpeed: 0.08,
    coreSpin: 0.26,
    coreTilt: 0.12,
    wobbleAmp: 0.12,
    wobbleSpeed: 0.9,
    particleSpeed: 1.35,
    linkPulse: 0.32,
    cameraZ: 4.35,
    cameraY: 0.18,
    cameraBreath: 0.08,
    cameraBreathSpeed: 0.75,
  },
  posts: {
    orbitSpeed: 0.045,
    coreSpin: 0.14,
    coreTilt: 0.06,
    wobbleAmp: 0.06,
    wobbleSpeed: 0.5,
    particleSpeed: 0.9,
    linkPulse: 0.18,
    cameraZ: 4.75,
    cameraY: 0.12,
    cameraBreath: 0.04,
    cameraBreathSpeed: 0.5,
  },
}

const clock = new THREE.Clock()
const tmpVec3 = new THREE.Vector3()
const tmpVec3B = new THREE.Vector3()
const raycaster = new THREE.Raycaster()
const pointerVec = new THREE.Vector2()
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let isVisible = true

// Frame budget: skip frames if the previous frame took too long
let lastFrameTime = 0
const TARGET_FPS = 30
const FRAME_INTERVAL = 1000 / TARGET_FPS

const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }
let pendingMouse = false
let lastMouseX = 0
let lastMouseY = 0

const dragState = {
  isDragging: false,
  pointerId: null as number | null,
  startX: 0,
  startY: 0,
  baseX: 0,
  baseY: 0,
  targetX: 0,
  targetY: 0,
  currentX: 0,
  currentY: 0,
}

const dragConfig = {
  sensitivity: 0.0022,
  maxX: 0.55,
  maxY: 0.8,
  decay: 0.92,
  smooth: 0.08,
}

// 鼠标交互响应参数
const mouseInteraction = {
  /** 鼠标悬停时的响应强度 */
  parallaxStrength: 0.08,
  /** 点击时的脉冲强度 */
  clickPulseStrength: 0.3,
  /** 平滑插值因子 */
  smoothFactor: 0.08,
  /** 点击脉冲衰减 */
  pulseDecay: 0.95,
}

let clickPulse = 0
let orbitBoost = 0
const orbitBoostDecay = 0.9
let orbitCollapse = 1

const heroAnchor = { x: 0, y: 0, targetX: 0, targetY: 0 }
let heroAnchorActive = false
let heroAnchorObserver: ResizeObserver | null = null
let pendingHeroAnchor = false

function handleMouseMove(e: MouseEvent) {
  if (dragState.isDragging) return
  lastMouseX = (e.clientX / window.innerWidth - 0.5) * 2
  lastMouseY = (e.clientY / window.innerHeight - 0.5) * 2
  if (pendingMouse) return
  pendingMouse = true
  requestAnimationFrame(() => {
    mouse.targetX = lastMouseX
    mouse.targetY = lastMouseY
    pendingMouse = false
  })
}

function isDragBlockedTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(
    el.closest(
      'a, button, input, textarea, select, [role="button"], [role="link"], .video-player, .post-card, .glass-button, .navbar, .mobile-nav'
    )
  )
}

function handlePointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (isDragBlockedTarget(e.target)) return
  dragState.isDragging = true
  dragState.pointerId = e.pointerId
  dragState.startX = e.clientX
  dragState.startY = e.clientY
  dragState.baseX = dragState.targetX
  dragState.baseY = dragState.targetY
}

function handlePointerMove(e: PointerEvent) {
  if (!dragState.isDragging) return
  if (dragState.pointerId !== null && e.pointerId !== dragState.pointerId) return
  const dx = e.clientX - dragState.startX
  const dy = e.clientY - dragState.startY
  dragState.targetY = THREE.MathUtils.clamp(
    dragState.baseY + dx * dragConfig.sensitivity,
    -dragConfig.maxY,
    dragConfig.maxY
  )
  dragState.targetX = THREE.MathUtils.clamp(
    dragState.baseX + dy * dragConfig.sensitivity,
    -dragConfig.maxX,
    dragConfig.maxX
  )
}

function handlePointerUp(e: PointerEvent) {
  if (!dragState.isDragging) return
  if (dragState.pointerId !== null && e.pointerId !== dragState.pointerId) return
  dragState.isDragging = false
  dragState.pointerId = null
}

function handleMouseClick(e: MouseEvent) {
  // 触发点击脉冲效果
  clickPulse = mouseInteraction.clickPulseStrength

  // 计算点击位置的世界坐标方向
  const clickX = (e.clientX / window.innerWidth - 0.5) * 2
  const clickY = (e.clientY / window.innerHeight - 0.5) * 2

  // 临时增强鼠标位置响应
  mouse.targetX = clickX * 1.5
  mouse.targetY = clickY * 1.5

  const renderer = rendererRef.value
  const camera = cameraRef.value
  const cards = cardsRef.value

  if (renderer && camera && cards) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointerVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointerVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointerVec, camera)

    const meshes: THREE.Object3D[] = []
    ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k) => {
      const mesh = cards[k].userData.cardMesh as THREE.Mesh | undefined
      if (mesh) meshes.push(mesh)
    })

    const hits = raycaster.intersectObjects(meshes, false)
    if (hits.length > 0) {
      orbitBoost = Math.min(orbitBoost + 0.28, 0.55)
    }
  }
}

function scheduleHeroAnchorUpdate() {
  if (pendingHeroAnchor) return
  pendingHeroAnchor = true
  requestAnimationFrame(() => {
    updateHeroAnchorTarget()
    pendingHeroAnchor = false
  })
}

function updateHeroAnchorTarget() {
  if (!heroAnchorActive) return
  const hero = document.querySelector('.hero')
  const heroContent =
    (hero?.querySelector('.hero-content') as HTMLElement | null) ?? (hero as HTMLElement | null)

  if (!heroContent) {
    heroAnchor.targetX = 0
    heroAnchor.targetY = 0
    return
  }

  const rect = heroContent.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const nx = (centerX / window.innerWidth - 0.5) * 2
  const ny = (centerY / window.innerHeight - 0.5) * 2

  heroAnchor.targetX = THREE.MathUtils.clamp(nx, -1, 1)
  heroAnchor.targetY = THREE.MathUtils.clamp(ny, -1, 1)

  if (!heroAnchorObserver && heroContent) {
    heroAnchorObserver = new ResizeObserver(() => {
      scheduleHeroAnchorUpdate()
    })
    heroAnchorObserver.observe(heroContent)
  }
}

function setHeroAnchorActive(active: boolean) {
  if (heroAnchorActive === active) return
  heroAnchorActive = active

  if (active) {
    window.addEventListener('scroll', scheduleHeroAnchorUpdate, { passive: true })
    window.addEventListener('resize', scheduleHeroAnchorUpdate)
    scheduleHeroAnchorUpdate()
    return
  }

  window.removeEventListener('scroll', scheduleHeroAnchorUpdate)
  window.removeEventListener('resize', scheduleHeroAnchorUpdate)

  if (heroAnchorObserver) {
    heroAnchorObserver.disconnect()
    heroAnchorObserver = null
  }

  heroAnchor.targetX = 0
  heroAnchor.targetY = 0
}

function startLoop() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(tick)
}

function stopLoop() {
  if (rafId === null) return
  cancelAnimationFrame(rafId)
  rafId = null
}

function handleVisibilityChange() {
  isVisible = document.visibilityState === 'visible'
  if (!isVisible) {
    stopLoop()
    return
  }
  if (shouldRender3D.value) {
    startLoop()
  }
}

function createGlowTexture(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawPlatformBadgeIcon(
  ctx: CanvasRenderingContext2D,
  platform: Exclude<PlatformKey, 'core'>,
  cx: number,
  cy: number,
  size: number
): boolean {
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'

  if (platform === 'youtube') {
    const rectW = size * 0.6
    const rectH = size * 0.42
    const rectR = rectH * 0.28
    ctx.lineWidth = Math.max(2, size * 0.05)
    drawRoundedRect(ctx, cx - rectW / 2, cy - rectH / 2, rectW, rectH, rectR)
    ctx.stroke()
    const tri = size * 0.2
    ctx.beginPath()
    ctx.moveTo(cx - tri * 0.5, cy - tri * 0.9)
    ctx.lineTo(cx + tri * 0.85, cy)
    ctx.lineTo(cx - tri * 0.5, cy + tri * 0.9)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    return true
  }

  if (platform === 'instagram') {
    const box = size * 0.48
    const r = box * 0.22
    ctx.lineWidth = Math.max(2, size * 0.045)
    drawRoundedRect(ctx, cx - box / 2, cy - box / 2, box, box, r)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, box * 0.16, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + box * 0.2, cy - box * 0.2, box * 0.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return true
  }

  if (platform === 'tiktok') {
    const stemX = cx + size * 0.08
    const stemTopY = cy - size * 0.26
    const stemBottomY = cy + size * 0.18
    ctx.lineWidth = Math.max(2, size * 0.08)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(stemX, stemTopY)
    ctx.lineTo(stemX, stemBottomY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(stemX, stemTopY)
    ctx.lineTo(stemX + size * 0.22, stemTopY + size * 0.08)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(stemX - size * 0.18, stemBottomY, size * 0.16, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    return true
  }

  if (platform === 'twitter') {
    const half = size * 0.24
    ctx.lineWidth = Math.max(2, size * 0.1)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - half, cy - half)
    ctx.lineTo(cx + half, cy + half)
    ctx.moveTo(cx + half, cy - half)
    ctx.lineTo(cx - half, cy + half)
    ctx.stroke()
    ctx.restore()
    return true
  }

  ctx.restore()
  return false
}

function createCardTexture(platform: Exclude<PlatformKey, 'core'>, theme: ThemeMode) {
  const w = 512
  const h = 320
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const config = PLATFORM_CONFIG[platform]
  const isDark = theme === 'dark'
  const textPrimary = isDark ? 'rgba(255, 255, 255, 0.92)' : 'rgba(15, 23, 42, 0.86)'
  const textSecondary = isDark ? 'rgba(226, 232, 240, 0.7)' : 'rgba(100, 116, 139, 0.76)'

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)')
  bg.addColorStop(0.55, isDark ? 'rgba(30, 41, 59, 0.82)' : 'rgba(248, 250, 252, 0.78)')
  bg.addColorStop(1, isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.64)')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  // Accent base tint
  const accentTint = ctx.createLinearGradient(0, h, w, 0)
  accentTint.addColorStop(0, config.accent)
  accentTint.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save()
  ctx.globalAlpha = isDark ? 0.18 : 0.14
  ctx.fillStyle = accentTint
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  // Accent wash
  const wash = ctx.createRadialGradient(w * 0.2, h * 0.2, 0, w * 0.2, h * 0.2, w * 0.9)
  wash.addColorStop(0, config.accent)
  wash.addColorStop(0.65, 'rgba(255,255,255,0)')
  wash.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save()
  ctx.globalAlpha = isDark ? 0.3 : 0.52
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  // Subtle grid
  ctx.save()
  ctx.globalAlpha = isDark ? 0.18 : 0.12
  ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a'
  ctx.lineWidth = 1
  for (let x = 48; x < w; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 48; y < h; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.restore()

  // Shine diagonal
  const shine = ctx.createLinearGradient(0, 0, w, h)
  shine.addColorStop(0.0, 'rgba(255,255,255,0)')
  shine.addColorStop(0.45, 'rgba(255,255,255,0)')
  shine.addColorStop(0.55, isDark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)')
  shine.addColorStop(0.75, 'rgba(255,255,255,0)')
  shine.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = shine
  ctx.fillRect(0, 0, w, h)

  // Accent edge
  ctx.save()
  ctx.globalAlpha = isDark ? 0.65 : 0.55
  ctx.fillStyle = config.accent
  ctx.fillRect(0, 0, w, 6)
  ctx.restore()
  // Icon badge
  const badgeSize = 72
  const badgeX = w - badgeSize - 40
  const badgeY = 32
  ctx.save()
  ctx.shadowColor = config.accent
  ctx.shadowBlur = isDark ? 24 : 18
  ctx.fillStyle = config.accent
  ctx.beginPath()
  ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#fff'
  const iconDrawn = drawPlatformBadgeIcon(
    ctx,
    platform,
    badgeX + badgeSize / 2,
    badgeY + badgeSize / 2,
    badgeSize
  )
  if (!iconDrawn) {
    ctx.font = '700 26px Inter, system-ui, -apple-system, Segoe UI, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(config.icon, badgeX + badgeSize / 2, badgeY + badgeSize / 2)
  }

  // Label
  ctx.fillStyle = textPrimary
  ctx.font = '700 54px Inter, system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(config.label, 36, 96)

  ctx.fillStyle = textSecondary
  ctx.font = '500 22px Inter, system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('Connected Platform', 36, 136)

  // Accent bar
  ctx.fillStyle = config.accent
  ctx.globalAlpha = isDark ? 0.9 : 0.95
  ctx.fillRect(36, h - 34, w - 72, 10)
  ctx.globalAlpha = 1

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

function createRoundedRectExtrude(width: number, height: number, radius: number, depth: number) {
  const w = width
  const h = height
  const r = Math.min(radius, width / 2, height / 2)

  const shape = new THREE.Shape()
  shape.moveTo(-w / 2 + r, -h / 2)
  shape.lineTo(w / 2 - r, -h / 2)
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  shape.lineTo(w / 2, h / 2 - r)
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  shape.lineTo(-w / 2 + r, h / 2)
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  shape.lineTo(-w / 2, -h / 2 + r)
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: depth * 0.45,
    bevelThickness: depth * 0.5,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 10,
  })
  geo.center()
  return geo
}

function platformAccent(platform: PlatformKey): string {
  if (platform === 'core') return '#6366F1'
  return PLATFORM_CONFIG[platform].accent
}

function stateToPlatformKey(state: BackgroundState): PlatformKey {
  if (state === 'home') return 'core'
  if (state === 'explore-instagram') return 'instagram'
  if (state === 'explore-tiktok') return 'tiktok'
  if (state === 'explore-youtube') return 'youtube'
  if (state === 'explore-twitter') return 'twitter'
  return 'core'
}

const orbitAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]

function layoutOrbit(radius = 1.85, zScale = 0.9, yLift = 0.2, scale = 1) {
  const cards = cardsRef.value
  if (!cards) return
  ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k, i) => {
    const g = cards[k]
    const a = orbitAngles[i]
    g.position.set(Math.cos(a) * radius, yLift + Math.sin(a * 0.7) * 0.35, Math.sin(a) * zScale)
    g.scale.setScalar(scale)
    g.rotation.set(0, -a * 0.15, 0)
  })
}

function clearHubScrollTriggers() {
  while (hubScrollTriggers.length) {
    const trigger = hubScrollTriggers.pop()
    try {
      trigger?.kill()
    } catch {
      // ignore
    }
  }
}

function setLoopProfile(name: keyof typeof loopProfiles, immediate = false) {
  const profile = loopProfiles[name] ?? loopProfiles.hero
  const gsapLib = gsap

  if (!gsapLib) {
    Object.assign(loopState, profile)
    return
  }

  gsapLib.to(loopState, {
    ...profile,
    duration: immediate ? 0 : 1.4,
    ease: 'power2.out',
    overwrite: 'auto',
  })
}

function setRendererSize(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.35)
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setPixelRatio(dpr)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function disposeScene() {
  const renderer = rendererRef.value
  const scene = sceneRef.value
  const cards = cardsRef.value

  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('click', handleMouseClick)
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  setHeroAnchorActive(false)

  // GSAP cleanup
  clearHubScrollTriggers()
  gsap?.killTweensOf(loopState)

  if (gsap && cards) {
    ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k) => {
      gsap?.killTweensOf(cards[k].userData)
    })
  }

  if (scene) {
    scene.traverse((obj) => {
      const drawable = obj as unknown as {
        geometry?: THREE.BufferGeometry
        material?: THREE.Material | THREE.Material[]
      }

      drawable.geometry?.dispose()

      const mats = drawable.material
        ? Array.isArray(drawable.material)
          ? drawable.material
          : [drawable.material]
        : []

      mats.forEach((m) => {
        const withMaps = m as THREE.Material & {
          map?: THREE.Texture
          emissiveMap?: THREE.Texture
        }
        withMaps.map?.dispose()
        withMaps.emissiveMap?.dispose()
        m.dispose()
      })
    })
  }

  renderer?.dispose()

  rendererRef.value = null
  sceneRef.value = null
  cameraRef.value = null
  scrollRigRef.value = null
  idleRigRef.value = null
  coreRef.value = null
  cardsRef.value = null
  linkLinesRef.value = null
  particlesRef.value = null
}

function updateLinks() {
  const lines = linkLinesRef.value
  const cards = cardsRef.value
  const core = coreRef.value
  if (!lines || !cards || !core) return

  const corePos = new THREE.Vector3()
  core.getWorldPosition(corePos)
  ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k) => {
    const card = cards[k]
    const line = lines[k]
    if (!card || !line) return

    const cardPos = new THREE.Vector3()
    card.getWorldPosition(cardPos)

    const arr = (line.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array
    arr[0] = corePos.x
    arr[1] = corePos.y
    arr[2] = corePos.z
    arr[3] = cardPos.x
    arr[4] = cardPos.y
    arr[5] = cardPos.z
    ;(line.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true
  })
}

function updateParticles(t: number, speed: number) {
  const mesh = particlesRef.value
  const cards = cardsRef.value
  const core = coreRef.value
  if (!mesh || !cards || !core) return

  const corePos = new THREE.Vector3()
  core.getWorldPosition(corePos)

  const tempObj = new THREE.Object3D()

  const links: Array<{ from: THREE.Vector3; to: THREE.Vector3; seed: number }> = []
  ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k, idx) => {
    const g = cards[k]
    if (!g) return
    const to = new THREE.Vector3()
    g.getWorldPosition(to)
    links.push({ from: corePos, to, seed: idx * 0.37 })
  })

  const countPerLink = 3
  let instance = 0
  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    if (!link) continue

    for (let j = 0; j < countPerLink; j++) {
      const u = (((t * (0.12 * speed) + link.seed + j / countPerLink) % 1) + 1) % 1
      const p = new THREE.Vector3().lerpVectors(link.from, link.to, u)

      // Slight arc
      const arc = Math.sin(u * Math.PI) * 0.25
      p.y += arc

      const s = 0.018 + 0.01 * Math.sin((u + j) * Math.PI * 2)
      tempObj.position.copy(p)
      tempObj.scale.setScalar(s)
      tempObj.updateMatrix()
      mesh.setMatrixAt(instance, tempObj.matrix)
      instance++
    }
  }

  mesh.instanceMatrix.needsUpdate = true
}

function applyPlatformHighlight(active: PlatformKey) {
  const cards = cardsRef.value
  if (!cards) return

  const targets: Array<{ key: PlatformKey; g: THREE.Group }> = []
  ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k) => {
    targets.push({ key: k, g: cards[k] })
  })

  const gsapLib = gsap
  if (!gsapLib) {
    // Fallback: immediate
    targets.forEach(({ key, g }) => {
      g.userData.highlight = key === active ? 1 : 0
    })
    return
  }

  targets.forEach(({ key, g }) => {
    gsapLib.to(g.userData, {
      highlight: key === active ? 1 : 0,
      duration: 0.5,
      ease: 'power2.out',
      overwrite: true,
    })
  })
}

function applyTheme(mode: ThemeMode) {
  const renderer = rendererRef.value
  const core = coreRef.value
  const cards = cardsRef.value
  const lines = linkLinesRef.value
  const particles = particlesRef.value

  if (!core || !cards || !lines) return

  const isDark = mode === 'dark'

  if (renderer) {
    renderer.toneMappingExposure = isDark ? 1.05 : 0.95
  }

  const coreMat = core.material as THREE.MeshPhysicalMaterial
  coreMat.color.set(isDark ? '#d4d4d8' : '#e4e4e7')
  coreMat.emissive.set(isDark ? '#4ade80' : '#22c55e')
  coreMat.emissiveIntensity = isDark ? 0.55 : 0.6
  coreMat.opacity = isDark ? 0.95 : 0.98
  coreMat.needsUpdate = true

  const coreGlow = core.userData.glow as THREE.Sprite | undefined
  if (coreGlow) {
    coreGlow.material.opacity = isDark ? 0.22 : 0.28
    coreGlow.material.needsUpdate = true
  }

  ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k) => {
    const g = cards[k]
    const accent = platformAccent(k)
    const mesh = g.userData.cardMesh as THREE.Mesh | undefined
    const glow = g.userData.glow as THREE.Sprite | undefined
    const line = lines[k]

    if (mesh) {
      const mat = mesh.material as THREE.MeshPhysicalMaterial
      mat.color.set(isDark ? '#ffffff' : '#f1f5ff')
      mat.emissive.set(accent)
      mat.emissiveIntensity = isDark ? 0.35 : 0.6
      mat.opacity = isDark ? 0.88 : 0.96
      g.userData.emissiveBase = mat.emissiveIntensity
      g.userData.opacityBase = mat.opacity
      g.userData.glowBase = isDark ? 0.18 : 0.32
      if (mat.map) mat.map.dispose()
      mat.map = createCardTexture(k, mode) ?? undefined
      mat.needsUpdate = true
    }

    if (glow) {
      glow.material.opacity = g.userData.glowBase ?? (isDark ? 0.18 : 0.26)
      glow.material.needsUpdate = true
    }

    if (line) {
      line.userData.baseOpacity = isDark ? 0.22 : 0.4
      const lineMat = line.material as THREE.LineBasicMaterial
      lineMat.color.set(accent)
      lineMat.opacity = line.userData.baseOpacity
      lineMat.needsUpdate = true
    }
  })

  if (particles) {
    const particleMat = particles.material as THREE.MeshBasicMaterial
    particleMat.color.set(isDark ? '#ffffff' : '#22c55e')
    particleMat.opacity = isDark ? 0.85 : 0.72
    particleMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending
    particleMat.needsUpdate = true
  }
}

function tick(now?: DOMHighResTimeStamp) {
  const renderer = rendererRef.value
  const scene = sceneRef.value
  const camera = cameraRef.value
  const scrollRig = scrollRigRef.value
  const idleRig = idleRigRef.value
  const core = coreRef.value
  const cards = cardsRef.value

  if (!renderer || !scene || !camera || !scrollRig || !idleRig || !core || !cards) {
    stopLoop()
    return
  }

  if (!isVisible || !shouldRender3D.value) {
    stopLoop()
    return
  }

  // Frame budget: throttle to ~30fps to avoid RAF stalls
  const timestamp = now ?? performance.now()
  if (timestamp - lastFrameTime < FRAME_INTERVAL) {
    rafId = requestAnimationFrame(tick)
    return
  }
  lastFrameTime = timestamp

  const dt = clock.getDelta()
  const t = clock.getElapsedTime()

  const collapse = THREE.MathUtils.clamp(orbitCollapse, 0, 1)
  const orbitRadius = THREE.MathUtils.lerp(0.55, 1.85, collapse)
  const orbitZScale = THREE.MathUtils.lerp(0.3, 0.9, collapse)
  const orbitYLift = THREE.MathUtils.lerp(0.05, 0.2, collapse)
  const orbitScale = THREE.MathUtils.lerp(0.72, 1, collapse)
  layoutOrbit(orbitRadius, orbitZScale, orbitYLift, orbitScale)

  if (orbitBoost > 0.001) {
    orbitBoost *= orbitBoostDecay
  } else {
    orbitBoost = 0
  }

  // Idle motion: subtle drift (kept even when ScrollTrigger is active)
  idleRig.rotation.y += dt * (loopState.orbitSpeed + orbitBoost)
  core.rotation.y += dt * loopState.coreSpin
  core.rotation.x += dt * loopState.coreTilt

  // Per-card micro motion + highlight glow
  ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k, idx) => {
    const g = cards[k]
    const wobble = loopState.wobbleAmp * Math.sin(t * (loopState.wobbleSpeed + idx * 0.05))
    g.rotation.z = wobble * 0.15
    g.rotation.x = wobble * 0.08

    const highlight = Number(g.userData.highlight || 0)
    const glow = g.userData.glow as THREE.Sprite | undefined
    if (glow) {
      const glowBase = Number(g.userData.glowBase ?? 0.18)
      glow.material.opacity = glowBase + highlight * 0.35
      glow.scale.setScalar(1.3 + highlight * 0.55)
    }

    const mesh = g.userData.cardMesh as THREE.Mesh | undefined
    if (mesh) {
      const mat = mesh.material as THREE.MeshPhysicalMaterial
      const emissiveBase = Number(g.userData.emissiveBase ?? 0.25)
      const opacityBase = Number(g.userData.opacityBase ?? 0.82)
      mat.emissiveIntensity = emissiveBase + highlight * 0.9
      mat.opacity = opacityBase + highlight * 0.18
    }
  })

  const lines = linkLinesRef.value
  if (lines) {
    ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k, idx) => {
      const lineMat = lines[k].material as THREE.LineBasicMaterial
      const highlight = Number(cards[k].userData.highlight || 0)
      const baseOpacity = Number(lines[k].userData.baseOpacity ?? 0.22)
      const pulse = 0.12 + loopState.linkPulse * (0.2 + 0.08 * Math.sin(t * 0.8 + idx))
      lineMat.opacity = (pulse + highlight * 0.12) * baseOpacity
    })
  }

  // 平滑插值鼠标位置
  mouse.x += (mouse.targetX - mouse.x) * mouseInteraction.smoothFactor
  mouse.y += (mouse.targetY - mouse.y) * mouseInteraction.smoothFactor

  // 拖拽旋转平滑
  dragState.currentX += (dragState.targetX - dragState.currentX) * dragConfig.smooth
  dragState.currentY += (dragState.targetY - dragState.currentY) * dragConfig.smooth
  if (!dragState.isDragging) {
    dragState.targetX *= dragConfig.decay
    dragState.targetY *= dragConfig.decay
  }

  // 处理点击脉冲衰减
  if (clickPulse > 0.001) {
    clickPulse *= mouseInteraction.pulseDecay
  } else {
    clickPulse = 0
  }

  // 增强的鼠标驱动相机视差
  const parallaxMult = mouseInteraction.parallaxStrength + clickPulse
  const targetRotX = -mouse.y * (0.04 + parallaxMult) + dragState.currentX
  const targetRotY = mouse.x * (0.06 + parallaxMult) + dragState.currentY
  idleRig.rotation.x += (targetRotX - idleRig.rotation.x) * (0.04 + clickPulse * 0.1)
  idleRig.rotation.y += (targetRotY - idleRig.rotation.y) * (0.02 + clickPulse * 0.05)

  // 点击时核心球体脉冲效果
  if (clickPulse > 0.01) {
    const pulseScale = 1 + clickPulse * 0.15
    core.scale.setScalar(pulseScale)

    // 核心发光增强
    const coreMat = core.material as THREE.MeshPhysicalMaterial
    coreMat.emissiveIntensity = 0.55 + clickPulse * 1.5
  } else {
    core.scale.setScalar(1)
    const coreMat = core.material as THREE.MeshPhysicalMaterial
    const isDark = themeMode.value === 'dark'
    coreMat.emissiveIntensity = isDark ? 0.55 : 0.45
  }

  const breath = Math.sin(t * loopState.cameraBreathSpeed) * loopState.cameraBreath
  camera.position.z = loopState.cameraZ + breath + clickPulse * 0.3
  camera.position.y = loopState.cameraY + breath * 0.25

  // Always keep camera aimed at the core.
  core.getWorldPosition(tmpVec3)
  heroAnchor.x += (heroAnchor.targetX - heroAnchor.x) * 0.08
  heroAnchor.y += (heroAnchor.targetY - heroAnchor.y) * 0.08

  const anchorWeight = collapse
  const lookAtOffsetX = -heroAnchor.x * anchorWeight * 0.65
  const lookAtOffsetY = heroAnchor.y * anchorWeight * 0.45
  tmpVec3B.set(tmpVec3.x + lookAtOffsetX, tmpVec3.y + lookAtOffsetY, tmpVec3.z)
  camera.lookAt(tmpVec3B)

  updateLinks()
  updateParticles(t, loopState.particleSpeed)

  renderer.render(scene, camera)
  rafId = requestAnimationFrame(tick)
}

async function setupSectionLoops() {
  const st = await loadScrollTrigger()
  await loadGsap()

  clearHubScrollTriggers()
  layoutOrbit()
  setLoopProfile('hero', true)
  orbitCollapse = 1
  setHeroAnchorActive(true)

  const heroEl = document.querySelector('.hero')
  if (heroEl) {
    const trigger = st.create({
      trigger: heroEl,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        orbitCollapse = 1 - self.progress
      },
    })
    hubScrollTriggers.push(trigger)
  }

  const sections: Array<{ selector: string; profile: keyof typeof loopProfiles }> = [
    { selector: '.hero', profile: 'hero' },
    { selector: '.bento', profile: 'bento' },
    { selector: '.posts', profile: 'posts' },
  ]

  sections.forEach(({ selector, profile }) => {
    const el = document.querySelector(selector)
    if (!el) return
    const trigger = st.create({
      trigger: el,
      start: 'top 65%',
      end: 'bottom 35%',
      onEnter: () => setLoopProfile(profile),
      onEnterBack: () => setLoopProfile(profile),
    })
    hubScrollTriggers.push(trigger)
  })
}

function createScene() {
  const canvas = canvasRef.value
  if (!canvas) return

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0.15, 4.6)

  setRendererSize(renderer, camera)

  // Lighting (cheap but nice)
  const ambient = new THREE.AmbientLight(0xffffff, 0.85)
  scene.add(ambient)

  const key = new THREE.DirectionalLight(0xffffff, 1.25)
  key.position.set(3, 4, 5)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x99aaff, 1.1)
  rim.position.set(-4, 2.5, -3)
  scene.add(rim)

  const scrollRig = new THREE.Group()
  const idleRig = new THREE.Group()
  scrollRig.add(idleRig)
  scene.add(scrollRig)

  // Core: crystalline / glassy sphere
  const coreGeo = new THREE.IcosahedronGeometry(0.62, 4)
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#d4d4d8'),
    roughness: 0.12,
    metalness: 0.05,
    transmission: 1,
    thickness: 0.9,
    ior: 1.35,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    emissive: new THREE.Color('#4ade80'),
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.95,
  })
  const core = new THREE.Mesh(coreGeo, coreMat)
  idleRig.add(core)

  // Core glow sprite
  const glowTex = createGlowTexture()
  if (glowTex) {
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: new THREE.Color('#4ade80'),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const glow = new THREE.Sprite(spriteMat)
    glow.scale.set(2.8, 2.8, 1)
    core.add(glow)
    core.userData.glow = glow
  }

  // Platform cards
  const cardGeo = createRoundedRectExtrude(1.5, 0.95, 0.16, 0.08)

  const cards: Record<PlatformKey, THREE.Group> = {
    core: new THREE.Group(),
    instagram: new THREE.Group(),
    tiktok: new THREE.Group(),
    youtube: new THREE.Group(),
    twitter: new THREE.Group(),
  }

  const platforms = Object.keys(PLATFORM_CONFIG).map((key) => {
    const typedKey = key as Exclude<PlatformKey, 'core'>
    return {
      key: typedKey,
      ...PLATFORM_CONFIG[typedKey],
    }
  })

  platforms.forEach(({ key, accent }) => {
    const g = cards[key]
    const tex = createCardTexture(key, themeMode.value)

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.22,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      transmission: 0.28,
      thickness: 0.4,
      ior: 1.2,
      emissive: new THREE.Color(accent),
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.88,
      map: tex ?? undefined,
    })

    const mesh = new THREE.Mesh(cardGeo, mat)
    mesh.castShadow = false
    mesh.receiveShadow = false
    g.add(mesh)
    g.userData.cardMesh = mesh
    mesh.userData.platformKey = key
    g.userData.highlight = 0
    g.userData.platformKey = key
    g.userData.emissiveBase = 0.35
    g.userData.opacityBase = 0.88
    g.userData.glowBase = 0.18

    if (glowTex) {
      const cardGlowMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const cardGlow = new THREE.Sprite(cardGlowMat)
      cardGlow.position.set(0, 0, -0.15)
      cardGlow.scale.set(1.6, 1.6, 1)
      g.add(cardGlow)
      g.userData.glow = cardGlow
    }

    idleRig.add(g)
  })

  // Links (core -> each card)
  const lines = {} as Record<Exclude<PlatformKey, 'core'>, THREE.Line>

  ;(['instagram', 'tiktok', 'youtube', 'twitter'] as const).forEach((k) => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))

    const accent = platformAccent(k)
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const line = new THREE.Line(geo, mat)
    idleRig.add(line)
    lines[k] = line
  })

  // Data particles (instanced spheres moving along links)
  const particleGeo = new THREE.SphereGeometry(1, 10, 10)
  const particleMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const particles = new THREE.InstancedMesh(particleGeo, particleMat, 12)
  idleRig.add(particles)

  // Save refs
  rendererRef.value = renderer
  sceneRef.value = scene
  cameraRef.value = camera
  scrollRigRef.value = scrollRig
  idleRigRef.value = idleRig
  coreRef.value = core
  cardsRef.value = cards
  linkLinesRef.value = lines
  particlesRef.value = particles

  // Base orbit layout + default loop profile
  layoutOrbit()
  setLoopProfile('hero', true)

  // Initial highlight from state
  applyPlatformHighlight(stateToPlatformKey(currentState.value))
  applyTheme(themeMode.value)

  // Events
  window.addEventListener('mousemove', handleMouseMove, { passive: true })
  window.addEventListener('click', handleMouseClick, { passive: true })
  window.addEventListener('pointerdown', handlePointerDown, { passive: true })
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerup', handlePointerUp, { passive: true })
  window.addEventListener('pointercancel', handlePointerUp, { passive: true })
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Resize
  resizeObserver = new ResizeObserver(() => {
    if (!rendererRef.value || !cameraRef.value) return
    setRendererSize(rendererRef.value, cameraRef.value)
  })
  resizeObserver.observe(document.documentElement)

  // Start
  clock.start()
  startLoop()
}

const activePlatformFromState = computed(() => stateToPlatformKey(currentState.value))

watch(activePlatformFromState, (p) => {
  if (!shouldRender3D.value) return
  loadGsap()
    .then(() => {
      applyPlatformHighlight(p)
    })
    .catch(() => {
      applyPlatformHighlight(p)
    })
})

watch(themeMode, (mode) => {
  if (!shouldRender3D.value || !rendererRef.value) return
  applyTheme(mode)
})

watch(
  () => route.name,
  async (name) => {
    if (!shouldRender3D.value) return

    // Home route: enable section-based loop transitions
    if (name === 'home') {
      try {
        await setupSectionLoops()
      } catch {
        // ignore
      }
      return
    }

    // Non-home: clear section triggers and rely on idle + state highlight
    clearHubScrollTriggers()
    setHeroAnchorActive(false)
    orbitCollapse = 1
    applyPlatformHighlight(activePlatformFromState.value)
  },
  { immediate: true }
)

watch(
  shouldRender3D,
  async (enabled) => {
    if (!enabled) {
      stopLoop()
      clearHubScrollTriggers()
      setHeroAnchorActive(false)

      // If animations turned off at runtime, freeze to a single frame
      const renderer = rendererRef.value
      const scene = sceneRef.value
      const camera = cameraRef.value
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
      return
    }

    // If renderer isn't initialized yet, do it now
    if (!rendererRef.value) {
      createScene()
      return
    }

    // Resume render loop
    startLoop()

    // Ensure section triggers exist when returning to home
    if (route.name === 'home') {
      try {
        await setupSectionLoops()
      } catch {
        // ignore
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  disposeScene()
})
</script>

<template>
  <canvas ref="canvasRef" class="platform-hub-canvas" aria-hidden="true" />
</template>

<style scoped>
.platform-hub-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* Below overlay, above gradient underlay */
  z-index: 1;
  opacity: 0.9;
  transform: translateZ(0);
  will-change: transform;
}

:global(#app[data-theme='light'] .platform-hub-canvas) {
  opacity: 0.98;
  filter: saturate(1.2) contrast(1.15) brightness(0.96);
}

:global(#app[data-theme='dark'] .platform-hub-canvas) {
  opacity: 0.92;
  filter: saturate(1.08) contrast(1.05);
}

@media (max-width: 768px) {
  .platform-hub-canvas {
    opacity: 0.7;
  }

  :global(#app[data-theme='light'] .platform-hub-canvas) {
    opacity: 0.82;
  }
}

@media (prefers-reduced-motion: reduce) {
  .platform-hub-canvas {
    display: none;
  }
}
</style>
