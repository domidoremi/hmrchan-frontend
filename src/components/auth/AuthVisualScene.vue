<template>
  <div
    class="auth-scene"
    :class="{ 'auth-scene--compact': !showCopy }"
    role="presentation"
    aria-hidden="true"
  >
    <div
      ref="stageRef"
      class="scene-stage"
      :class="[sceneKindClass, { 'scene-stage--fallback': !canvasEnabled }]"
    >
      <div class="scene-blobs" aria-hidden="true">
        <span class="scene-blob scene-blob--one" />
        <span class="scene-blob scene-blob--two" />
        <span class="scene-blob scene-blob--three" />
        <span class="scene-blob scene-blob--four" />
      </div>
      <canvas v-if="canvasEnabled" ref="canvasRef" class="scene-canvas" />
      <div v-else class="scene-fallback">
        <div class="scene-fallback__copy">
          <p class="scene-fallback__title">{{ title }}</p>
          <p class="scene-fallback__subtitle">{{ subtitle }}</p>
        </div>
      </div>
    </div>

    <div v-if="showCopy" class="scene-copy">
      <p class="scene-copy__kicker">{{ title }}</p>
      <p class="scene-copy__text">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, useTemplateRef } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'
import { throttleRAF } from '@/utils/performance'

defineOptions({ name: 'AuthVisualScene' })

type VisualMood = 'idle' | 'typing' | 'dodge' | 'submitting' | 'success'
type SceneKind = 'login' | 'register' | 'forgot'

interface Props {
  title: string
  subtitle: string
  mood?: VisualMood
  sceneKind?: SceneKind
  showCopy?: boolean
  useCanvas?: boolean
}

interface Dust {
  x: number
  y: number
  r: number
  a: number
  p: number
}

interface PupilTrack {
  x: number
  y: number
  tx: number
  ty: number
  delayMs: number
  smoothing: number
}

const props = withDefaults(defineProps<Props>(), {
  mood: 'idle',
  sceneKind: 'login',
  showCopy: true,
  useCanvas: false,
})

const sceneKindClass = computed(() => `scene-stage--${props.sceneKind}`)
const canvasEnabled = computed(() => props.useCanvas)

const stageRef = useTemplateRef<HTMLDivElement>('stageRef')
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')

let ctx: CanvasRenderingContext2D | null = null
let observer: ResizeObserver | null = null
let frame = 0
let width = 0
let height = 0
let dpr = 1
let authBookEl: HTMLElement | null = null
let lastStageSize = { width: 0, height: 0 }

const SCENE_RESIZE_THRESHOLD_PX = 12
const scheduleSceneResize = throttleRAF(() => {
  syncCanvasSize()
})

const pointer = {
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
}

const interaction = {
  hover: 0,
  hoverTarget: 0,
  press: 0,
  pressTarget: 0,
  leaveFace: 0,
  leaveFaceTarget: 0,
}

const state = {
  enteredAt: performance.now(),
  hoverEnteredAt: performance.now(),
  moodChangedAt: performance.now(),
  dodgeDirection: -1 as -1 | 1,
  reduceMotion: false,
}

const POINTER_EPSILON = 0.004
const PUPIL_RADIUS_MIN = 6
const PUPIL_RADIUS_MAX = 10
const PUPIL_STAGGER_MS = 90

const pupilTracks: PupilTrack[] = Array.from({ length: 4 }, (_, index) => ({
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  delayMs: index * PUPIL_STAGGER_MS,
  smoothing: 0.13 + index * 0.02,
}))

let dusts: Dust[] = []

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function easeOutCubic(value: number) {
  const t = clamp(value, 0, 1)
  return 1 - (1 - t) ** 3
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w * 0.5, h * 0.5)
  context.beginPath()
  context.moveTo(x + rr, y)
  context.arcTo(x + w, y, x + w, y + h, rr)
  context.arcTo(x + w, y + h, x, y + h, rr)
  context.arcTo(x, y + h, x, y, rr)
  context.arcTo(x, y, x + w, y, rr)
  context.closePath()
}

function drawOrangeBlob(context: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const h = w * 0.5
  context.beginPath()
  context.moveTo(x, y + h)
  context.lineTo(x + w, y + h)
  context.arc(x + w * 0.5, y + h, w * 0.5, 0, Math.PI, true)
  context.closePath()
}

function drawEye(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  blink: number,
  pupilX: number,
  pupilY: number
) {
  context.save()
  context.translate(cx, cy)
  const sy = clamp(1 - blink * 0.92, 0.08, 1)
  context.scale(1, sy)

  context.beginPath()
  context.arc(0, 0, r, 0, Math.PI * 2)
  context.fillStyle = '#f7f8ff'
  context.fill()

  context.beginPath()
  context.arc(pupilX, pupilY, r * 0.46, 0, Math.PI * 2)
  context.fillStyle = '#101220'
  context.fill()

  context.restore()
}

function rebuildDust() {
  const count = 16
  let seed = 3217
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  dusts = Array.from({ length: count }, () => ({
    x: next(),
    y: next() * 0.9,
    r: 0.6 + next() * 1.2,
    a: 0.06 + next() * 0.08,
    p: next() * Math.PI * 2,
  }))
}

function syncCanvasSize() {
  const stage = stageRef.value
  const canvas = canvasRef.value
  if (!stage || !canvas) return false

  const rect = stage.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return false

  const nextWidth = rect.width
  const nextHeight = rect.height
  const nextDpr = clamp(window.devicePixelRatio || 1, 1, 2)
  const sizeChanged =
    Math.abs(nextWidth - width) > 0.5 ||
    Math.abs(nextHeight - height) > 0.5 ||
    Math.abs(nextDpr - dpr) > 0.01

  if (!sizeChanged && ctx) return false

  width = nextWidth
  height = nextHeight
  dpr = nextDpr

  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)

  ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return false
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return true
}

function ensureAuthBookElement() {
  if (authBookEl && document.body.contains(authBookEl)) return authBookEl
  const stage = stageRef.value
  if (!stage) return null
  authBookEl = stage.closest('.auth-book') as HTMLElement | null
  return authBookEl
}

function updatePointerTargetFromBook(clientX: number, clientY: number) {
  const book = ensureAuthBookElement()
  if (!book) return

  const rect = book.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return

  const nextX = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1)
  const nextY = clamp(-(((clientY - rect.top) / rect.height) * 2 - 1), -1, 1)

  if (Math.abs(nextX - pointer.tx) > POINTER_EPSILON) {
    pointer.tx = nextX
  }
  if (Math.abs(nextY - pointer.ty) > POINTER_EPSILON) {
    pointer.ty = nextY
  }
}

function handleBookPointerEnter(event: PointerEvent) {
  interaction.hoverTarget = 1
  interaction.leaveFaceTarget = 0
  state.hoverEnteredAt = performance.now()
  updatePointerTargetFromBook(event.clientX, event.clientY)
}

function handleBookPointerMove(event: PointerEvent) {
  interaction.hoverTarget = 1
  interaction.leaveFaceTarget = 0
  if (!state.reduceMotion) {
    updatePointerTargetFromBook(event.clientX, event.clientY)
  }
}

function handleBookPointerLeave() {
  pointer.tx = 0
  pointer.ty = 0
  interaction.hoverTarget = 0
  interaction.pressTarget = 0
  interaction.leaveFaceTarget = 1
}

function handleBookPointerDown() {
  interaction.pressTarget = 1
}

function handleBookPointerUp() {
  interaction.pressTarget = 0
}

function resolveFocusLookTarget() {
  const book = ensureAuthBookElement()
  if (!book) return null
  const active = document.activeElement as HTMLElement | null
  if (!active || !book.contains(active)) return null

  const isInputLike =
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    active.getAttribute('contenteditable') === 'true'
  if (!isInputLike) return null

  const bookRect = book.getBoundingClientRect()
  const focusRect = active.getBoundingClientRect()
  if (bookRect.width < 1 || bookRect.height < 1 || focusRect.width < 1 || focusRect.height < 1) {
    return null
  }

  const cx = focusRect.left + focusRect.width * 0.5
  const cy = focusRect.top + focusRect.height * 0.5
  const x = clamp(((cx - bookRect.left) / bookRect.width) * 2 - 1, -1, 1)
  const y = clamp(-(((cy - bookRect.top) / bookRect.height) * 2 - 1), -1, 1)
  const inputType = active instanceof HTMLInputElement ? (active.type || '').toLowerCase() : ''

  return {
    x,
    y,
    isPassword: inputType === 'password',
  }
}

function getStageVar(name: string, fallback: string) {
  const stage = stageRef.value
  if (!stage) return fallback
  const value = getComputedStyle(stage).getPropertyValue(name).trim()
  return value || fallback
}

function drawBackground(context: CanvasRenderingContext2D) {
  const now = performance.now()
  const t = now * 0.001

  const bgA = getStageVar('--scene-bg-a', '#d9dbe1')
  const bgB = getStageVar('--scene-bg-b', '#d2d4db')
  const bgC = getStageVar('--scene-bg-c', '#d6d8de')
  const haze = getStageVar('--scene-haze', 'rgba(109, 87, 255, 0.16)')
  const glow = getStageVar('--scene-glow', 'rgba(255, 142, 53, 0.12)')
  const floor = getStageVar('--scene-floor', 'rgba(95, 107, 255, 0.07)')
  const line = getStageVar('--scene-line', 'rgba(95, 107, 255, 0.18)')
  const dust = getStageVar('--scene-dust', 'rgba(95, 107, 255, 0.22)')

  const drift = Math.sin(t * 0.08) * 0.03
  const grad = context.createLinearGradient(
    width * (0.12 + drift),
    0,
    width * (0.9 - drift),
    height
  )
  grad.addColorStop(0, bgA)
  grad.addColorStop(0.52, bgB)
  grad.addColorStop(1, bgC)
  context.fillStyle = grad
  context.fillRect(0, 0, width, height)

  const orbA = context.createRadialGradient(
    width * 0.18,
    height * 0.2,
    0,
    width * 0.18,
    height * 0.2,
    width * 0.46
  )
  orbA.addColorStop(0, haze)
  orbA.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = orbA
  context.fillRect(0, 0, width, height)

  const orbB = context.createRadialGradient(
    width * 0.78,
    height * 0.32,
    0,
    width * 0.78,
    height * 0.32,
    width * 0.4
  )
  orbB.addColorStop(0, glow)
  orbB.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = orbB
  context.fillRect(0, 0, width, height)

  const floorY = height * 0.82
  context.fillStyle = floor
  context.fillRect(0, floorY, width, height - floorY)
  context.strokeStyle = line
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(0, floorY + 0.5)
  context.lineTo(width, floorY + 0.5)
  context.stroke()

  for (const item of dusts) {
    const twinkle = 0.6 + 0.4 * Math.sin(t * 0.38 + item.p)
    context.beginPath()
    context.arc(item.x * width, item.y * height, item.r, 0, Math.PI * 2)
    context.fillStyle = dust.replace('0.22', `${(item.a * twinkle).toFixed(3)}`)
    context.fill()
  }
}

function computeBlink(mood: VisualMood, leaveFace: number, nowMs: number) {
  let blink = 0
  const cycle = (((nowMs * 0.00026) % 1) + 1) % 1
  if (cycle > 0.93) {
    const peak = 1 - Math.abs((cycle - 0.965) / 0.035)
    blink = Math.max(blink, clamp(peak, 0, 1) * 0.76)
  }
  if (mood === 'typing') {
    blink = Math.max(blink, 0.1)
  }
  if (mood === 'dodge') {
    blink = Math.max(blink, 0.26)
  }
  if (mood === 'submitting') {
    blink = Math.max(blink, 0.18)
  }
  blink = Math.max(blink, leaveFace * 0.44)
  return clamp(blink, 0, 1)
}

function drawPurpleCharacter(
  context: CanvasRenderingContext2D,
  x: number,
  baseline: number,
  w: number,
  h: number,
  tilt: number,
  scaleX: number,
  scaleY: number,
  pupil: PupilTrack,
  blink: number,
  leaveFace: number
) {
  const baseH = h * 0.16
  const upperH = h - baseH

  context.save()
  context.translate(x, baseline)
  drawRoundedRect(context, -w * 0.5, -baseH, w, baseH, w * 0.08)
  context.fillStyle = '#6a3ef5'
  context.fill()

  context.save()
  context.translate(0, -baseH)
  context.rotate(tilt)
  context.scale(scaleX, scaleY)

  drawRoundedRect(context, -w * 0.5, -upperH, w, upperH + baseH * 0.2, w * 0.11)
  context.fillStyle = '#6a3ef5'
  context.fill()

  const eyeY = -upperH * 0.74
  const eyeR = w * 0.082
  drawEye(context, -w * 0.18, eyeY, eyeR, blink, pupil.x * 0.12, pupil.y * 0.12)
  drawEye(context, w * 0.18, eyeY, eyeR, blink, pupil.x * 0.12, pupil.y * 0.12)

  if (leaveFace < 0.95) {
    context.globalAlpha = 1 - leaveFace
    context.fillStyle = '#1f1d27'
    context.fillRect(-w * 0.034, -upperH * 0.56, w * 0.068, upperH * 0.16)
    context.globalAlpha = 1
  }

  if (leaveFace > 0.04) {
    context.save()
    context.globalAlpha = leaveFace
    context.beginPath()
    context.arc(0, -upperH * 0.44, w * 0.12, Math.PI, 0)
    context.strokeStyle = '#1f1d27'
    context.lineWidth = w * 0.04
    context.lineCap = 'round'
    context.stroke()
    context.restore()
  }

  context.restore()

  context.restore()
}

function drawDarkCharacter(
  context: CanvasRenderingContext2D,
  x: number,
  baseline: number,
  w: number,
  h: number,
  tilt: number,
  scaleX: number,
  scaleY: number,
  pupil: PupilTrack,
  blink: number,
  leaveFace: number
) {
  const baseH = h * 0.17
  const upperH = h - baseH

  context.save()
  context.translate(x, baseline)
  drawRoundedRect(context, -w * 0.5, -baseH, w, baseH, w * 0.06)
  context.fillStyle = '#17192c'
  context.fill()

  context.save()
  context.translate(0, -baseH)
  context.rotate(tilt)
  context.scale(scaleX, scaleY)

  context.beginPath()
  context.moveTo(-w * 0.5, -upperH)
  context.lineTo(w * 0.5, -upperH * 0.95)
  context.lineTo(w * 0.5, baseH * 0.16)
  context.lineTo(-w * 0.5, baseH * 0.16)
  context.closePath()
  context.fillStyle = '#17192c'
  context.fill()

  const eyeDrop = leaveFace * Math.max(2, upperH * 0.09)
  const eyeY = -upperH * 0.72 + eyeDrop
  const eyeR = w * 0.105
  drawEye(context, -w * 0.24, eyeY, eyeR, blink * 0.86, pupil.x * 0.16, pupil.y * 0.13)
  drawEye(context, w * 0.22, eyeY, eyeR, blink * 0.86, pupil.x * 0.16, pupil.y * 0.13)

  context.beginPath()
  context.moveTo(-w * 0.1, -upperH * 0.49)
  context.lineTo(w * 0.06, -upperH * 0.49)
  context.lineCap = 'round'
  context.strokeStyle = '#f2f4ff'
  context.lineWidth = w * 0.02
  context.stroke()

  context.restore()

  context.restore()
}

function drawYellowCharacter(
  context: CanvasRenderingContext2D,
  x: number,
  baseline: number,
  w: number,
  h: number,
  tilt: number,
  scaleX: number,
  scaleY: number,
  pupil: PupilTrack,
  blink: number
) {
  const baseH = h * 0.18
  const upperH = h - baseH

  context.save()
  context.translate(x, baseline)
  drawRoundedRect(context, -w * 0.5, -baseH, w, baseH, w * 0.08)
  context.fillStyle = '#f0c606'
  context.fill()

  context.save()
  context.translate(0, -baseH)
  context.rotate(tilt)
  context.scale(scaleX, scaleY)

  drawRoundedRect(context, -w * 0.5, -upperH, w, upperH + baseH * 0.25, w * 0.48)
  context.fillStyle = '#f0c606'
  context.fill()

  const eyeX = -w * 0.06
  const eyeY = -upperH * 0.56
  drawEye(context, eyeX, eyeY, w * 0.082, blink * 0.7, pupil.x * 0.09, pupil.y * 0.08)

  context.beginPath()
  context.moveTo(w * 0.13, -upperH * 0.48)
  context.lineTo(w * 0.56, -upperH * 0.48)
  context.lineWidth = w * 0.072
  context.lineCap = 'butt'
  context.strokeStyle = '#11131f'
  context.stroke()

  context.restore()

  context.restore()
}

function drawOrangeCharacter(
  context: CanvasRenderingContext2D,
  x: number,
  baseline: number,
  w: number,
  tilt: number,
  scaleX: number,
  scaleY: number,
  pupil: PupilTrack,
  blink: number,
  leaveFace: number
) {
  const h = w * 0.5
  const baseH = h * 0.15
  const upperH = h - baseH

  context.save()
  context.translate(x, baseline)
  context.fillStyle = '#ff8e35'
  context.fillRect(-w * 0.5, -baseH, w, baseH)

  context.save()
  context.translate(0, -baseH)
  context.rotate(tilt)
  context.scale(scaleX, scaleY)

  drawOrangeBlob(context, -w * 0.5, -upperH, w)
  context.fillStyle = '#ff8e35'
  context.fill()

  const leftEyeX = -w * 0.18
  const rightEyeX = w * 0.13
  const eyeY = -upperH * 0.34
  const eyeR = w * 0.04

  if (leaveFace > 0.25) {
    const close = clamp((leaveFace - 0.25) / 0.75, 0, 1)
    const closeWidth = w * (0.06 + close * 0.03)
    const closeTilt = close * 0.08
    context.strokeStyle = '#1d1d26'
    context.lineWidth = w * 0.018
    context.lineCap = 'round'

    context.beginPath()
    context.moveTo(leftEyeX - closeWidth, eyeY - closeTilt)
    context.lineTo(leftEyeX + closeWidth, eyeY + closeTilt)
    context.stroke()

    context.beginPath()
    context.moveTo(rightEyeX - closeWidth, eyeY + closeTilt)
    context.lineTo(rightEyeX + closeWidth, eyeY - closeTilt)
    context.stroke()
  } else {
    const live = 1 - leaveFace
    context.beginPath()
    context.arc(
      leftEyeX + pupil.x * 0.07 * live,
      eyeY + pupil.y * 0.07 * live,
      eyeR,
      0,
      Math.PI * 2
    )
    context.arc(
      rightEyeX + pupil.x * 0.07 * live,
      eyeY + pupil.y * 0.07 * live,
      eyeR,
      0,
      Math.PI * 2
    )
    context.fillStyle = '#1d1d26'
    context.fill()
  }

  const mouthY = -upperH * 0.16
  if (leaveFace < 0.7) {
    const smileAlpha = 1 - leaveFace * 0.9
    context.save()
    context.globalAlpha = smileAlpha
    context.beginPath()
    const smileR = w * 0.075
    context.moveTo(-smileR, mouthY)
    context.arc(0, mouthY, smileR, Math.PI, 0)
    context.closePath()
    context.fillStyle = '#1c1110'
    context.fill()
    context.restore()
  } else {
    context.beginPath()
    context.moveTo(-w * 0.07, mouthY)
    context.lineTo(w * 0.07, mouthY)
    context.strokeStyle = '#1c1110'
    context.lineWidth = w * 0.02
    context.lineCap = 'round'
    context.stroke()
  }

  if (blink > 0.8 && leaveFace < 0.25) {
    context.globalAlpha = 0.18
    context.fillStyle = '#ffffff'
    context.fillRect(-w * 0.5, -upperH, w, upperH)
    context.globalAlpha = 1
  }

  context.restore()

  context.restore()
}

function drawScene() {
  syncCanvasSize()
  if (!ctx || width < 1 || height < 1) {
    frame = requestAnimationFrame(drawScene)
    return
  }

  const now = performance.now()
  const mood = props.mood
  const moodElapsed = (now - state.moodChangedAt) / 1000
  const focusTarget = resolveFocusLookTarget()

  if (focusTarget) {
    interaction.hoverTarget = 1
    interaction.leaveFaceTarget = 0
  }

  pointer.x += (pointer.tx - pointer.x) * (state.reduceMotion ? 0.08 : 0.11)
  pointer.y += (pointer.ty - pointer.y) * (state.reduceMotion ? 0.08 : 0.11)
  interaction.hover +=
    (interaction.hoverTarget - interaction.hover) * (state.reduceMotion ? 0.1 : 0.16)
  interaction.press +=
    (interaction.pressTarget - interaction.press) * (state.reduceMotion ? 0.14 : 0.22)
  interaction.leaveFace +=
    (interaction.leaveFaceTarget - interaction.leaveFace) * (state.reduceMotion ? 0.12 : 0.095)

  ctx.clearRect(0, 0, width, height)
  drawBackground(ctx)

  const enterProgress = easeOutCubic(clamp((now - state.enteredAt) / 760, 0, 1))
  if (enterProgress < 1) {
    ctx.fillStyle = `rgba(109, 87, 255, ${(1 - enterProgress) * 0.24})`
    ctx.fillRect(0, 0, width, height)
  }

  const unit = Math.min(width / 460, height / 300)
  const sceneW = 420 * unit
  const sceneH = 260 * unit
  const originX = (width - sceneW) * 0.5
  const originY = (height - sceneH) * 0.5 + (1 - enterProgress) * 18
  const baselineY = originY + sceneH * 0.84

  const dodgeIn = clamp(moodElapsed / 0.22, 0, 1)
  const dodgeOut = clamp((moodElapsed - 0.3) / 0.45, 0, 1)
  const dodgeForce = mood === 'dodge' ? easeOutCubic(dodgeIn) * (1 - easeOutCubic(dodgeOut)) : 0
  const successForce = mood === 'success' ? 1 - clamp(moodElapsed / 0.65, 0, 1) : 0
  const submitForce = mood === 'submitting' ? easeOutCubic(clamp(moodElapsed / 0.35, 0, 1)) : 0

  const lookOrbit = [
    clamp(sceneW * 0.015, PUPIL_RADIUS_MIN, PUPIL_RADIUS_MAX),
    clamp(sceneW * 0.017, PUPIL_RADIUS_MIN, PUPIL_RADIUS_MAX),
    clamp(sceneW * 0.019, PUPIL_RADIUS_MIN, PUPIL_RADIUS_MAX),
    clamp(sceneW * 0.021, PUPIL_RADIUS_MIN, PUPIL_RADIUS_MAX),
  ]

  let gazeX = pointer.x
  let gazeY = pointer.y
  if (focusTarget) {
    if (mood === 'dodge' || focusTarget.isPassword) {
      gazeX = clamp(-focusTarget.x * 1.16 + state.dodgeDirection * 0.32, -1, 1)
      gazeY = clamp(focusTarget.y * 0.25 - 0.22, -1, 1)
    } else {
      gazeX = clamp(pointer.x * 0.22 + focusTarget.x * 0.98, -1, 1)
      gazeY = clamp(pointer.y * 0.22 + focusTarget.y * 0.98, -1, 1)
    }
  }

  pupilTracks.forEach((pupil, index) => {
    const stagger = clamp((now - state.hoverEnteredAt - pupil.delayMs) / 260, 0, 1)
    const follow = state.reduceMotion ? 0 : interaction.hover * stagger
    const orbit = lookOrbit[index]
    pupil.tx = gazeX * orbit * follow
    pupil.ty = gazeY * orbit * 0.68 * follow
    pupil.x += (pupil.tx - pupil.x) * pupil.smoothing
    pupil.y += (pupil.ty - pupil.y) * pupil.smoothing
  })

  const leaveFace = interaction.leaveFace
  const blink = computeBlink(mood, leaveFace, now)

  const idleSway = Math.sin(now * 0.0018)
  const hoverLean = pointer.x * interaction.hover
  const typingNod = mood === 'typing' ? Math.sin(now * 0.012) * 0.015 : 0
  const pressScaleX = 1 + interaction.press * 0.012
  const pressScaleY = 1 - interaction.press * 0.024

  const purpleW = sceneW * 0.25
  const purpleH = sceneH * 0.58
  const darkW = sceneW * 0.21
  const darkH = sceneH * 0.5
  const yellowW = sceneW * 0.19
  const yellowH = sceneH * 0.42
  const orangeW = sceneW * 0.49

  const purpleTilt = clamp(
    idleSway * 0.018 +
      hoverLean * 0.06 +
      typingNod +
      dodgeForce * state.dodgeDirection * 0.095 +
      submitForce * -0.02,
    -0.17,
    0.17
  )
  const darkTilt = clamp(
    Math.sin(now * 0.0019 + 0.9) * 0.016 +
      hoverLean * 0.08 +
      typingNod * 0.7 +
      dodgeForce * state.dodgeDirection * 0.11 +
      submitForce * -0.012,
    -0.18,
    0.18
  )
  const yellowTilt = clamp(
    Math.sin(now * 0.0016 + 1.8) * 0.014 +
      hoverLean * 0.045 +
      typingNod * 0.5 +
      dodgeForce * state.dodgeDirection * 0.075 +
      successForce * 0.02,
    -0.15,
    0.15
  )
  const orangeTilt = clamp(
    Math.sin(now * 0.0017 + 2.6) * 0.015 +
      hoverLean * 0.05 +
      typingNod * 0.6 +
      dodgeForce * state.dodgeDirection * 0.082 +
      successForce * Math.sin(now * 0.012) * 0.05,
    -0.16,
    0.16
  )

  const liftOnSuccess = successForce * 1.2
  const poseScaleX = 1 + (pressScaleX - 1) * 0.5
  const poseScaleY = 1 + (pressScaleY - 1) * 0.5

  drawPurpleCharacter(
    ctx,
    originX + sceneW * 0.38,
    baselineY - liftOnSuccess,
    purpleW,
    purpleH,
    purpleTilt,
    poseScaleX * (1 - dodgeForce * 0.03),
    poseScaleY * (1 + submitForce * 0.01),
    pupilTracks[0],
    blink,
    leaveFace
  )

  drawDarkCharacter(
    ctx,
    originX + sceneW * 0.6,
    baselineY - liftOnSuccess * 0.9,
    darkW,
    darkH,
    darkTilt,
    poseScaleX * (1 - dodgeForce * 0.02),
    poseScaleY * (1 + submitForce * 0.015),
    pupilTracks[1],
    blink,
    leaveFace
  )

  drawYellowCharacter(
    ctx,
    originX + sceneW * 0.79,
    baselineY - liftOnSuccess * 0.75,
    yellowW,
    yellowH,
    yellowTilt,
    poseScaleX * (1 - dodgeForce * 0.014),
    poseScaleY * (1 + submitForce * 0.02),
    pupilTracks[2],
    blink
  )

  drawOrangeCharacter(
    ctx,
    originX + sceneW * 0.27,
    baselineY - liftOnSuccess * 0.65,
    orangeW,
    orangeTilt,
    poseScaleX * (1 - dodgeForce * 0.02),
    poseScaleY * (1 + submitForce * 0.008),
    pupilTracks[3],
    blink,
    leaveFace
  )

  frame = requestAnimationFrame(drawScene)
}

function resetAndRender() {
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
  pointer.x = 0
  pointer.y = 0
  pointer.tx = 0
  pointer.ty = 0
  interaction.hover = 0
  interaction.hoverTarget = 0
  interaction.press = 0
  interaction.pressTarget = 0
  interaction.leaveFace = 0
  interaction.leaveFaceTarget = 0
  state.enteredAt = performance.now()
  state.hoverEnteredAt = performance.now()
  pupilTracks.forEach((item) => {
    item.x = 0
    item.y = 0
    item.tx = 0
    item.ty = 0
  })
  rebuildDust()
  syncCanvasSize()
  drawScene()
}

watch(
  () => props.mood,
  (next) => {
    state.moodChangedAt = performance.now()
    if (next === 'dodge') {
      state.dodgeDirection = state.dodgeDirection === 1 ? -1 : 1
    }
  },
  { immediate: true }
)

watch(
  () => props.sceneKind,
  () => {
    if (!canvasEnabled.value) return
    resetAndRender()
  }
)

onMounted(() => {
  if (!canvasEnabled.value) return

  state.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  state.enteredAt = performance.now()
  state.hoverEnteredAt = performance.now()
  rebuildDust()
  syncCanvasSize()
  authBookEl = ensureAuthBookElement()

  if (authBookEl) {
    authBookEl.addEventListener('pointerenter', handleBookPointerEnter)
    authBookEl.addEventListener('pointermove', handleBookPointerMove)
    authBookEl.addEventListener('pointerleave', handleBookPointerLeave)
    authBookEl.addEventListener('pointerdown', handleBookPointerDown)
    authBookEl.addEventListener('pointerup', handleBookPointerUp)
    authBookEl.addEventListener('pointercancel', handleBookPointerUp)
  }
  window.addEventListener('pointerup', handleBookPointerUp)
  window.addEventListener('pointercancel', handleBookPointerUp)

  if (stageRef.value) {
    const rect = stageRef.value.getBoundingClientRect()
    lastStageSize = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }
  }

  observer = createResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return

    const nextWidth = Math.round(entry.contentRect.width)
    const nextHeight = Math.round(entry.contentRect.height)
    if (
      Math.abs(nextWidth - lastStageSize.width) < SCENE_RESIZE_THRESHOLD_PX &&
      Math.abs(nextHeight - lastStageSize.height) < SCENE_RESIZE_THRESHOLD_PX
    ) {
      return
    }

    lastStageSize = {
      width: nextWidth,
      height: nextHeight,
    }
    scheduleSceneResize()
  })

  if (stageRef.value) observer?.observe(stageRef.value)
  drawScene()
})

onUnmounted(() => {
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
  if (authBookEl) {
    authBookEl.removeEventListener('pointerenter', handleBookPointerEnter)
    authBookEl.removeEventListener('pointermove', handleBookPointerMove)
    authBookEl.removeEventListener('pointerleave', handleBookPointerLeave)
    authBookEl.removeEventListener('pointerdown', handleBookPointerDown)
    authBookEl.removeEventListener('pointerup', handleBookPointerUp)
    authBookEl.removeEventListener('pointercancel', handleBookPointerUp)
    authBookEl = null
  }
  window.removeEventListener('pointerup', handleBookPointerUp)
  window.removeEventListener('pointercancel', handleBookPointerUp)
  observer?.disconnect()
  observer = null
  scheduleSceneResize.cancel?.()
  ctx = null
})
</script>

<style scoped>
.auth-scene {
  min-height: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: clamp(0.7rem, 1.8vw, 1.2rem);
  padding: clamp(0.9rem, 2.5vw, 1.7rem);
  background: transparent;
}

.auth-scene--compact {
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  padding: 0;
  min-height: 0;
}

.scene-stage {
  --scene-bg-a: var(--color-surface-variant);
  --scene-bg-b: var(--color-bg-secondary);
  --scene-bg-c: var(--color-surface);
  --scene-haze: rgba(var(--color-primary-rgb), 0.15);
  --scene-glow: rgba(var(--color-accent-rgb), 0.12);
  --scene-floor: rgba(var(--color-primary-rgb), 0.06);
  --scene-line: rgba(var(--color-primary-rgb), 0.2);
  --scene-dust: rgba(var(--color-primary-rgb), 0.22);
  --scene-base: #f1f2f4;
  --scene-top-wash: rgba(255, 255, 255, 0.86);
  --scene-bottom-wash: rgba(246, 246, 248, 0.9);
  --scene-fog: rgba(242, 243, 245, 0.96);
  --scene-blob-1: rgba(255, 83, 145, 0.72);
  --scene-blob-2: rgba(255, 176, 156, 0.66);
  --scene-blob-3: rgba(255, 156, 218, 0.64);
  --scene-blob-4: rgba(255, 208, 184, 0.52);
  --scene-blob-opacity: 0.82;
  --scene-blob-blur: 3.45rem;
  --fallback-bg-1: #fff8fd;
  --fallback-bg-2: #ffeef6;
  --fallback-bg-3: #fff4ea;
  --fallback-orb-1: rgba(255, 83, 145, 0.34);
  --fallback-orb-2: rgba(255, 176, 156, 0.34);
  --fallback-orb-3: rgba(255, 156, 218, 0.3);
  --fallback-orb-4: rgba(255, 208, 184, 0.28);
  --fallback-wash: rgba(255, 255, 255, 0.72);
  --fallback-copy-bg: rgba(255, 255, 255, 0.62);
  --fallback-copy-border: rgba(255, 83, 145, 0.18);
  --fallback-copy-shadow: rgba(178, 79, 133, 0.22);
  --fallback-title: #221b2f;
  --fallback-subtitle: rgba(46, 41, 66, 0.76);
  --fallback-accent: rgba(255, 83, 145, 0.16);
  --fallback-blur: 3.2rem;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: clamp(12rem, 22vw, 17.6rem);
  background:
    linear-gradient(178deg, var(--scene-top-wash), var(--scene-bottom-wash) 74%, var(--scene-fog)),
    linear-gradient(
      142deg,
      var(--scene-base),
      color-mix(in srgb, var(--scene-base) 86%, #ffffff 14%)
    );
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  box-shadow:
    inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.08),
    0 1rem 2.2rem -1.5rem rgba(var(--color-primary-rgb), 0.2);
  overflow: hidden;
  touch-action: pan-y;
  cursor: default;
}

.scene-stage::before,
.scene-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-stage::before {
  z-index: 0;
  background:
    radial-gradient(
      68% 58% at 18% 16%,
      color-mix(in srgb, var(--scene-blob-1) 78%, transparent),
      transparent 74%
    ),
    radial-gradient(
      66% 54% at 84% 24%,
      color-mix(in srgb, var(--scene-blob-3) 78%, transparent),
      transparent 76%
    ),
    radial-gradient(
      72% 60% at 68% 74%,
      color-mix(in srgb, var(--scene-blob-2) 72%, transparent),
      transparent 78%
    );
  filter: blur(3rem);
  opacity: 0.72;
}

.scene-stage::after {
  z-index: 2;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 54%, var(--scene-fog) 100%);
}

.auth-scene--compact .scene-stage {
  min-height: 0;
  border-radius: 0;
  border: none;
  box-shadow: none;
}

.scene-stage--login {
  --scene-haze: rgba(var(--color-primary-rgb), 0.16);
}

.scene-stage--register {
  --scene-haze: rgba(var(--color-accent-rgb), 0.16);
}

.scene-stage--forgot {
  --scene-haze: rgba(var(--color-info-rgb), 0.15);
}

:global(#app[data-theme='dark'] .scene-stage) {
  --scene-bg-a: #151a25;
  --scene-bg-b: #1a2030;
  --scene-bg-c: #131826;
  --scene-haze: rgba(var(--color-primary-rgb), 0.24);
  --scene-glow: rgba(var(--color-accent-rgb), 0.18);
  --scene-floor: rgba(var(--color-primary-rgb), 0.1);
  --scene-line: rgba(var(--color-primary-rgb), 0.26);
  --scene-dust: rgba(var(--color-primary-rgb), 0.28);
  --scene-base: #1b1f2d;
  --scene-top-wash: rgba(207, 198, 255, 0.2);
  --scene-bottom-wash: rgba(45, 49, 72, 0.86);
  --scene-fog: rgba(33, 36, 55, 0.95);
  --scene-blob-1: rgba(253, 145, 255, 0.68);
  --scene-blob-2: rgba(82, 64, 254, 0.72);
  --scene-blob-3: rgba(173, 158, 255, 0.62);
  --scene-blob-4: rgba(112, 128, 255, 0.48);
  --scene-blob-opacity: 0.88;
  --scene-blob-blur: 3.8rem;
  --fallback-bg-1: #20243a;
  --fallback-bg-2: #252845;
  --fallback-bg-3: #191d33;
  --fallback-orb-1: rgba(132, 94, 255, 0.34);
  --fallback-orb-2: rgba(86, 119, 255, 0.3);
  --fallback-orb-3: rgba(253, 145, 255, 0.26);
  --fallback-orb-4: rgba(132, 180, 255, 0.25);
  --fallback-wash: rgba(27, 30, 47, 0.66);
  --fallback-copy-bg: rgba(24, 28, 45, 0.68);
  --fallback-copy-border: rgba(145, 132, 255, 0.22);
  --fallback-copy-shadow: rgba(0, 0, 0, 0.34);
  --fallback-title: #f5f2ff;
  --fallback-subtitle: rgba(227, 219, 255, 0.82);
  --fallback-accent: rgba(173, 158, 255, 0.2);
}

:global(#app[data-theme='blue'] .scene-stage) {
  --scene-bg-a: #d7e5ff;
  --scene-bg-b: #c9dbfb;
  --scene-bg-c: #d8e4fb;
  --scene-haze: rgba(var(--color-primary-rgb), 0.2);
  --scene-glow: rgba(var(--color-accent-rgb), 0.16);
  --scene-base: #edf5ff;
  --scene-top-wash: rgba(231, 244, 255, 0.92);
  --scene-bottom-wash: rgba(220, 235, 252, 0.9);
  --scene-fog: rgba(231, 241, 252, 0.95);
  --scene-blob-1: rgba(88, 184, 255, 0.64);
  --scene-blob-2: rgba(116, 223, 255, 0.6);
  --scene-blob-3: rgba(144, 187, 255, 0.64);
  --scene-blob-4: rgba(128, 211, 255, 0.5);
  --scene-blob-opacity: 0.8;
  --fallback-bg-1: #f3faff;
  --fallback-bg-2: #e9f5ff;
  --fallback-bg-3: #eef4ff;
  --fallback-orb-1: rgba(88, 184, 255, 0.32);
  --fallback-orb-2: rgba(116, 223, 255, 0.3);
  --fallback-orb-3: rgba(144, 187, 255, 0.28);
  --fallback-orb-4: rgba(117, 164, 255, 0.24);
  --fallback-wash: rgba(255, 255, 255, 0.66);
  --fallback-copy-bg: rgba(255, 255, 255, 0.62);
  --fallback-copy-border: rgba(88, 184, 255, 0.2);
  --fallback-copy-shadow: rgba(64, 124, 196, 0.2);
  --fallback-title: #1d2e44;
  --fallback-subtitle: rgba(43, 70, 104, 0.78);
  --fallback-accent: rgba(88, 184, 255, 0.16);
}

:global(#app[data-ui-style='ios'] .scene-stage) {
  --scene-blob-blur: 3.95rem;
  --scene-blob-opacity: 0.86;
}

:global(#app[data-ui-style='material'] .scene-stage) {
  --scene-blob-blur: 3.3rem;
  --scene-blob-opacity: 0.76;
  --fallback-copy-bg: color-mix(in srgb, var(--fallback-bg-1) 92%, #ffffff 8%);
  --fallback-copy-border: rgba(var(--color-primary-rgb), 0.22);
  --fallback-blur: 0rem;
}

:global(#app[data-ui-style='material'] .scene-stage::before) {
  opacity: 0.64;
  filter: blur(2.85rem);
}

.scene-blobs {
  position: absolute;
  inset: -12% -10% -18% -12%;
  pointer-events: none;
  z-index: 1;
}

.scene-blob {
  position: absolute;
  display: block;
  filter: blur(var(--scene-blob-blur));
  opacity: var(--scene-blob-opacity);
  transform-origin: center;
  will-change: transform, opacity;
  animation: scene-blob-breathe var(--blob-duration) ease-in-out infinite alternate;
  animation-delay: var(--blob-delay);
}

.scene-blob--one {
  top: 6%;
  left: -8%;
  width: 54%;
  height: 44%;
  border-radius: 61% 39% 54% 46% / 43% 58% 42% 57%;
  background: var(--scene-blob-1);
  --blob-rot: -12deg;
  --blob-x-start: -0.28rem;
  --blob-x-end: 0.72rem;
  --blob-y-start: 0rem;
  --blob-y-end: -0.56rem;
  --blob-scale-min: 0.96;
  --blob-scale-max: 1.05;
  --blob-duration: 8.6s;
  --blob-delay: -0.9s;
}

.scene-blob--two {
  top: -4%;
  right: -6%;
  width: 42%;
  height: 52%;
  border-radius: 42% 58% 36% 64% / 57% 39% 61% 43%;
  background: var(--scene-blob-3);
  --blob-rot: 17deg;
  --blob-x-start: -0.68rem;
  --blob-x-end: 0.42rem;
  --blob-y-start: -0.34rem;
  --blob-y-end: 0.56rem;
  --blob-scale-min: 0.95;
  --blob-scale-max: 1.06;
  --blob-duration: 9.4s;
  --blob-delay: -2.2s;
}

.scene-blob--three {
  bottom: -8%;
  right: 8%;
  width: 56%;
  height: 42%;
  border-radius: 66% 34% 47% 53% / 52% 38% 62% 48%;
  background: var(--scene-blob-4);
  --blob-rot: 8deg;
  --blob-x-start: -0.48rem;
  --blob-x-end: 0.24rem;
  --blob-y-start: 0.58rem;
  --blob-y-end: -0.36rem;
  --blob-scale-min: 0.97;
  --blob-scale-max: 1.07;
  --blob-duration: 10.4s;
  --blob-delay: -1.4s;
}

.scene-blob--four {
  bottom: 12%;
  left: 19%;
  width: 40%;
  height: 50%;
  border-radius: 37% 63% 59% 41% / 44% 61% 39% 56%;
  background: var(--scene-blob-2);
  --blob-rot: -18deg;
  --blob-x-start: -0.62rem;
  --blob-x-end: 0.34rem;
  --blob-y-start: 0.26rem;
  --blob-y-end: -0.64rem;
  --blob-scale-min: 0.95;
  --blob-scale-max: 1.08;
  --blob-duration: 8.9s;
  --blob-delay: -3.1s;
}

@keyframes scene-blob-breathe {
  0% {
    transform: translate3d(var(--blob-x-start), var(--blob-y-start), 0) rotate(var(--blob-rot))
      scale(var(--blob-scale-min));
    opacity: calc(var(--scene-blob-opacity) * 0.88);
  }

  100% {
    transform: translate3d(var(--blob-x-end), var(--blob-y-end), 0) rotate(var(--blob-rot))
      scale(var(--blob-scale-max));
    opacity: calc(var(--scene-blob-opacity) * 1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-blob {
    animation: none;
  }
}

.scene-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 3;
}

.scene-stage--fallback {
  display: grid;
  place-items: center;
  background:
    radial-gradient(70% 64% at 12% 12%, var(--fallback-orb-1), transparent 74%),
    radial-gradient(72% 68% at 84% 18%, var(--fallback-orb-3), transparent 76%),
    radial-gradient(76% 70% at 70% 82%, var(--fallback-orb-2), transparent 78%),
    linear-gradient(155deg, var(--fallback-bg-1), var(--fallback-bg-2) 58%, var(--fallback-bg-3));
}

.scene-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 2.5vw, 1.8rem);
  position: relative;
  z-index: 4;
  background:
    radial-gradient(66% 56% at 18% 22%, var(--fallback-orb-1), transparent 72%),
    radial-gradient(62% 58% at 82% 20%, var(--fallback-orb-3), transparent 74%),
    radial-gradient(68% 62% at 74% 82%, var(--fallback-orb-2), transparent 76%),
    radial-gradient(58% 52% at 36% 70%, var(--fallback-orb-4), transparent 74%),
    linear-gradient(172deg, var(--fallback-wash), transparent 66%);
}

.scene-fallback::before,
.scene-fallback::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-fallback::before {
  background:
    radial-gradient(74% 58% at 8% 10%, var(--fallback-orb-1), transparent 76%),
    radial-gradient(66% 58% at 90% 16%, var(--fallback-orb-2), transparent 78%);
  filter: blur(var(--fallback-blur));
  opacity: 0.78;
}

.scene-fallback::after {
  inset: auto 0 0 0;
  height: 46%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), var(--fallback-wash));
}

.scene-fallback__copy {
  width: min(100%, 34ch);
  position: relative;
  z-index: 2;
  text-align: center;
  display: grid;
  gap: var(--spacing-2);
  padding: clamp(0.9rem, 2.2vw, 1.3rem) clamp(0.9rem, 2.4vw, 1.4rem);
  border-radius: clamp(0.9rem, 2vw, 1.2rem);
  border: 0.0625rem solid var(--fallback-copy-border);
  background: var(--fallback-copy-bg);
  box-shadow: 0 1rem 2.4rem -1.6rem var(--fallback-copy-shadow);
  backdrop-filter: blur(0.5rem);
  -webkit-backdrop-filter: blur(0.5rem);
}

.scene-fallback__title {
  font-size: clamp(1.12rem, 1rem + 0.45vw, 1.5rem);
  font-weight: var(--font-semibold);
  color: var(--fallback-title);
  line-height: 1.3;
}

.scene-fallback__subtitle {
  font-size: var(--text-sm);
  color: var(--fallback-subtitle);
  line-height: 1.5;
}

:global(#app[data-ui-style='material'] .scene-fallback::before) {
  filter: none;
  opacity: 0.42;
}

:global(#app[data-ui-style='material'] .scene-fallback__copy) {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 0.75rem;
}

.scene-copy {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  max-width: 30ch;
}

.scene-copy__kicker {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: color-mix(in srgb, var(--color-text-primary) 90%, #ffffff 10%);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scene-copy__text {
  font-size: var(--text-sm);
  line-height: 1.58;
  color: var(--color-text-secondary);
}

@media (max-width: 56rem) {
  .auth-scene {
    min-height: 13rem;
    padding: clamp(0.75rem, 3.2vw, 1.15rem);
  }

  .auth-scene--compact {
    min-height: 0;
    padding: 0;
  }

  .scene-stage {
    min-height: clamp(10.5rem, 36vw, 13rem);
  }

  .scene-copy {
    display: none;
  }
}
</style>
