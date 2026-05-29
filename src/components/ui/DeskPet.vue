<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores'
import { prefersReducedMotion } from '@/utils/performance'
import {
  CTA_ATTENTION_COOLDOWN_MS,
  DEFAULT_PET_EDGE_GAP,
  DEFAULT_POSITION_OBSTACLE_SELECTORS,
  DESK_PET_POSITION_STORAGE_KEY,
  DRAG_THRESHOLD,
  EDGE_SNAP,
  HERO_BUTTON_SELECTOR,
  HERO_REACTION_COOLDOWN_MS,
  IDLE_BEHAVIOR_JITTER_MS,
  IDLE_BEHAVIOR_MIN_MS,
  IDLE_TIMEOUT,
  PET_SIZE,
  SCROLL_DIZZY_COOLDOWN_MS,
  WORKFLOW_REACTION_COOLDOWN_MS,
} from './desk-pet/config'
import {
  DEFAULT_DESK_PET_SETTINGS,
  createDeskPetParticleBurst,
  findClosestDeskPetElement,
  getDeskPetCareActionPlan,
  getDeskPetEventPosition,
  getDeskPetGreetingKey,
  readStoredDeskPetPosition,
  resolveDeskPetDefaultPlacementInsets,
  resolveDeskPetHeroPeekPosition,
  resolveDeskPetHeroPerchPosition,
  resolveDeskPetLookOffset,
  resolveDeskPetRestState,
  writeStoredDeskPetPosition,
} from './desk-pet/interaction'
import { DESK_PET_AUX_PRELOAD_STATES, PET_STATE_IMAGE_MAP, PetState } from './desk-pet/petStates'
import {
  clampDeskPetPeekPosition,
  clampDeskPetPosition,
  resolveDeskPetDefaultPosition,
  snapDeskPetToEdge,
  type DeskPetRect,
} from './desk-pet/positioning'
import { createDeskPetWorkflowReactions } from './desk-pet/useDeskPetWorkflowReactions'

const { t, tm } = useI18n()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const props = withDefaults(
  defineProps<{
    autoHomeMode?: boolean
  }>(),
  {
    autoHomeMode: false,
  }
)

const deskPetSettings = computed(() => settings.value.deskPet ?? DEFAULT_DESK_PET_SETTINGS)
const visible = computed(() => deskPetSettings.value.enabled || props.autoHomeMode)
const shouldAnimate = computed(
  () =>
    settings.value.enableAnimations &&
    settings.value.animationIntensity !== 'none' &&
    !prefersReducedMotion()
)

// 时间问候
const getTimeGreeting = (): string => {
  return t(getDeskPetGreetingKey(new Date().getHours()))
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
const lookOffset = ref({ x: 0, y: 0 })

// 气泡
const speechText = ref('')
const showSpeech = ref(false)
let speechTimer: ReturnType<typeof setTimeout> | null = null

const showBubble = (text: string, duration = 2000) => {
  if (!deskPetSettings.value.speechEnabled) return
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

watch(
  () => deskPetSettings.value.speechEnabled,
  (enabled) => {
    if (enabled) return
    showSpeech.value = false
    if (speechTimer) {
      clearTimeout(speechTimer)
      speechTimer = null
    }
  }
)

// 情绪粒子
const particles = ref<{ id: number; emoji: string; x: number; y: number }[]>([])
let particleId = 0
const particleTimers = new Map<number, ReturnType<typeof setTimeout>>()

const spawnParticles = (emoji: string, count = 3) => {
  const burst = createDeskPetParticleBurst({ emoji, count, startId: particleId })
  particleId = burst.nextId

  for (const particle of burst.particles) {
    particles.value.push(particle)
    const timer = setTimeout(() => {
      particleTimers.delete(particle.id)
      particles.value = particles.value.filter((p) => p.id !== particle.id)
    }, 1000)
    particleTimers.set(particle.id, timer)
  }
}

function clearParticleTimers() {
  for (const timer of particleTimers.values()) {
    clearTimeout(timer)
  }
  particleTimers.clear()
}

// 右键菜单
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })

// 图片淡入淡出
const displayedImage = ref(PET_STATE_IMAGE_MAP[PetState.IDLE])
const imageReady = ref(true)
const currentImage = computed(() => PET_STATE_IMAGE_MAP[currentState.value])
let pendingImage: HTMLImageElement | null = null
let imageReadyFrame: number | null = null

function clearPendingImageLoad() {
  if (pendingImage) {
    pendingImage.onload = null
    pendingImage.onerror = null
    pendingImage = null
  }
  if (imageReadyFrame !== null) {
    cancelAnimationFrame(imageReadyFrame)
    imageReadyFrame = null
  }
}

watch(currentImage, (newSrc) => {
  if (newSrc === displayedImage.value) return
  clearPendingImageLoad()
  imageReady.value = false
  const img = new Image()
  pendingImage = img
  img.onload = () => {
    if (pendingImage !== img) return
    pendingImage = null
    displayedImage.value = newSrc
    imageReadyFrame = requestAnimationFrame(() => {
      imageReadyFrame = null
      imageReady.value = true
    })
  }
  img.onerror = () => {
    if (pendingImage === img) pendingImage = null
  }
  img.src = newSrc
})

// 拖拽
const isDragging = ref(false)
const hasMoved = ref(false)
const position = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })
const dragStartPos = ref({ x: 0, y: 0 })

// 计时器
let idleTimer: ReturnType<typeof setTimeout> | null = null
let stateResetTimer: ReturnType<typeof setTimeout> | null = null
let randomIdleBehaviorTimer: ReturnType<typeof setTimeout> | null = null
let peekReturnTimer: ReturnType<typeof setTimeout> | null = null
let heroIntroTimer: ReturnType<typeof setTimeout> | null = null
let heroReactionUnlockTimer: ReturnType<typeof setTimeout> | null = null
let ctaAttentionUnlockTimer: ReturnType<typeof setTimeout> | null = null
let dragStateTimer: ReturnType<typeof setTimeout> | null = null
let greetingTimer: ReturnType<typeof setTimeout> | null = null
let pointerTrackRaf: number | null = null
let movementRaf: number | null = null
let movementToken = 0
let hasPlayedHeroIntro = false
let heroReactionLocked = false
let ctaAttentionLocked = false
let lastDizzyAt = 0
let isDisposed = false

const petStyle = computed<Record<string, string>>(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  '--desk-pet-scale': `${deskPetSettings.value.scale}`,
  '--pet-look-x': `${lookOffset.value.x}px`,
  '--pet-look-y': `${lookOffset.value.y}px`,
}))

// ─── 工具函数 ───
const preloadImages = () => {
  const urls = new Set(DESK_PET_AUX_PRELOAD_STATES.map((state) => PET_STATE_IMAGE_MAP[state]))
  for (const url of urls) {
    const img = new Image()
    img.src = url
  }
}
let hasPreloadedAuxImages = false
let delayedPreloadTimer: ReturnType<typeof setTimeout> | null = null

function scheduleAuxImagePreload() {
  if (hasPreloadedAuxImages || !visible.value) return
  hasPreloadedAuxImages = true
  delayedPreloadTimer = setTimeout(() => {
    preloadImages()
    delayedPreloadTimer = null
  }, 1500)
}

watch(visible, (isVisible) => {
  if (isVisible) {
    scheduleAuxImagePreload()
    if (heroIntroTimer) clearTimeout(heroIntroTimer)
    heroIntroTimer = setTimeout(() => {
      playHeroIntroIfNeeded()
    }, 500)
    return
  }
  stopMovement()
  lookOffset.value = { x: 0, y: 0 }
})

const getViewport = () => ({ width: window.innerWidth, height: window.innerHeight })
const clampPosition = (pos: { x: number; y: number }) =>
  clampDeskPetPosition(pos, getViewport(), PET_SIZE)

const clampPeekPosition = (pos: { x: number; y: number }) =>
  clampDeskPetPeekPosition(pos, getViewport(), PET_SIZE)

const snapToEdge = (pos: { x: number; y: number }) =>
  snapDeskPetToEdge(pos, getViewport(), PET_SIZE, EDGE_SNAP)

const preventDefaultIfCancelable = (e: Event) => {
  if (e.cancelable) e.preventDefault()
}

const readSavedPosition = (): { x: number; y: number } | null => {
  if (typeof window === 'undefined') return null
  return readStoredDeskPetPosition(window.localStorage, DESK_PET_POSITION_STORAGE_KEY)
}

const savePosition = (pos: { x: number; y: number }) => {
  if (typeof window === 'undefined') return
  writeStoredDeskPetPosition(window.localStorage, DESK_PET_POSITION_STORAGE_KEY, pos)
}

const getVisibleRect = (selector: string): DOMRect | null => {
  if (typeof window === 'undefined') return null
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) return null

  const styles = window.getComputedStyle(element)
  if (styles.display === 'none' || styles.visibility === 'hidden') return null

  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  return rect
}

const getDefaultPlacementInsets = () => {
  const navbarRect = getVisibleRect('.navbar')
  const mobileNavRect = getVisibleRect('.app-mobile-dock') ?? getVisibleRect('.mobile-nav')

  return resolveDeskPetDefaultPlacementInsets({
    navbarRect,
    mobileNavRect,
    viewportHeight: window.innerHeight,
    edgeGap: DEFAULT_PET_EDGE_GAP,
  })
}

const getDefaultPosition = () => {
  const petSize = PET_SIZE * deskPetSettings.value.scale
  const insets = getDefaultPlacementInsets()
  const obstacleRects = DEFAULT_POSITION_OBSTACLE_SELECTORS.map(getVisibleRect).filter(
    (rect): rect is DOMRect => rect !== null
  ) as DeskPetRect[]

  return resolveDeskPetDefaultPosition({
    viewport: getViewport(),
    petSize,
    boundaryPetSize: PET_SIZE,
    insets,
    obstacleRects,
  })
}

const isHeroTarget = (target: EventTarget | null) =>
  findClosestDeskPetElement<HTMLElement>(target, HERO_BUTTON_SELECTOR)

const getHeroButton = () => document.querySelector<HTMLElement>(HERO_BUTTON_SELECTOR)

const lockHeroReaction = () => {
  heroReactionLocked = true
  if (heroReactionUnlockTimer) clearTimeout(heroReactionUnlockTimer)
  heroReactionUnlockTimer = setTimeout(() => {
    heroReactionLocked = false
    heroReactionUnlockTimer = null
  }, HERO_REACTION_COOLDOWN_MS)
}

const lockCtaAttention = () => {
  ctaAttentionLocked = true
  if (ctaAttentionUnlockTimer) clearTimeout(ctaAttentionUnlockTimer)
  ctaAttentionUnlockTimer = setTimeout(() => {
    ctaAttentionLocked = false
    ctaAttentionUnlockTimer = null
  }, CTA_ATTENTION_COOLDOWN_MS)
}

const stopMovement = () => {
  movementToken += 1
  if (movementRaf !== null) {
    cancelAnimationFrame(movementRaf)
    movementRaf = null
  }
}

const animateToPosition = (
  targetPos: { x: number; y: number },
  options: { duration?: number; allowPeekOverflow?: boolean } = {}
) => {
  const { duration = 700, allowPeekOverflow = false } = options
  stopMovement()

  const token = movementToken
  const startPos = { ...position.value }
  const target = allowPeekOverflow ? clampPeekPosition(targetPos) : clampPosition(targetPos)
  const startAt = performance.now()

  return new Promise<void>((resolve) => {
    const step = (now: number) => {
      if (token !== movementToken) {
        resolve()
        return
      }
      const progress = Math.min((now - startAt) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      const x = startPos.x + (target.x - startPos.x) * eased
      const baseY = startPos.y + (target.y - startPos.y) * eased
      position.value = allowPeekOverflow
        ? clampPeekPosition({ x, y: baseY })
        : clampPosition({ x, y: baseY })

      if (progress < 1) {
        movementRaf = requestAnimationFrame(step)
      } else {
        movementRaf = null
        resolve()
      }
    }
    movementRaf = requestAnimationFrame(step)
  })
}

const getHeroPerchPosition = (heroBtn: HTMLElement) => {
  const rect = heroBtn.getBoundingClientRect()
  return clampPosition(resolveDeskPetHeroPerchPosition(rect))
}

const getPeekPositionFromHero = (heroBtn: HTMLElement) => {
  const rect = heroBtn.getBoundingClientRect()
  return clampPeekPosition(
    resolveDeskPetHeroPeekPosition({
      heroRect: rect,
      viewportWidth: window.innerWidth,
    })
  )
}

const isPetTarget = (target: EventTarget | null) => findClosestDeskPetElement(target, '.desk-pet')

const setLookOffsetByPointer = (clientX: number, clientY: number) => {
  lookOffset.value = resolveDeskPetLookOffset({
    clientX,
    clientY,
    position: position.value,
    sensitivity: deskPetSettings.value.followSensitivity,
    isDragging: isDragging.value,
    showContextMenu: showContextMenu.value,
  })
}

const perchOnHeroButton = async (heroBtn: HTMLElement, fromIntro = false) => {
  if (!shouldAnimate.value && fromIntro) return
  if (!visible.value || isDragging.value || heroReactionLocked) return
  const fromState = currentState.value
  const startState = fromIntro ? PetState.ENTER : PetState.TRACK
  currentState.value = startState
  isAnimating.value = true
  await animateToPosition(getHeroPerchPosition(heroBtn), {
    duration: fromIntro ? 860 : 520,
  })
  if (!visible.value || isDragging.value) return
  currentState.value = PetState.PERCH
  isAnimating.value = false
  if (fromIntro || fromState === PetState.PEEK) {
    showStateBubble(PetState.PERCH, 2200)
  }
}

const schedulePeekIdle = () => {
  if (peekReturnTimer) clearTimeout(peekReturnTimer)
  peekReturnTimer = setTimeout(
    () => {
      if (currentState.value !== PetState.PEEK || isDragging.value) return
      currentState.value = PetState.IDLE
      scheduleRandomIdleBehavior()
    },
    3600 + Math.random() * 1800
  )
}

const reactToHeroButtonClick = async (heroBtn: HTMLElement) => {
  if (!deskPetSettings.value.autoHeroInteraction) return
  if (!visible.value || isDragging.value || heroReactionLocked) return
  lockHeroReaction()
  if (peekReturnTimer) clearTimeout(peekReturnTimer)
  currentState.value = PetState.LEAP
  isAnimating.value = true
  showStateBubble(PetState.LEAP, 1800)
  spawnParticles('✨', 3)
  await animateToPosition(getPeekPositionFromHero(heroBtn), {
    duration: 760,
    allowPeekOverflow: true,
  })
  if (!visible.value || isDragging.value) return
  currentState.value = PetState.PEEK
  isAnimating.value = false
  showStateBubble(PetState.PEEK, 2200)
  schedulePeekIdle()
}

const canReactToHeroTargets = () => shouldAnimate.value && deskPetSettings.value.autoHeroInteraction

const playHeroIntroIfNeeded = () => {
  if (!props.autoHomeMode) return
  if (!canReactToHeroTargets()) return
  if (hasPlayedHeroIntro || !visible.value) return
  const heroBtn = getHeroButton()
  if (!heroBtn) return
  hasPlayedHeroIntro = true
  void perchOnHeroButton(heroBtn, true)
}

const initPosition = () => {
  if (typeof window === 'undefined') return
  const saved = readSavedPosition()
  if (saved) {
    position.value = clampPosition(saved)
    return
  }
  position.value = getDefaultPosition()
}

const handleResize = () => {
  position.value = clampPosition(position.value)
  if (currentState.value === PetState.PERCH) {
    const heroBtn = getHeroButton()
    if (heroBtn) {
      position.value = getHeroPerchPosition(heroBtn)
    }
  }
}

// ─── 状态切换辅助 ───
const transitionTo = (state: PetState, duration: number, afterState = PetState.IDLE) => {
  currentState.value = state
  isAnimating.value = true
  if (stateResetTimer) clearTimeout(stateResetTimer)
  stateResetTimer = setTimeout(() => {
    currentState.value = afterState
    isAnimating.value = false
    if (afterState === PetState.IDLE || afterState === PetState.PERCH) scheduleRandomIdleBehavior()
  }, duration)
}

// ─── 随机待机行为 ───
const scheduleRandomIdleBehavior = () => {
  if (randomIdleBehaviorTimer) clearTimeout(randomIdleBehaviorTimer)
  if (!shouldAnimate.value) return
  const delay = IDLE_BEHAVIOR_MIN_MS + Math.random() * IDLE_BEHAVIOR_JITTER_MS
  randomIdleBehaviorTimer = setTimeout(() => {
    if (currentState.value !== PetState.IDLE && currentState.value !== PetState.PERCH) return
    const restState = currentState.value === PetState.PERCH ? PetState.PERCH : PetState.IDLE
    const behaviors = [
      PetState.BLINK,
      PetState.THINKING,
      PetState.HAPPY,
      PetState.BORED,
      PetState.HUNGRY,
      PetState.FOCUSED,
      PetState.EXCITED,
      PetState.TIRED,
    ] as const
    const picked = behaviors[Math.floor(Math.random() * behaviors.length)]
    currentState.value = picked
    if (picked !== PetState.BLINK) {
      showStateBubble(picked, 2500)
    }
    if (picked === PetState.HAPPY || picked === PetState.EXCITED) spawnParticles('*', 2)
    if (picked === PetState.HUNGRY) spawnParticles('+', 2)
    stateResetTimer = setTimeout(
      () => {
        currentState.value = restState
        scheduleRandomIdleBehavior()
      },
      picked === PetState.BLINK ? 900 : 3000
    )
  }, delay)
}

// ─── 全局 mousemove 节流 ───
let lastIdleReset = 0
const handleGlobalMouseMove = (e: MouseEvent) => {
  if (pointerTrackRaf !== null) cancelAnimationFrame(pointerTrackRaf)
  const { clientX, clientY } = e
  pointerTrackRaf = requestAnimationFrame(() => {
    pointerTrackRaf = null
    setLookOffsetByPointer(clientX, clientY)
  })

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
  if (!shouldAnimate.value) return
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

  if (
    scrollSpeedAccum > 5000 &&
    currentState.value === PetState.IDLE &&
    !isDragging.value &&
    now - lastDizzyAt > SCROLL_DIZZY_COOLDOWN_MS
  ) {
    scrollSpeedAccum = 0
    lastDizzyAt = now
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
    if (
      currentState.value === PetState.IDLE ||
      currentState.value === PetState.HOVER ||
      currentState.value === PetState.PERCH
    ) {
      currentState.value = PetState.SLEEP
      showStateBubble(PetState.SLEEP, 3000)
      if (randomIdleBehaviorTimer) clearTimeout(randomIdleBehaviorTimer)
    }
  }, IDLE_TIMEOUT)
}

const getRestState = () => resolveDeskPetRestState(currentState.value)

const workflowReactions = createDeskPetWorkflowReactions({
  cooldownMs: WORKFLOW_REACTION_COOLDOWN_MS,
  getRestState,
  isDragging: () => isDragging.value,
  isPetTarget,
  isVisible: () => visible.value,
  resetIdleTimer,
  shouldAnimate: () => shouldAnimate.value,
  showStateBubble,
  spawnParticles,
  transitionTo,
})

const hidePet = () => {
  showContextMenu.value = false
  settingsStore.setDeskPet({ enabled: false, dismissedAutoHome: true })
}
let hoverFallbackState: PetState = PetState.IDLE

// ─── 交互事件 ───
const handleMouseEnter = () => {
  if (currentState.value === PetState.SLEEP || isDragging.value) return
  if (currentState.value !== PetState.IDLE && currentState.value !== PetState.PERCH) return
  hoverFallbackState = currentState.value === PetState.PERCH ? PetState.PERCH : PetState.IDLE
  currentState.value = PetState.HOVER
  showStateBubble(PetState.HOVER, 1500)
  resetIdleTimer()
}

const handleMouseLeave = () => {
  if (currentState.value === PetState.SLEEP || isDragging.value) return
  if (currentState.value === PetState.HOVER) currentState.value = hoverFallbackState
  showContextMenu.value = false
  resetIdleTimer()
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
  const restState = getRestState()

  if (clickCount.value >= 3) {
    transitionTo(PetState.ANGRY, 1500, restState)
    showStateBubble(PetState.ANGRY, 2000)
    spawnParticles('💢', 3)
    clickCount.value = 0
  } else {
    transitionTo(PetState.CLICK, 600, restState)
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
  runCareAction('pat')
}

// 右键菜单
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  showContextMenu.value = true
  // 菜单定位：相对于宠物容器
  contextMenuPos.value = { x: e.offsetX, y: e.offsetY }
}

const runCareAction = (action: Parameters<typeof getDeskPetCareActionPlan>[0]) => {
  const plan = getDeskPetCareActionPlan(action)
  showContextMenu.value = false
  transitionTo(plan.state, plan.duration, getRestState())
  showStateBubble(plan.state, plan.bubbleDuration)
  if (plan.particle) spawnParticles(plan.particle.emoji, plan.particle.count)
  resetIdleTimer()
}

const menuActions = {
  pat: () => runCareAction('pat'),
  feed: () => runCareAction('feed'),
  play: () => runCareAction('play'),
  focus: () => runCareAction('focus'),
  rest: () => runCareAction('rest'),
  hide() {
    hidePet()
  },
}

// ─── 拖拽 ───
const handlePointerDown = (e: MouseEvent | TouchEvent) => {
  if (
    findClosestDeskPetElement(e.target, '.desk-pet__close, .desk-pet__menu, .desk-pet__menu-item')
  ) {
    return
  }
  if (showContextMenu.value) {
    showContextMenu.value = false
    return
  }
  stopMovement()
  const pos = getDeskPetEventPosition(e)
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
  preventDefaultIfCancelable(e)
}

const handleDragMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return
  const pos = getDeskPetEventPosition(e)
  const dx = pos.x - dragStartPos.value.x
  const dy = pos.y - dragStartPos.value.y

  if (!hasMoved.value && Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
    hasMoved.value = true
    if (currentState.value === PetState.SLEEP) {
      currentState.value = PetState.WAKE
      if (dragStateTimer) clearTimeout(dragStateTimer)
      dragStateTimer = setTimeout(() => {
        dragStateTimer = null
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
  if ('touches' in e) preventDefaultIfCancelable(e)
}

const handleDragEnd = () => {
  const wasDragging = hasMoved.value
  isDragging.value = false
  if (dragStateTimer) {
    clearTimeout(dragStateTimer)
    dragStateTimer = null
  }
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('touchmove', handleDragMove)
  document.removeEventListener('touchend', handleDragEnd)
  if (wasDragging) {
    // 边缘吸附
    position.value = snapToEdge(position.value)
    savePosition(position.value)
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
const handleGlobalClick = (e: MouseEvent) => {
  if (showContextMenu.value) showContextMenu.value = false
  if (isPetTarget(e.target)) return
  const heroBtn = isHeroTarget(e.target)
  if (heroBtn instanceof HTMLElement && deskPetSettings.value.autoHeroInteraction) {
    void reactToHeroButtonClick(heroBtn)
    return
  }
  // Temporarily disable page-click follow behavior.
  resetIdleTimer()
}

const handleGlobalPointerOver = (e: PointerEvent) => {
  if (!canReactToHeroTargets()) return
  if (!visible.value || isDragging.value || heroReactionLocked || ctaAttentionLocked) return
  const heroBtn = isHeroTarget(e.target)
  if (!(heroBtn instanceof HTMLElement)) return
  lockCtaAttention()
  void perchOnHeroButton(heroBtn)
}

const handleGlobalFocusIn = (e: FocusEvent) => {
  if (!canReactToHeroTargets()) return
  if (!visible.value || isDragging.value || heroReactionLocked || ctaAttentionLocked) return
  const heroBtn = isHeroTarget(e.target)
  if (!(heroBtn instanceof HTMLElement)) return
  lockCtaAttention()
  void perchOnHeroButton(heroBtn)
}

// ─── 生命周期 ───
onMounted(() => {
  isDisposed = false
  scheduleAuxImagePreload()
  initPosition()
  resetIdleTimer()
  scheduleRandomIdleBehavior()
  heroIntroTimer = setTimeout(() => {
    playHeroIntroIfNeeded()
  }, 520)
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('pointerover', handleGlobalPointerOver, { passive: true })
  document.addEventListener('focusin', handleGlobalFocusIn)
  workflowReactions.mount()
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })

  // 首次加载时间问候
  nextTick(() => {
    if (isDisposed) return
    greetingTimer = setTimeout(() => {
      greetingTimer = null
      if (isDisposed) return
      showBubble(getTimeGreeting(), 3000)
    }, 800)
  })
})

onUnmounted(() => {
  isDisposed = true
  stopMovement()
  if (pointerTrackRaf !== null) cancelAnimationFrame(pointerTrackRaf)
  pointerTrackRaf = null
  clearPendingImageLoad()
  clearParticleTimers()
  particles.value = []
  if (delayedPreloadTimer) clearTimeout(delayedPreloadTimer)
  if (idleTimer) clearTimeout(idleTimer)
  if (stateResetTimer) clearTimeout(stateResetTimer)
  if (dragStateTimer) clearTimeout(dragStateTimer)
  if (greetingTimer) clearTimeout(greetingTimer)
  if (clickResetTimer) clearTimeout(clickResetTimer)
  if (randomIdleBehaviorTimer) clearTimeout(randomIdleBehaviorTimer)
  if (speechTimer) clearTimeout(speechTimer)
  if (peekReturnTimer) clearTimeout(peekReturnTimer)
  if (heroIntroTimer) clearTimeout(heroIntroTimer)
  if (heroReactionUnlockTimer) clearTimeout(heroReactionUnlockTimer)
  if (ctaAttentionUnlockTimer) clearTimeout(ctaAttentionUnlockTimer)
  workflowReactions.cleanup()
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('pointerover', handleGlobalPointerOver)
  document.removeEventListener('focusin', handleGlobalFocusIn)
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
      :style="petStyle"
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
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        width="80"
        height="80"
        draggable="false"
      />
      <button
        type="button"
        class="desk-pet__close"
        :aria-label="t('deskPet.close')"
        @mousedown.stop
        @touchstart.stop
        @click.stop="hidePet"
      >
        ×
      </button>

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
      <span v-if="currentState === PetState.SLEEP" class="desk-pet__zzz" aria-hidden="true"
        >Zzz</span
      >

      <!-- 右键菜单 -->
      <Transition name="menu">
        <div
          v-if="showContextMenu"
          class="desk-pet__menu"
          :style="{ left: `${contextMenuPos.x}px`, top: `${contextMenuPos.y}px` }"
          @click.stop
        >
          <button type="button" class="desk-pet__menu-item" @click="menuActions.pat()">
            {{ t('deskPet.menu.pat') }}
          </button>
          <button type="button" class="desk-pet__menu-item" @click="menuActions.feed()">
            {{ t('deskPet.menu.feed') }}
          </button>
          <button type="button" class="desk-pet__menu-item" @click="menuActions.play()">
            {{ t('deskPet.menu.play') }}
          </button>
          <button type="button" class="desk-pet__menu-item" @click="menuActions.focus()">
            {{ t('deskPet.menu.focus') }}
          </button>
          <button type="button" class="desk-pet__menu-item" @click="menuActions.rest()">
            {{ t('deskPet.menu.rest') }}
          </button>
          <div class="desk-pet__menu-divider" />
          <button
            type="button"
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
