<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores'

const { t, tm } = useI18n()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const visible = computed(() => settings.value.showDeskPet)
const shouldAnimate = computed(
  () => settings.value.enableAnimations && settings.value.animationIntensity !== 'none'
)

// ─── 状态 ───
enum PetState {
  IDLE = 'idle',
  HOVER = 'hover',
  CLICK = 'click',
  ANGRY = 'angry',
  SLEEP = 'sleep',
  WAKE = 'wake',
  DRAG = 'drag',
  HAPPY = 'happy',
  THINKING = 'thinking',
  PAT = 'pat',
  EAT = 'eat',
  DIZZY = 'dizzy',
}

const stateImageMap: Record<PetState, string> = {
  [PetState.IDLE]: '/images/expressions/sitting.webp',
  [PetState.HOVER]: '/images/expressions/confused.webp',
  [PetState.CLICK]: '/images/expressions/surprised.webp',
  [PetState.ANGRY]: '/images/expressions/angry.webp',
  [PetState.SLEEP]: '/images/expressions/sleeping.webp',
  [PetState.WAKE]: '/images/expressions/surprised.webp',
  [PetState.DRAG]: '/images/expressions/running.webp',
  [PetState.HAPPY]: '/images/expressions/happy.webp',
  [PetState.THINKING]: '/images/expressions/thinking.webp',
  [PetState.PAT]: '/images/expressions/kawaii.webp',
  [PetState.EAT]: '/images/expressions/laughing.webp',
  [PetState.DIZZY]: '/images/expressions/confused.webp',
}

// 时间问候
const getTimeGreeting = (): string => {
  const h = new Date().getHours()
  if (h < 6) return t('deskPet.greeting.lateNight')
  if (h < 12) return t('deskPet.greeting.morning')
  if (h < 18) return t('deskPet.greeting.afternoon')
  return t('deskPet.greeting.evening')
}

const pickSpeech = (state: PetState): string => {
  const lines = tm(`deskPet.speech.${state}`) as string[]
  if (!lines?.length) return ''
  return lines[Math.floor(Math.random() * lines.length)]
}

// ─── 响应式状态 ───
const currentState = ref<PetState>(PetState.IDLE)
const clickCount = ref(0)
const isAnimating = ref(false)

// 气泡
const speechText = ref('')
const showSpeech = ref(false)
let speechTimer: ReturnType<typeof setTimeout> | null = null

const showBubble = (text: string, duration = 2000) => {
  if (!text) return
  speechText.value = text
  showSpeech.value = true
  if (speechTimer) clearTimeout(speechTimer)
  speechTimer = setTimeout(() => {
    showSpeech.value = false
  }, duration)
}

const showStateBubble = (state: PetState, duration = 2000) => {
  showBubble(pickSpeech(state), duration)
}

// 情绪粒子
const particles = ref<{ id: number; emoji: string; x: number; y: number }[]>([])
let particleId = 0

const spawnParticles = (emoji: string, count = 3) => {
  for (let i = 0; i < count; i++) {
    const id = particleId++
    particles.value.push({
      id,
      emoji,
      x: (Math.random() - 0.5) * 40,
      y: -Math.random() * 10,
    })
    setTimeout(() => {
      particles.value = particles.value.filter((p) => p.id !== id)
    }, 1000)
  }
}

// 右键菜单
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })

// 图片淡入淡出
const displayedImage = ref(stateImageMap[PetState.IDLE])
const imageReady = ref(true)
const currentImage = computed(() => stateImageMap[currentState.value])

watch(currentImage, (newSrc) => {
  if (newSrc === displayedImage.value) return
  imageReady.value = false
  const img = new Image()
  img.onload = () => {
    displayedImage.value = newSrc
    requestAnimationFrame(() => {
      imageReady.value = true
    })
  }
  img.src = newSrc
})

// 拖拽
const isDragging = ref(false)
const hasMoved = ref(false)
const position = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })
const dragStartPos = ref({ x: 0, y: 0 })
const DRAG_THRESHOLD = 5

// 计时器
const IDLE_TIMEOUT = 10000
let idleTimer: ReturnType<typeof setTimeout> | null = null
let stateResetTimer: ReturnType<typeof setTimeout> | null = null
let randomIdleBehaviorTimer: ReturnType<typeof setTimeout> | null = null

// ─── 工具函数 ───
const preloadImages = () => {
  const urls = new Set(Object.values(stateImageMap))
  for (const url of urls) {
    const img = new Image()
    img.src = url
  }
}

const PET_SIZE = 80
const EDGE_SNAP = 20

const clampPosition = (pos: { x: number; y: number }) => ({
  x: Math.max(-PET_SIZE / 2, Math.min(pos.x, window.innerWidth - PET_SIZE / 2)),
  y: Math.max(0, Math.min(pos.y, window.innerHeight - PET_SIZE / 2)),
})

// 边缘吸附
const snapToEdge = (pos: { x: number; y: number }) => {
  const w = window.innerWidth
  const h = window.innerHeight
  let { x, y } = pos
  // 左右吸附
  if (x < EDGE_SNAP) x = 0
  else if (x > w - PET_SIZE - EDGE_SNAP) x = w - PET_SIZE
  // 上下吸附
  if (y < EDGE_SNAP) y = 0
  else if (y > h - PET_SIZE - EDGE_SNAP) y = h - PET_SIZE
  return { x, y }
}

const initPosition = () => {
  if (typeof window !== 'undefined') {
    position.value = clampPosition({
      x: window.innerWidth - 100,
      y: window.innerHeight - 100,
    })
  }
}

const handleResize = () => {
  position.value = clampPosition(position.value)
}

// ─── 状态切换辅助 ───
const transitionTo = (state: PetState, duration: number, afterState = PetState.IDLE) => {
  currentState.value = state
  isAnimating.value = true
  if (stateResetTimer) clearTimeout(stateResetTimer)
  stateResetTimer = setTimeout(() => {
    currentState.value = afterState
    isAnimating.value = false
    if (afterState === PetState.IDLE) scheduleRandomIdleBehavior()
  }, duration)
}

// ─── 随机待机行为 ───
const scheduleRandomIdleBehavior = () => {
  if (randomIdleBehaviorTimer) clearTimeout(randomIdleBehaviorTimer)
  const delay = 5000 + Math.random() * 7000
  randomIdleBehaviorTimer = setTimeout(() => {
    if (currentState.value !== PetState.IDLE) return
    const behaviors = [PetState.THINKING, PetState.HAPPY] as const
    const picked = behaviors[Math.floor(Math.random() * behaviors.length)]
    currentState.value = picked
    showStateBubble(picked, 2500)
    if (picked === PetState.HAPPY) spawnParticles('✨', 2)
    stateResetTimer = setTimeout(() => {
      currentState.value = PetState.IDLE
      scheduleRandomIdleBehavior()
    }, 3000)
  }, delay)
}

// ─── 全局 mousemove 节流 ───
let lastIdleReset = 0
const handleGlobalMouseMove = () => {
  const now = Date.now()
  if (now - lastIdleReset < 200) return
  lastIdleReset = now
  resetIdleTimer()
}

// ─── 滚动检测 ───
let lastScrollY = 0
let lastScrollTime = 0
let scrollSpeedAccum = 0

const handleScroll = () => {
  const now = Date.now()
  const dt = now - lastScrollTime
  if (dt < 50) return // 节流
  const dy = Math.abs(window.scrollY - lastScrollY)
  const speed = (dy / Math.max(dt, 1)) * 1000 // px/s

  lastScrollY = window.scrollY
  lastScrollTime = now

  // 累积速度，超过阈值触发晕眩
  if (speed > 2000) scrollSpeedAccum += speed
  else scrollSpeedAccum = Math.max(0, scrollSpeedAccum - 500)

  if (scrollSpeedAccum > 5000 && currentState.value === PetState.IDLE && !isDragging.value) {
    scrollSpeedAccum = 0
    transitionTo(PetState.DIZZY, 2000)
    showStateBubble(PetState.DIZZY, 2000)
    spawnParticles('💫', 2)
  }
}

// ─── 挂机计时器 ───
const resetIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer)

  if (currentState.value === PetState.SLEEP) {
    transitionTo(PetState.WAKE, 500)
    showStateBubble(PetState.WAKE, 1500)
  }

  idleTimer = setTimeout(() => {
    if (currentState.value === PetState.IDLE || currentState.value === PetState.HOVER) {
      currentState.value = PetState.SLEEP
      showStateBubble(PetState.SLEEP, 3000)
      if (randomIdleBehaviorTimer) clearTimeout(randomIdleBehaviorTimer)
    }
  }, IDLE_TIMEOUT)
}

// ─── 交互事件 ───
const handleMouseEnter = () => {
  if (currentState.value === PetState.SLEEP || isDragging.value) return
  if (currentState.value !== PetState.IDLE) return
  currentState.value = PetState.HOVER
  showStateBubble(PetState.HOVER, 1500)
  resetIdleTimer()
}

const handleMouseLeave = () => {
  if (currentState.value === PetState.SLEEP || isDragging.value) return
  if (currentState.value === PetState.HOVER) currentState.value = PetState.IDLE
  showContextMenu.value = false
  resetIdleTimer()
}

const getEventPos = (e: MouseEvent | TouchEvent) => {
  const touch = 'touches' in e ? e.touches?.[0] : null
  return {
    x: touch?.clientX ?? (e instanceof MouseEvent ? e.clientX : 0),
    y: touch?.clientY ?? (e instanceof MouseEvent ? e.clientY : 0),
  }
}

// 单击
const handleClick = () => {
  if (hasMoved.value || showContextMenu.value) return

  if (currentState.value === PetState.SLEEP) {
    transitionTo(PetState.WAKE, 500)
    showStateBubble(PetState.WAKE, 1500)
    resetIdleTimer()
    return
  }

  clickCount.value++

  if (clickCount.value >= 3) {
    transitionTo(PetState.ANGRY, 1500)
    showStateBubble(PetState.ANGRY, 2000)
    spawnParticles('💢', 3)
    clickCount.value = 0
  } else {
    transitionTo(PetState.CLICK, 600)
    showStateBubble(PetState.CLICK, 1200)
  }
  resetIdleTimer()
}

// 双击 → 摸头
const handleDblClick = () => {
  if (isDragging.value) return
  // 取消单击的状态重置
  if (stateResetTimer) clearTimeout(stateResetTimer)
  clickCount.value = 0
  transitionTo(PetState.PAT, 2000)
  showStateBubble(PetState.PAT, 2000)
  spawnParticles('❤️', 4)
  resetIdleTimer()
}

// 右键菜单
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  showContextMenu.value = true
  // 菜单定位：相对于宠物容器
  contextMenuPos.value = { x: e.offsetX, y: e.offsetY }
}

const menuActions = {
  pat() {
    showContextMenu.value = false
    transitionTo(PetState.PAT, 2000)
    showStateBubble(PetState.PAT, 2000)
    spawnParticles('❤️', 4)
    resetIdleTimer()
  },
  feed() {
    showContextMenu.value = false
    transitionTo(PetState.EAT, 2000)
    showStateBubble(PetState.EAT, 2000)
    spawnParticles('🐟', 3)
    resetIdleTimer()
  },
  hide() {
    showContextMenu.value = false
    settings.value.showDeskPet = false
  },
}

// ─── 拖拽 ───
const handlePointerDown = (e: MouseEvent | TouchEvent) => {
  if (showContextMenu.value) {
    showContextMenu.value = false
    return
  }
  const pos = getEventPos(e)
  isDragging.value = true
  hasMoved.value = false
  dragStartPos.value = { x: pos.x, y: pos.y }
  dragOffset.value = {
    x: pos.x - position.value.x,
    y: pos.y - position.value.y,
  }
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
  document.addEventListener('touchmove', handleDragMove, { passive: false })
  document.addEventListener('touchend', handleDragEnd)
  e.preventDefault()
}

const handleDragMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return
  const pos = getEventPos(e)
  const dx = pos.x - dragStartPos.value.x
  const dy = pos.y - dragStartPos.value.y

  if (!hasMoved.value && Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
    hasMoved.value = true
    if (currentState.value === PetState.SLEEP) {
      currentState.value = PetState.WAKE
      setTimeout(() => {
        currentState.value = PetState.DRAG
      }, 300)
    } else {
      currentState.value = PetState.DRAG
    }
  }

  if (hasMoved.value) {
    position.value = clampPosition({
      x: pos.x - dragOffset.value.x,
      y: pos.y - dragOffset.value.y,
    })
  }
  if ('touches' in e) e.preventDefault()
}

const handleDragEnd = () => {
  const wasDragging = hasMoved.value
  isDragging.value = false
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('touchmove', handleDragMove)
  document.removeEventListener('touchend', handleDragEnd)
  if (wasDragging) {
    // 边缘吸附
    position.value = snapToEdge(position.value)
    currentState.value = PetState.IDLE
    scheduleRandomIdleBehavior()
  }
  resetIdleTimer()
}

// 点击计数重置
let clickResetTimer: ReturnType<typeof setTimeout> | null = null
watch(clickCount, () => {
  if (clickResetTimer) clearTimeout(clickResetTimer)
  clickResetTimer = setTimeout(() => {
    if (currentState.value !== PetState.ANGRY) clickCount.value = 0
  }, 500)
})

// 全局点击关闭菜单
const handleGlobalClick = () => {
  if (showContextMenu.value) showContextMenu.value = false
}

// ─── 生命周期 ───
onMounted(() => {
  preloadImages()
  initPosition()
  resetIdleTimer()
  scheduleRandomIdleBehavior()
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('click', handleGlobalClick)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })

  // 首次加载时间问候
  nextTick(() => {
    setTimeout(() => {
      showBubble(getTimeGreeting(), 3000)
    }, 800)
  })
})

onUnmounted(() => {
  if (idleTimer) clearTimeout(idleTimer)
  if (stateResetTimer) clearTimeout(stateResetTimer)
  if (clickResetTimer) clearTimeout(clickResetTimer)
  if (randomIdleBehaviorTimer) clearTimeout(randomIdleBehaviorTimer)
  if (speechTimer) clearTimeout(speechTimer)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('click', handleGlobalClick)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <Transition name="pet-fade">
    <div
      v-if="visible"
      class="desk-pet"
      :class="[
        `desk-pet--${currentState}`,
        {
          'desk-pet--animating': isAnimating,
          'desk-pet--dragging': hasMoved,
          'desk-pet--no-anim': !shouldAnimate,
        },
      ]"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }"
      role="img"
      :aria-label="t('deskPet.ariaLabel', { state: currentState })"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @mousedown="handlePointerDown"
      @touchstart="handlePointerDown"
      @click.stop="handleClick"
      @dblclick.stop="handleDblClick"
      @contextmenu.stop="handleContextMenu"
    >
      <img
        :src="displayedImage"
        :alt="`Pet ${currentState}`"
        class="desk-pet__image"
        :class="{ 'desk-pet__image--ready': imageReady }"
        draggable="false"
      />

      <!-- 情绪粒子 -->
      <TransitionGroup name="particle" tag="div" class="desk-pet__particles">
        <span
          v-for="p in particles"
          :key="p.id"
          class="desk-pet__particle"
          :style="{ '--px': `${p.x}px`, '--py': `${p.y}px` }"
        >
          {{ p.emoji }}
        </span>
      </TransitionGroup>

      <!-- 气泡台词 -->
      <Transition name="bubble">
        <span v-if="showSpeech" class="desk-pet__bubble">{{ speechText }}</span>
      </Transition>

      <!-- 睡眠 Zzz -->
      <span v-if="currentState === PetState.SLEEP" class="desk-pet__zzz">Zzz</span>

      <!-- 右键菜单 -->
      <Transition name="menu">
        <div
          v-if="showContextMenu"
          class="desk-pet__menu"
          :style="{ left: `${contextMenuPos.x}px`, top: `${contextMenuPos.y}px` }"
          @click.stop
        >
          <button class="desk-pet__menu-item" @click="menuActions.pat()">
            {{ t('deskPet.menu.pat') }}
          </button>
          <button class="desk-pet__menu-item" @click="menuActions.feed()">
            {{ t('deskPet.menu.feed') }}
          </button>
          <div class="desk-pet__menu-divider" />
          <button
            class="desk-pet__menu-item desk-pet__menu-item--danger"
            @click="menuActions.hide()"
          >
            {{ t('deskPet.menu.hide') }}
          </button>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
/* ═══ 容器 ═══ */
.desk-pet {
  position: fixed;
  width: clamp(3rem, 8vw, 5rem);
  aspect-ratio: 1;
  z-index: 9999;
  cursor: grab;
  user-select: none;
  touch-action: none;
  will-change: transform;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.desk-pet--dragging {
  cursor: grabbing;
  transition: none;
}

.desk-pet--no-anim,
.desk-pet--no-anim .desk-pet__image,
.desk-pet--no-anim .desk-pet__zzz,
.desk-pet--no-anim .desk-pet__particle {
  animation: none !important;
  transition: none !important;
}

/* ═══ 图片 ═══ */
.desk-pet__image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.desk-pet__image--ready {
  opacity: 1;
}

/* ═══ 气泡 ═══ */
.desk-pet__bubble {
  position: absolute;
  bottom: calc(100% + 0.25rem);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface, #fff);
  color: var(--color-text-primary, #333);
  font-size: 0.7rem;
  line-height: 1.3;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
}

.desk-pet__bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 0.3rem solid transparent;
  border-top-color: var(--color-surface, #fff);
}

.bubble-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.bubble-leave-active {
  transition: opacity 0.15s ease;
}
.bubble-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(0.25rem);
}
.bubble-leave-to {
  opacity: 0;
}

/* ═══ 情绪粒子 ═══ */
.desk-pet__particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.desk-pet__particle {
  position: absolute;
  top: 0;
  left: 50%;
  font-size: 0.85rem;
  animation: particle-rise 1s ease-out forwards;
  --px: 0px;
  --py: 0px;
}

@keyframes particle-rise {
  0% {
    opacity: 1;
    transform: translate(var(--px), var(--py));
  }
  100% {
    opacity: 0;
    transform: translate(calc(var(--px) * 1.5), calc(var(--py) - 2.5rem));
  }
}

.particle-enter-active {
  transition: opacity 0.1s ease;
}
.particle-leave-active {
  transition: opacity 0.3s ease;
}
.particle-enter-from,
.particle-leave-to {
  opacity: 0;
}

/* ═══ 右键菜单 ═══ */
.desk-pet__menu {
  position: absolute;
  background: var(--color-surface, #fff);
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 0.25rem 0;
  min-width: 7rem;
  z-index: 10;
  cursor: default;
}

.desk-pet__menu-item {
  display: block;
  width: 100%;
  padding: 0.35rem 0.6rem;
  border: none;
  background: none;
  font-size: 0.75rem;
  color: var(--color-text-primary, #333);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}

.desk-pet__menu-item:hover {
  background: var(--color-surface-2, rgba(0, 0, 0, 0.04));
}

.desk-pet__menu-item--danger {
  color: var(--color-error, #ef4444);
}

.desk-pet__menu-divider {
  height: 1px;
  margin: 0.2rem 0.4rem;
  background: var(--color-divider, #e2e8f0);
}

.menu-enter-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.menu-leave-active {
  transition: opacity 0.1s ease;
}
.menu-enter-from {
  opacity: 0;
  transform: scale(0.9);
}
.menu-leave-to {
  opacity: 0;
}

/* ═══ 显示/隐藏 ═══ */
.pet-fade-enter-active,
.pet-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.pet-fade-enter-from,
.pet-fade-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

/* ═══ 状态动画 ═══ */
.desk-pet--idle {
  animation: breathe 3s ease-in-out infinite;
}
@keyframes breathe {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-0.15rem);
  }
}

.desk-pet--hover {
  animation: tilt 0.5s ease-in-out;
}
@keyframes tilt {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-5deg);
  }
  75% {
    transform: rotate(5deg);
  }
}

.desk-pet--click {
  animation: bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
@keyframes bounce {
  0% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(0.1rem);
  }
  50% {
    transform: translateY(-1.5rem);
  }
  70% {
    transform: translateY(0);
  }
  85% {
    transform: translateY(-0.4rem);
  }
  100% {
    transform: translateY(0);
  }
}

.desk-pet--angry {
  animation: shake 0.4s ease-in-out infinite;
}
@keyframes shake {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }
  20% {
    transform: translateX(-0.25rem) rotate(-3deg);
  }
  40% {
    transform: translateX(0.25rem) rotate(3deg);
  }
  60% {
    transform: translateX(-0.15rem) rotate(-2deg);
  }
  80% {
    transform: translateX(0.15rem) rotate(2deg);
  }
}

.desk-pet--sleep {
  animation: sleep-breathe 4s ease-in-out infinite;
  filter: brightness(0.85);
}
@keyframes sleep-breathe {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-0.1rem);
  }
}

.desk-pet--wake {
  animation: wake 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
@keyframes wake {
  0% {
    transform: translateY(0) rotate(0deg);
    filter: brightness(0.85);
  }
  50% {
    transform: translateY(-0.5rem) rotate(-5deg);
    filter: brightness(1);
  }
  100% {
    transform: translateY(0) rotate(0deg);
    filter: brightness(1);
  }
}

.desk-pet--happy {
  animation: happy-bounce 0.8s ease-in-out infinite;
}
@keyframes happy-bounce {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-0.3rem) rotate(3deg);
  }
  75% {
    transform: translateY(-0.3rem) rotate(-3deg);
  }
}

.desk-pet--thinking {
  animation: think-sway 2s ease-in-out infinite;
}
@keyframes think-sway {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(0.2rem);
  }
}

.desk-pet--pat {
  animation: pat-wiggle 0.4s ease-in-out infinite;
}
@keyframes pat-wiggle {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-4deg) translateY(-0.1rem);
  }
  75% {
    transform: rotate(4deg) translateY(-0.1rem);
  }
}

.desk-pet--eat {
  animation: eat-chomp 0.5s ease-in-out infinite;
}
@keyframes eat-chomp {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(0.15rem);
  }
}

.desk-pet--dizzy {
  animation: dizzy-spin 0.8s ease-in-out infinite;
}
@keyframes dizzy-spin {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(8deg);
  }
  75% {
    transform: rotate(-8deg);
  }
}

/* Zzz */
.desk-pet__zzz {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--text-secondary, #666);
  animation: zzz-float 2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes zzz-float {
  0%,
  100% {
    opacity: 0.6;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-0.5rem);
  }
}

/* ═══ 减少动画 ═══ */
@media (prefers-reduced-motion: reduce) {
  .desk-pet,
  .desk-pet--idle,
  .desk-pet--hover,
  .desk-pet--click,
  .desk-pet--angry,
  .desk-pet--sleep,
  .desk-pet--wake,
  .desk-pet--happy,
  .desk-pet--thinking,
  .desk-pet--pat,
  .desk-pet--eat,
  .desk-pet--dizzy {
    animation: none;
    transition: none;
  }
  .desk-pet__image {
    opacity: 1;
    transition: none;
  }
}
</style>
