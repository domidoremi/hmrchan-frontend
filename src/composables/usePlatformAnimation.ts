import { ref, watch, onMounted, onBeforeUnmount, onActivated, onDeactivated, type Ref } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from '@/utils/performance'

export type PlatformMorphState = 'all' | 'instagram' | 'tiktok' | 'youtube' | 'twitter'

interface PlatformTheme {
  primary: string
  secondary: string
  glow: string
  glowRGB: [number, number, number]
  secondaryRGB: [number, number, number]
}

const THEMES: Record<PlatformMorphState, { light: PlatformTheme; dark: PlatformTheme }> = {
  all: {
    light: {
      primary: '#4169E1',
      secondary: '#7B68EE',
      glow: '#4169E1',
      glowRGB: [65, 105, 225],
      secondaryRGB: [123, 104, 238],
    },
    dark: {
      primary: '#6B8AFF',
      secondary: '#9B8AFF',
      glow: '#6B8AFF',
      glowRGB: [107, 138, 255],
      secondaryRGB: [155, 138, 255],
    },
  },
  youtube: {
    light: {
      primary: '#FF0000',
      secondary: '#CC0000',
      glow: '#FF4444',
      glowRGB: [255, 68, 68],
      secondaryRGB: [204, 0, 0],
    },
    dark: {
      primary: '#FF4444',
      secondary: '#FF6666',
      glow: '#FF4444',
      glowRGB: [255, 68, 68],
      secondaryRGB: [255, 102, 102],
    },
  },
  tiktok: {
    light: {
      primary: '#00F2EA',
      secondary: '#FF0050',
      glow: '#00F2EA',
      glowRGB: [0, 242, 234],
      secondaryRGB: [255, 0, 80],
    },
    dark: {
      primary: '#25F4EE',
      secondary: '#FE2C55',
      glow: '#25F4EE',
      glowRGB: [37, 244, 238],
      secondaryRGB: [254, 44, 85],
    },
  },
  twitter: {
    light: {
      primary: '#1DA1F2',
      secondary: '#0D8BD9',
      glow: '#1DA1F2',
      glowRGB: [29, 161, 242],
      secondaryRGB: [13, 139, 217],
    },
    dark: {
      primary: '#4DB5F5',
      secondary: '#1DA1F2',
      glow: '#4DB5F5',
      glowRGB: [77, 181, 245],
      secondaryRGB: [29, 161, 242],
    },
  },
  instagram: {
    light: {
      primary: '#E1306C',
      secondary: '#F77737',
      glow: '#C13584',
      glowRGB: [193, 53, 132],
      secondaryRGB: [247, 119, 55],
    },
    dark: {
      primary: '#F56040',
      secondary: '#FCAF45',
      glow: '#E1306C',
      glowRGB: [225, 48, 108],
      secondaryRGB: [252, 175, 69],
    },
  },
}

/* ── Particle ── */

interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  vx: number
  vy: number
  size: number
  alpha: number
  targetAlpha: number
  colorR: number
  colorG: number
  colorB: number
  targetR: number
  targetG: number
  targetB: number
  phase: number
  connectWeight: number
}

type FormationTarget = Pick<
  Particle,
  'targetX' | 'targetY' | 'targetAlpha' | 'targetR' | 'targetG' | 'targetB'
>

const PARTICLE_COUNT = 160
const MOBILE_PARTICLE_COUNT = 80
const CONNECTION_DIST = 55
const MOBILE_CONNECTION_DIST = 40

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

/** Distribute n points along a closed polygon path */
function pointsOnPath(
  segments: Array<{ x: number; y: number }>,
  n: number
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  const len = segments.length
  let totalLen = 0
  const segLens: number[] = []
  for (let i = 0; i < len; i++) {
    const a = segments[i]
    const b = segments[(i + 1) % len]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    segLens.push(d)
    totalLen += d
  }
  for (let i = 0; i < n; i++) {
    const t = (i / n) * totalLen
    let acc = 0
    for (let s = 0; s < len; s++) {
      const sl = segLens[s]
      if (acc + sl >= t || s === len - 1) {
        const local = sl > 0 ? (t - acc) / sl : 0
        const a = segments[s]
        const b = segments[(s + 1) % len]
        pts.push({
          x: a.x + (b.x - a.x) * local,
          y: a.y + (b.y - a.y) * local,
        })
        break
      }
      acc += sl
    }
  }
  return pts
}

/* ── Formation generators (platform-recognizable shapes) ── */

/** All: orbital galaxy rings */
function orbitalFormation(cx: number, cy: number, n: number, th: PlatformTheme): FormationTarget[] {
  const out: FormationTarget[] = []
  const rings = 5
  const [pR, pG, pB] = hex2rgb(th.primary)
  const [sR, sG, sB] = hex2rgb(th.secondary)
  for (let i = 0; i < n; i++) {
    const ring = i % rings
    const radius = 30 + ring * 28
    const angle = (i / n) * Math.PI * 2 + ring * 0.7
    const jitter = (Math.random() - 0.5) * 12
    const sec = i % 3 === 0
    out.push({
      targetX: cx + Math.cos(angle) * (radius + jitter),
      targetY: cy + Math.sin(angle) * (radius + jitter) * 0.85,
      targetAlpha: 0.5 + Math.random() * 0.4,
      targetR: sec ? sR : pR,
      targetG: sec ? sG : pG,
      targetB: sec ? sB : pB,
    })
  }
  return out
}

/**
 * YouTube: Rounded-rect "screen" outline + play ▶ triangle inside
 * Instantly recognizable as the YouTube play button
 */
function youtubeFormation(cx: number, cy: number, n: number, th: PlatformTheme): FormationTarget[] {
  const out: FormationTarget[] = []
  const [pR, pG, pB] = hex2rgb(th.primary)
  const [sR, sG, sB] = hex2rgb(th.secondary)

  // Rounded rect outline (60% of particles)
  const rectN = Math.floor(n * 0.6)
  const hw = 100,
    hh = 70,
    cr = 20
  const rectPts: Array<{ x: number; y: number }> = []
  const steps = 8
  // top-right corner
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / steps)
    rectPts.push({ x: hw - cr + Math.cos(a) * cr, y: -hh + cr + Math.sin(a) * cr })
  }
  // bottom-right corner
  for (let i = 0; i <= steps; i++) {
    const a = 0 + (Math.PI / 2) * (i / steps)
    rectPts.push({ x: hw - cr + Math.cos(a) * cr, y: hh - cr + Math.sin(a) * cr })
  }
  // bottom-left corner
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 + (Math.PI / 2) * (i / steps)
    rectPts.push({ x: -hw + cr + Math.cos(a) * cr, y: hh - cr + Math.sin(a) * cr })
  }
  // top-left corner
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (Math.PI / 2) * (i / steps)
    rectPts.push({ x: -hw + cr + Math.cos(a) * cr, y: -hh + cr + Math.sin(a) * cr })
  }
  const rectDistributed = pointsOnPath(rectPts, rectN)
  for (const pt of rectDistributed) {
    out.push({
      targetX: cx + pt.x,
      targetY: cy + pt.y,
      targetAlpha: 0.6 + Math.random() * 0.3,
      targetR: sR,
      targetG: sG,
      targetB: sB,
    })
  }

  // Play triangle (40% of particles) — filled
  const triN = n - rectN
  const ts = 45 // triangle half-size
  const triVerts = [
    { x: -ts * 0.6, y: -ts },
    { x: ts * 0.8, y: 0 },
    { x: -ts * 0.6, y: ts },
  ]
  // Fill triangle with scattered points
  for (let i = 0; i < triN; i++) {
    // Random point inside triangle using barycentric coords
    let u = Math.random(),
      v = Math.random()
    if (u + v > 1) {
      u = 1 - u
      v = 1 - v
    }
    const w = 1 - u - v
    const px = triVerts[0].x * u + triVerts[1].x * v + triVerts[2].x * w
    const py = triVerts[0].y * u + triVerts[1].y * v + triVerts[2].y * w
    out.push({
      targetX: cx + px,
      targetY: cy + py,
      targetAlpha: 0.7 + Math.random() * 0.3,
      targetR: pR,
      targetG: pG,
      targetB: pB,
    })
  }
  return out
}

/**
 * TikTok: ♪ music note with cyan/magenta chromatic split
 * The iconic TikTok double-note with color offset
 */
function tiktokFormation(cx: number, cy: number, n: number, th: PlatformTheme): FormationTarget[] {
  const out: FormationTarget[] = []
  const [pR, pG, pB] = hex2rgb(th.primary) // cyan
  const [sR, sG, sB] = hex2rgb(th.secondary) // magenta

  const noteN = Math.floor(n / 2)
  const offset = 6 // chromatic offset

  // Music note shape: circle head + vertical stem + flag
  function makeNote(ox: number, oy: number, count: number, r: number, g: number, b: number) {
    // Note head (circle, 40% of note particles)
    const headN = Math.floor(count * 0.4)
    const headR = 22
    for (let i = 0; i < headN; i++) {
      const a = (i / headN) * Math.PI * 2
      const rr = Math.random() * headR
      out.push({
        targetX: cx + ox + Math.cos(a) * rr,
        targetY: cy + oy + 40 + Math.sin(a) * rr * 0.7,
        targetAlpha: 0.6 + Math.random() * 0.4,
        targetR: r,
        targetG: g,
        targetB: b,
      })
    }
    // Stem (vertical line, 35%)
    const stemN = Math.floor(count * 0.35)
    for (let i = 0; i < stemN; i++) {
      const t = i / stemN
      out.push({
        targetX: cx + ox + headR * 0.9 + (Math.random() - 0.5) * 3,
        targetY: cy + oy + 40 - t * 90,
        targetAlpha: 0.5 + Math.random() * 0.4,
        targetR: r,
        targetG: g,
        targetB: b,
      })
    }
    // Flag (curved, 25%)
    const flagN = count - headN - stemN
    for (let i = 0; i < flagN; i++) {
      const t = i / flagN
      const fx = ox + headR * 0.9 + t * 30
      const fy = oy - 50 + Math.sin(t * Math.PI) * 15
      out.push({
        targetX: cx + fx + (Math.random() - 0.5) * 4,
        targetY: cy + fy,
        targetAlpha: 0.5 + Math.random() * 0.3,
        targetR: r,
        targetG: g,
        targetB: b,
      })
    }
  }

  // Cyan note (slightly left)
  makeNote(-offset, 0, noteN, pR, pG, pB)
  // Magenta note (slightly right, offset) — chromatic aberration effect
  makeNote(offset, 0, n - noteN, sR, sG, sB)

  return out
}

/**
 * Twitter/X: Bold "X" cross shape
 */
function twitterFormation(cx: number, cy: number, n: number, th: PlatformTheme): FormationTarget[] {
  const out: FormationTarget[] = []
  const [pR, pG, pB] = hex2rgb(th.primary)
  const [sR, sG, sB] = hex2rgb(th.secondary)

  const armLen = 80
  const thickness = 18

  // X shape: two diagonal bars
  const halfN = Math.floor(n / 2)

  // Bar 1: top-left to bottom-right (\)
  for (let i = 0; i < halfN; i++) {
    const t = (i / halfN) * 2 - 1 // -1 to 1
    const px = t * armLen
    const py = t * armLen
    const jx = (Math.random() - 0.5) * thickness
    const jy = (Math.random() - 0.5) * thickness
    const useSec = Math.abs(t) > 0.7
    out.push({
      targetX: cx + px + jx,
      targetY: cy + py + jy,
      targetAlpha: 0.5 + Math.random() * 0.5,
      targetR: useSec ? sR : pR,
      targetG: useSec ? sG : pG,
      targetB: useSec ? sB : pB,
    })
  }

  // Bar 2: top-right to bottom-left (/)
  for (let i = 0; i < n - halfN; i++) {
    const t = (i / (n - halfN)) * 2 - 1
    const px = t * armLen
    const py = -t * armLen
    const jx = (Math.random() - 0.5) * thickness
    const jy = (Math.random() - 0.5) * thickness
    const useSec = Math.abs(t) > 0.7
    out.push({
      targetX: cx + px + jx,
      targetY: cy + py + jy,
      targetAlpha: 0.5 + Math.random() * 0.5,
      targetR: useSec ? sR : pR,
      targetG: useSec ? sG : pG,
      targetB: useSec ? sB : pB,
    })
  }

  return out
}

/**
 * Instagram: Camera lens — concentric circles + rounded-rect outline
 * The iconic camera shape with gradient colors
 */
function instagramFormation(
  cx: number,
  cy: number,
  n: number,
  th: PlatformTheme
): FormationTarget[] {
  const out: FormationTarget[] = []
  const colors = [hex2rgb(th.primary), hex2rgb(th.secondary), hex2rgb(th.glow)]

  // Outer rounded-rect (40%)
  const outerN = Math.floor(n * 0.4)
  const hw = 80,
    hh = 80,
    cr = 24
  const rectPts: Array<{ x: number; y: number }> = []
  const steps = 8
  for (let corner = 0; corner < 4; corner++) {
    const baseAngle = -Math.PI / 2 + corner * (Math.PI / 2)
    const ccx = corner < 2 ? hw - cr : -hw + cr
    const ccy = corner === 0 || corner === 3 ? -hh + cr : hh - cr
    for (let i = 0; i <= steps; i++) {
      const a = baseAngle + (Math.PI / 2) * (i / steps)
      rectPts.push({ x: ccx + Math.cos(a) * cr, y: ccy + Math.sin(a) * cr })
    }
  }
  const rectDistributed = pointsOnPath(rectPts, outerN)
  for (let i = 0; i < rectDistributed.length; i++) {
    const pt = rectDistributed[i]
    const c = colors[i % 3]
    out.push({
      targetX: cx + pt.x,
      targetY: cy + pt.y,
      targetAlpha: 0.6 + Math.random() * 0.3,
      targetR: c[0],
      targetG: c[1],
      targetB: c[2],
    })
  }

  // Center lens circle (40%)
  const lensN = Math.floor(n * 0.4)
  const lensR = 40
  for (let i = 0; i < lensN; i++) {
    const ring = i < lensN * 0.5 ? 1 : 0.6
    const a = (i / lensN) * Math.PI * 2
    const r = lensR * ring + (Math.random() - 0.5) * 8
    const c = colors[i % 3]
    out.push({
      targetX: cx + Math.cos(a) * r,
      targetY: cy + Math.sin(a) * r,
      targetAlpha: 0.5 + Math.random() * 0.4,
      targetR: c[0],
      targetG: c[1],
      targetB: c[2],
    })
  }

  // Top-right dot (flash, 20%)
  const dotN = n - outerN - lensN
  const dotCx = cx + 52,
    dotCy = cy - 52
  for (let i = 0; i < dotN; i++) {
    const a = (i / dotN) * Math.PI * 2
    const r = Math.random() * 12
    const c = colors[0]
    out.push({
      targetX: dotCx + Math.cos(a) * r,
      targetY: dotCy + Math.sin(a) * r,
      targetAlpha: 0.7 + Math.random() * 0.3,
      targetR: c[0],
      targetG: c[1],
      targetB: c[2],
    })
  }

  return out
}

const FORMATION_MAP: Record<
  PlatformMorphState,
  (cx: number, cy: number, n: number, th: PlatformTheme) => FormationTarget[]
> = {
  all: orbitalFormation,
  youtube: youtubeFormation,
  tiktok: tiktokFormation,
  twitter: twitterFormation,
  instagram: instagramFormation,
}

/* ── Idle animation helpers ── */

function idleOrbital(p: Particle, t: number) {
  p.x += Math.cos(t + p.phase) * 0.35
  p.y += Math.sin(t + p.phase) * 0.3
}

function idleYoutube(p: Particle, t: number) {
  p.x += Math.sin(t * 1.5 + p.phase) * 0.15
  p.y += Math.cos(t * 1.2 + p.phase) * 0.12
}

function idleTiktok(p: Particle, t: number) {
  p.x += Math.sin(t * 4 + p.phase) * 0.5
  p.y += Math.cos(t * 3 + p.phase) * 0.2
}

function idleTwitter(p: Particle, t: number) {
  const s = Math.sin(t * 1.5 + p.phase) * 0.3
  p.x += s
  p.y += Math.cos(t * 1.5 + p.phase) * 0.3
}

function idleInstagram(p: Particle, t: number) {
  const angle = t * 0.4 + p.phase
  p.x += Math.cos(angle) * 0.3
  p.y += Math.sin(angle) * 0.3
}

const IDLE_MAP: Record<PlatformMorphState, (p: Particle, t: number) => void> = {
  all: idleOrbital,
  youtube: idleYoutube,
  tiktok: idleTiktok,
  twitter: idleTwitter,
  instagram: idleInstagram,
}

/* ── Main composable ── */

export interface UsePlatformAnimationOptions {
  isDark?: Ref<boolean>
  enabled?: Ref<boolean>
  intensity?: Ref<number>
}

export function usePlatformAnimation(
  canvasRef: Ref<HTMLCanvasElement | null>,
  platform: Ref<PlatformMorphState>,
  options: UsePlatformAnimationOptions = {}
) {
  const { isDark = ref(false), enabled = ref(true), intensity = ref(1) } = options

  const particles = ref<Particle[]>([])
  const currentPlatform = ref<PlatformMorphState>(platform.value)
  const isTransitioning = ref(false)

  let ctx: CanvasRenderingContext2D | null = null
  let rafId: number | null = null
  let isActive = true
  let canvasW = 0
  let canvasH = 0
  let dpr = 1
  let startTime = 0
  let particleCount = PARTICLE_COUNT
  let connectionDist = CONNECTION_DIST

  function getTheme(): PlatformTheme {
    const mode = isDark.value ? 'dark' : 'light'
    return THEMES[currentPlatform.value][mode]
  }

  function initParticles() {
    const n = particleCount
    const cx = canvasW / 2
    const cy = canvasH / 2
    const th = getTheme()
    const targets = FORMATION_MAP[currentPlatform.value](cx, cy, n, th)
    const arr: Particle[] = []
    for (let i = 0; i < n; i++) {
      const tgt = targets[i % targets.length]
      arr.push({
        x: cx + (Math.random() - 0.5) * canvasW * 0.6,
        y: cy + (Math.random() - 0.5) * canvasH * 0.6,
        targetX: tgt.targetX,
        targetY: tgt.targetY,
        vx: 0,
        vy: 0,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0,
        targetAlpha: tgt.targetAlpha,
        colorR: tgt.targetR,
        colorG: tgt.targetG,
        colorB: tgt.targetB,
        targetR: tgt.targetR,
        targetG: tgt.targetG,
        targetB: tgt.targetB,
        phase: Math.random() * Math.PI * 2,
        connectWeight: Math.random(),
      })
    }
    particles.value = arr
    gsap.to(arr, {
      duration: 1.2,
      stagger: { amount: 0.4, from: 'random' },
      x: (_i: number, p: Particle) => p.targetX,
      y: (_i: number, p: Particle) => p.targetY,
      alpha: (_i: number, p: Particle) => p.targetAlpha,
      ease: 'power2.out',
    })
  }

  function morphTo(newPlatform: PlatformMorphState) {
    if (newPlatform === currentPlatform.value && !isTransitioning.value) return
    currentPlatform.value = newPlatform
    isTransitioning.value = true
    const cx = canvasW / 2
    const cy = canvasH / 2
    const th = getTheme()
    const targets = FORMATION_MAP[newPlatform](cx, cy, particleCount, th)
    const arr = particles.value
    for (let i = 0; i < arr.length; i++) {
      const tgt = targets[i % targets.length]
      arr[i].targetX = tgt.targetX
      arr[i].targetY = tgt.targetY
      arr[i].targetAlpha = tgt.targetAlpha
      arr[i].targetR = tgt.targetR
      arr[i].targetG = tgt.targetG
      arr[i].targetB = tgt.targetB
    }
    gsap.to(arr, {
      duration: 0.9,
      stagger: { amount: 0.3, from: 'center' },
      x: (_i: number, p: Particle) => p.targetX,
      y: (_i: number, p: Particle) => p.targetY,
      alpha: (_i: number, p: Particle) => p.targetAlpha,
      colorR: (_i: number, p: Particle) => p.targetR,
      colorG: (_i: number, p: Particle) => p.targetG,
      colorB: (_i: number, p: Particle) => p.targetB,
      ease: 'power3.inOut',
      onComplete: () => {
        isTransitioning.value = false
      },
    })
  }

  function updateThemeColors() {
    const th = getTheme()
    const cx = canvasW / 2
    const cy = canvasH / 2
    const targets = FORMATION_MAP[currentPlatform.value](cx, cy, particleCount, th)
    const arr = particles.value
    for (let i = 0; i < arr.length; i++) {
      const tgt = targets[i % targets.length]
      arr[i].targetR = tgt.targetR
      arr[i].targetG = tgt.targetG
      arr[i].targetB = tgt.targetB
    }
    gsap.to(arr, {
      duration: 0.6,
      colorR: (_i: number, p: Particle) => p.targetR,
      colorG: (_i: number, p: Particle) => p.targetG,
      colorB: (_i: number, p: Particle) => p.targetB,
      ease: 'power1.inOut',
    })
  }

  function draw() {
    if (!ctx || !isActive) return
    const t = (performance.now() - startTime) / 1000
    const arr = particles.value
    const int = intensity.value
    ctx.clearRect(0, 0, canvasW, canvasH)

    // Connections
    const dist = connectionDist * int
    const dist2 = dist * dist
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i]
      if (a.connectWeight < 0.4) continue
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d2 = dx * dx + dy * dy
        if (d2 < dist2) {
          const strength = (1 - Math.sqrt(d2) / dist) * 0.18 * int
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(${a.colorR},${a.colorG},${a.colorB},${strength})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }
    }

    // Particles
    const idleFn = IDLE_MAP[currentPlatform.value]
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i]
      let drawX = p.x
      let drawY = p.y
      if (!isTransitioning.value && int > 0) {
        const ox = p.x,
          oy = p.y
        idleFn(p, t)
        drawX = p.x
        drawY = p.y
        p.x = ox
        p.y = oy
      }
      const size = p.size * (0.8 + int * 0.4)
      const alpha = p.alpha * int

      // Glow halo
      if (size > 2 && int > 0.5) {
        ctx.beginPath()
        ctx.arc(drawX, drawY, size * 4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.colorR},${p.colorG},${p.colorB},${alpha * 0.06})`
        ctx.fill()
      }
      // Core dot
      ctx.beginPath()
      ctx.arc(drawX, drawY, size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${p.colorR},${p.colorG},${p.colorB},${alpha})`
      ctx.fill()
    }
    rafId = requestAnimationFrame(draw)
  }

  function resizeCanvas() {
    const canvas = canvasRef.value
    if (!canvas) return
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvasW = rect.width
    canvasH = rect.height
    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const isMobile = rect.width < 500
    particleCount = isMobile ? MOBILE_PARTICLE_COUNT : PARTICLE_COUNT
    connectionDist = isMobile ? MOBILE_CONNECTION_DIST : CONNECTION_DIST
  }

  function handleResize() {
    resizeCanvas()
    const cx = canvasW / 2,
      cy = canvasH / 2
    const th = getTheme()
    const targets = FORMATION_MAP[currentPlatform.value](cx, cy, particleCount, th)
    const arr = particles.value
    if (arr.length !== particleCount) {
      initParticles()
      return
    }
    for (let i = 0; i < arr.length; i++) {
      const tgt = targets[i % targets.length]
      arr[i].targetX = tgt.targetX
      arr[i].targetY = tgt.targetY
    }
    gsap.to(arr, {
      duration: 0.4,
      x: (_i: number, p: Particle) => p.targetX,
      y: (_i: number, p: Particle) => p.targetY,
      ease: 'power1.out',
    })
  }

  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  function debouncedResize() {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(handleResize, 150)
  }

  function handleVisibility() {
    if (document.hidden) pause()
    else resume()
  }

  function pause() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function resume() {
    if (isActive && enabled.value && rafId === null) rafId = requestAnimationFrame(draw)
  }

  function start() {
    const canvas = canvasRef.value
    if (!canvas) return
    ctx = canvas.getContext('2d')
    if (!ctx) return
    startTime = performance.now()
    resizeCanvas()
    if (prefersReducedMotion() || !enabled.value) {
      initParticles()
      for (const p of particles.value) {
        p.x = p.targetX
        p.y = p.targetY
        p.alpha = p.targetAlpha
      }
      gsap.killTweensOf(particles.value)
      draw()
      pause()
      return
    }
    initParticles()
    rafId = requestAnimationFrame(draw)
  }

  function destroy() {
    isActive = false
    pause()
    gsap.killTweensOf(particles.value)
    if (resizeTimer) clearTimeout(resizeTimer)
    window.removeEventListener('resize', debouncedResize)
    document.removeEventListener('visibilitychange', handleVisibility)
  }

  watch(platform, (val) => {
    if (val !== currentPlatform.value) morphTo(val)
  })
  watch(isDark, () => {
    updateThemeColors()
  })
  watch(enabled, (val) => {
    if (val) {
      if (isActive && rafId === null) resume()
    } else pause()
  })

  onMounted(() => {
    window.addEventListener('resize', debouncedResize)
    document.addEventListener('visibilitychange', handleVisibility)
    start()
  })
  onActivated(() => {
    isActive = true
    resume()
  })
  onDeactivated(() => {
    isActive = false
    pause()
  })
  onBeforeUnmount(() => {
    destroy()
  })

  return { isTransitioning, currentPlatform, morphTo, pause, resume }
}
