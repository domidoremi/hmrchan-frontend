<template>
  <div
    class="hmr-signal-field"
    :data-hmr-signal-mode="renderMode"
    :data-hmr-scene-role="sceneRole"
    :data-hmr-signal-motion="motionEnabled ? 'active' : 'static'"
    aria-hidden="true"
  >
    <canvas ref="canvasRef" class="hmr-signal-field__canvas"></canvas>
    <div class="hmr-signal-field__fallback">
      <span v-for="index in 4" :key="index"></span>
    </div>
    <div class="hmr-signal-field__grid"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { HmrSceneRole } from '@/hmr/composables/useHmrSceneRole'

export type HmrSignalMode = 'static' | 'webgl2'

type SignalColor = [number, number, number]

type SignalPalette = {
  primary: SignalColor
  secondary: SignalColor
  accent: SignalColor
}

type SignalUniforms = {
  resolution: WebGLUniformLocation
  pointer: WebGLUniformLocation
  time: WebGLUniformLocation
  scroll: WebGLUniformLocation
  primary: WebGLUniformLocation
  secondary: WebGLUniformLocation
  accent: WebGLUniformLocation
}

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean
  }
}

const props = withDefaults(
  defineProps<{
    sceneRole: HmrSceneRole
    scrollProgress?: number
    motionEnabled?: boolean
  }>(),
  {
    scrollProgress: 0,
    motionEnabled: true,
  }
)

const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

const vec2 positions[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

out vec2 vUv;

void main() {
  vec2 position = positions[gl_VertexID];
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uScroll;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uAccent;

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

float valueNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);

  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0, 1.0));

  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
  for (int octave = 0; octave < 4; octave++) {
    value += amplitude * valueNoise(point);
    point = rotation * point * 2.03 + 11.7;
    amplitude *= 0.5;
  }
  return value;
}

float softRing(vec2 point, vec2 center, float radius, float width) {
  float distanceFromRing = abs(length(point - center) - radius);
  return 1.0 - smoothstep(0.0, width, distanceFromRing);
}

void main() {
  vec2 resolution = max(uResolution, vec2(1.0));
  vec2 point = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  vec2 pointer = (uPointer * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);
  float time = uTime * 0.10;
  float scrollWave = uScroll * 6.2831853;

  vec2 drift = vec2(cos(time * 0.61), sin(time * 0.43)) * 0.18;
  float field = fbm(point * 1.35 + drift + pointer * 0.08);
  float fineField = fbm(point * 3.2 - drift * 1.8);

  vec2 orbitA = pointer * 0.24 + vec2(cos(time + scrollWave), sin(time * 0.83)) * 0.34;
  vec2 orbitB = -pointer * 0.18 + vec2(sin(time * 0.72), cos(time + scrollWave)) * 0.48;
  float rings = softRing(point, orbitA, 0.30 + field * 0.10, 0.018);
  rings += softRing(point, orbitB, 0.52 + fineField * 0.08, 0.012) * 0.72;

  float stream = sin((point.x * 2.4 + point.y * 1.2 + field * 2.2 + time) * 3.0);
  stream = smoothstep(0.72, 1.0, stream) * smoothstep(1.45, 0.08, abs(point.y));

  float pointerGlow = exp(-2.7 * length(point - pointer * 0.42));
  float edgeFade = smoothstep(1.55, 0.18, length(point * vec2(0.74, 1.0)));
  float luminance = clamp(field * 0.54 + fineField * 0.22 + rings * 0.72 + stream * 0.30, 0.0, 1.6);

  vec3 color = mix(uPrimary, uSecondary, smoothstep(0.16, 0.88, field));
  color = mix(color, uAccent, clamp(rings + pointerGlow * 0.54, 0.0, 1.0));
  color += uAccent * stream * 0.18;

  float grain = hash21(gl_FragCoord.xy + floor(uTime * 12.0)) - 0.5;
  color += grain * 0.025;

  float alpha = clamp(edgeFade * (0.055 + luminance * 0.16 + pointerGlow * 0.08), 0.0, 0.34);
  outColor = vec4(color * alpha, alpha);
}
`

const SCENE_PALETTES: Record<HmrSceneRole, SignalPalette> = {
  narrative: {
    primary: [1, 0.31, 0.07],
    secondary: [0.31, 0.2, 0.84],
    accent: [1, 0.77, 0.29],
  },
  immersive: {
    primary: [0.29, 0.2, 1],
    secondary: [0.03, 0.72, 0.86],
    accent: [1, 0.34, 0.22],
  },
  discussion: {
    primary: [1, 0.21, 0.25],
    secondary: [0.74, 0.16, 0.72],
    accent: [1, 0.66, 0.22],
  },
  productivity: {
    primary: [0.05, 0.64, 0.66],
    secondary: [0.23, 0.18, 0.69],
    accent: [1, 0.57, 0.14],
  },
  editorial: {
    primary: [0.64, 0.53, 0.42],
    secondary: [0.25, 0.2, 0.42],
    accent: [1, 0.38, 0.17],
  },
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const renderMode = ref<HmrSignalMode>('static')
let gl: WebGL2RenderingContext | null = null
let program: WebGLProgram | null = null
let vertexArray: WebGLVertexArrayObject | null = null
let uniforms: SignalUniforms | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrame: number | undefined
let initializationFrame: number | undefined
let lastRenderedAt = 0
let startedAt = 0
let pageVisible = true
let pointerX = 0.5
let pointerY = 0.5
let targetPointerX = 0.5
let targetPointerY = 0.5
let currentPalette = clonePalette(SCENE_PALETTES[props.sceneRole])
let targetPalette = clonePalette(SCENE_PALETTES[props.sceneRole])

function cloneColor(color: SignalColor): SignalColor {
  return [color[0], color[1], color[2]]
}

function clonePalette(palette: SignalPalette): SignalPalette {
  return {
    primary: cloneColor(palette.primary),
    secondary: cloneColor(palette.secondary),
    accent: cloneColor(palette.accent),
  }
}

function compileShader(context: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = context.createShader(type)
  if (!shader) throw new Error('Unable to allocate WebGL shader')
  context.shaderSource(shader, source)
  context.compileShader(shader)
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    const message = context.getShaderInfoLog(shader) ?? 'Unknown WebGL shader compilation error'
    context.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

function createProgram(context: WebGL2RenderingContext): WebGLProgram {
  const vertexShader = compileShader(context, context.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
  const fragmentShader = compileShader(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE)
  const nextProgram = context.createProgram()
  if (!nextProgram) {
    context.deleteShader(vertexShader)
    context.deleteShader(fragmentShader)
    throw new Error('Unable to allocate WebGL program')
  }

  context.attachShader(nextProgram, vertexShader)
  context.attachShader(nextProgram, fragmentShader)
  context.linkProgram(nextProgram)
  context.deleteShader(vertexShader)
  context.deleteShader(fragmentShader)

  if (!context.getProgramParameter(nextProgram, context.LINK_STATUS)) {
    const message = context.getProgramInfoLog(nextProgram) ?? 'Unknown WebGL program link error'
    context.deleteProgram(nextProgram)
    throw new Error(message)
  }
  return nextProgram
}

function requireUniform(
  context: WebGL2RenderingContext,
  nextProgram: WebGLProgram,
  name: string
): WebGLUniformLocation {
  const location = context.getUniformLocation(nextProgram, name)
  if (!location) throw new Error(`WebGL uniform ${name} is unavailable`)
  return location
}

function createUniforms(
  context: WebGL2RenderingContext,
  nextProgram: WebGLProgram
): SignalUniforms {
  return {
    resolution: requireUniform(context, nextProgram, 'uResolution'),
    pointer: requireUniform(context, nextProgram, 'uPointer'),
    time: requireUniform(context, nextProgram, 'uTime'),
    scroll: requireUniform(context, nextProgram, 'uScroll'),
    primary: requireUniform(context, nextProgram, 'uPrimary'),
    secondary: requireUniform(context, nextProgram, 'uSecondary'),
    accent: requireUniform(context, nextProgram, 'uAccent'),
  }
}

function resizeCanvas(): void {
  const canvas = canvasRef.value
  if (!canvas || !gl) return
  const bounds = canvas.getBoundingClientRect()
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35)
  const width = Math.max(1, Math.round(bounds.width * pixelRatio))
  const height = Math.max(1, Math.round(bounds.height * pixelRatio))
  if (canvas.width === width && canvas.height === height) return
  canvas.width = width
  canvas.height = height
  gl.viewport(0, 0, width, height)
  drawFrame(performance.now())
}

function blendColor(current: SignalColor, target: SignalColor, amount: number): void {
  current[0] += (target[0] - current[0]) * amount
  current[1] += (target[1] - current[1]) * amount
  current[2] += (target[2] - current[2]) * amount
}

function blendPalette(amount: number): void {
  blendColor(currentPalette.primary, targetPalette.primary, amount)
  blendColor(currentPalette.secondary, targetPalette.secondary, amount)
  blendColor(currentPalette.accent, targetPalette.accent, amount)
}

function drawFrame(now: number): void {
  const canvas = canvasRef.value
  if (!canvas || !gl || !program || !uniforms) return
  const elapsed = props.motionEnabled ? Math.max(0, now - startedAt) / 1000 : 0

  gl.useProgram(program)
  gl.bindVertexArray(vertexArray)
  gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
  gl.uniform2f(uniforms.pointer, pointerX, pointerY)
  gl.uniform1f(uniforms.time, elapsed)
  gl.uniform1f(uniforms.scroll, Math.min(Math.max(props.scrollProgress, 0), 1))
  gl.uniform3fv(uniforms.primary, currentPalette.primary)
  gl.uniform3fv(uniforms.secondary, currentPalette.secondary)
  gl.uniform3fv(uniforms.accent, currentPalette.accent)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

function canAnimate(): boolean {
  const connection = (navigator as NavigatorWithConnection).connection
  return props.motionEnabled && pageVisible && connection?.saveData !== true
}

function renderLoop(now: number): void {
  if (!canAnimate()) {
    animationFrame = undefined
    drawFrame(now)
    return
  }

  if (now - lastRenderedAt >= 1000 / 30) {
    lastRenderedAt = now
    pointerX += (targetPointerX - pointerX) * 0.055
    pointerY += (targetPointerY - pointerY) * 0.055
    blendPalette(0.035)
    drawFrame(now)
  }
  animationFrame = window.requestAnimationFrame(renderLoop)
}

function startAnimation(): void {
  if (!gl || animationFrame !== undefined) return
  if (!canAnimate()) {
    drawFrame(performance.now())
    return
  }
  animationFrame = window.requestAnimationFrame(renderLoop)
}

function stopAnimation(): void {
  if (animationFrame === undefined) return
  window.cancelAnimationFrame(animationFrame)
  animationFrame = undefined
}

function handlePointerMove(event: PointerEvent): void {
  targetPointerX = Math.min(Math.max(event.clientX / Math.max(window.innerWidth, 1), 0), 1)
  targetPointerY = 1 - Math.min(Math.max(event.clientY / Math.max(window.innerHeight, 1), 0), 1)
}

function handleVisibilityChange(): void {
  pageVisible = document.visibilityState !== 'hidden'
  if (pageVisible) startAnimation()
  else stopAnimation()
}

function handleContextLost(event: Event): void {
  event.preventDefault()
  stopAnimation()
  renderMode.value = 'static'
}

function handleContextRestored(): void {
  teardownWebGl()
  initializeWebGl()
}

function initializeWebGl(): void {
  const canvas = canvasRef.value
  if (!canvas || typeof WebGL2RenderingContext === 'undefined') return

  try {
    gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false,
    })
    if (!gl) return

    program = createProgram(gl)
    uniforms = createUniforms(gl, program)
    vertexArray = gl.createVertexArray()
    if (!vertexArray) throw new Error('Unable to allocate WebGL vertex array')
    gl.bindVertexArray(vertexArray)
    gl.clearColor(0, 0, 0, 0)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    renderMode.value = 'webgl2'
    startedAt = performance.now()
    resizeCanvas()
    startAnimation()
  } catch {
    teardownWebGl()
    renderMode.value = 'static'
  }
}

function teardownWebGl(): void {
  stopAnimation()
  if (gl && vertexArray) gl.deleteVertexArray(vertexArray)
  if (gl && program) gl.deleteProgram(program)
  vertexArray = null
  program = null
  uniforms = null
  gl = null
}

watch(
  () => props.sceneRole,
  (role) => {
    targetPalette = clonePalette(SCENE_PALETTES[role])
    if (!canAnimate()) {
      currentPalette = clonePalette(targetPalette)
      drawFrame(performance.now())
    }
  }
)

watch(
  () => props.motionEnabled,
  (enabled) => {
    if (enabled) startAnimation()
    else {
      stopAnimation()
      drawFrame(performance.now())
    }
  }
)

watch(
  () => props.scrollProgress,
  () => {
    if (!canAnimate()) drawFrame(performance.now())
  }
)

onMounted(() => {
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  document.addEventListener('visibilitychange', handleVisibilityChange)

  const canvas = canvasRef.value
  canvas?.addEventListener('webglcontextlost', handleContextLost)
  canvas?.addEventListener('webglcontextrestored', handleContextRestored)

  if (typeof ResizeObserver !== 'undefined' && canvas) {
    resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(canvas)
  } else {
    window.addEventListener('resize', resizeCanvas)
  }

  initializationFrame = window.requestAnimationFrame(() => {
    initializationFrame = undefined
    initializeWebGl()
  })
})

onBeforeUnmount(() => {
  if (initializationFrame !== undefined) window.cancelAnimationFrame(initializationFrame)
  resizeObserver?.disconnect()
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('pointermove', handlePointerMove)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  const canvas = canvasRef.value
  canvas?.removeEventListener('webglcontextlost', handleContextLost)
  canvas?.removeEventListener('webglcontextrestored', handleContextRestored)
  teardownWebGl()
})
</script>

<style scoped>
.hmr-signal-field {
  --hmr-signal-primary: #ff6722;
  --hmr-signal-secondary: #5944d8;
  --hmr-signal-accent: #ffc54a;

  position: fixed;
  inset: 0;
  z-index: 0;
  contain: strict;
  opacity: 0.82;
  overflow: clip;
  pointer-events: none;
}

.hmr-signal-field[data-hmr-scene-role='immersive'] {
  --hmr-signal-primary: #5848ff;
  --hmr-signal-secondary: #15b7dc;
  --hmr-signal-accent: #ff6a3d;
}

.hmr-signal-field[data-hmr-scene-role='discussion'] {
  --hmr-signal-primary: #ff4c55;
  --hmr-signal-secondary: #bd29b8;
  --hmr-signal-accent: #ffad3e;
}

.hmr-signal-field[data-hmr-scene-role='productivity'] {
  --hmr-signal-primary: #17a7aa;
  --hmr-signal-secondary: #4938b0;
  --hmr-signal-accent: #ff8f24;
}

.hmr-signal-field[data-hmr-scene-role='editorial'] {
  --hmr-signal-primary: #a3876c;
  --hmr-signal-secondary: #40336c;
  --hmr-signal-accent: #ff6933;
}

.hmr-signal-field__canvas,
.hmr-signal-field__fallback,
.hmr-signal-field__grid {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
}

.hmr-signal-field__canvas {
  opacity: 0;
  transition: opacity 900ms var(--hmr-ease);
}

.hmr-signal-field[data-hmr-signal-mode='webgl2'] .hmr-signal-field__canvas {
  opacity: 1;
}

.hmr-signal-field__fallback {
  filter: saturate(1.1);
  opacity: 1;
  transition: opacity 700ms var(--hmr-ease);
}

.hmr-signal-field[data-hmr-signal-mode='webgl2'] .hmr-signal-field__fallback {
  opacity: 0.22;
}

.hmr-signal-field__fallback span {
  position: absolute;
  inline-size: clamp(18rem, 38vw, 42rem);
  aspect-ratio: 1;
  border-radius: 50%;
  background: color-mix(in oklab, var(--hmr-signal-primary) 34%, transparent);
  filter: blur(3.8rem);
  opacity: 0.32;
  animation: hmr-signal-drift 18s ease-in-out infinite alternate;
}

.hmr-signal-field__fallback span:nth-child(1) {
  inset-block-start: -14%;
  inset-inline-start: -8%;
}

.hmr-signal-field__fallback span:nth-child(2) {
  inset-block-start: 10%;
  inset-inline-end: -12%;
  background: color-mix(in oklab, var(--hmr-signal-secondary) 30%, transparent);
  animation-delay: -6s;
}

.hmr-signal-field__fallback span:nth-child(3) {
  inset-block-end: -20%;
  inset-inline-start: 24%;
  background: color-mix(in oklab, var(--hmr-signal-accent) 24%, transparent);
  animation-delay: -11s;
}

.hmr-signal-field__fallback span:nth-child(4) {
  inset-block-start: 44%;
  inset-inline-start: 42%;
  inline-size: clamp(12rem, 26vw, 26rem);
  background: color-mix(in oklab, var(--hmr-signal-secondary) 22%, transparent);
  animation-delay: -14s;
}

.hmr-signal-field__grid {
  background-image:
    linear-gradient(rgb(var(--hmr-base-rgb) / 3%) 0.0625rem, transparent 0.0625rem),
    linear-gradient(90deg, rgb(var(--hmr-base-rgb) / 3%) 0.0625rem, transparent 0.0625rem);
  background-size: 3.5rem 3.5rem;
  mask-image: linear-gradient(to bottom, transparent, black 18%, black 74%, transparent);
  opacity: 0.34;
}

:global(:root[data-theme='dark'] .hmr-signal-field) {
  opacity: 0.96;
}

:global(:root[data-theme='dark'] .hmr-signal-field__grid) {
  opacity: 0.22;
}

@supports (color: color(display-p3 1 0 0)) {
  .hmr-signal-field {
    --hmr-signal-primary: color(display-p3 1 0.28 0.05);
    --hmr-signal-secondary: color(display-p3 0.3 0.2 0.88);
    --hmr-signal-accent: color(display-p3 1 0.72 0.2);
  }
}

@keyframes hmr-signal-drift {
  from {
    transform: translate3d(-4%, -3%, 0) scale(0.92);
  }

  to {
    transform: translate3d(8%, 6%, 0) scale(1.08);
  }
}

@media (max-width: 767px) {
  .hmr-signal-field {
    opacity: 0.66;
  }

  .hmr-signal-field__grid {
    background-size: 2.75rem 2.75rem;
    opacity: 0.22;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hmr-signal-field__canvas {
    transition: none;
  }

  .hmr-signal-field__fallback span {
    animation: none;
  }
}

@media (prefers-contrast: more) {
  .hmr-signal-field {
    opacity: 0.32;
  }
}
</style>
