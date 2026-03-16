<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores'

const { t, tm } = useI18n()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const defaultDeskPetSettings = {
  enabled: true,
  scale: 1,
  speechEnabled: true,
  autoHeroInteraction: true,
  followSensitivity: 1,
}
const deskPetSettings = computed(() => settings.value.deskPet ?? defaultDeskPetSettings)
const visible = computed(() => deskPetSettings.value.enabled)
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
  ENTER = 'enter',
  PERCH = 'perch',
  TRACK = 'track',
  LEAP = 'leap',
  PEEK = 'peek',
}

const stateImageMap: Record<PetState, string> = {
  [PetState.IDLE]: '/images/expressions/sitting-sm.webp',
  [PetState.HOVER]: '/images/expressions/confused-sm.webp',
  [PetState.CLICK]: '/images/expressions/surprised-sm.webp',
  [PetState.ANGRY]: '/images/expressions/angry-sm.webp',
  [PetState.SLEEP]: '/images/expressions/sleeping-sm.webp',
  [PetState.WAKE]: '/images/expressions/surprised-sm.webp',
  [PetState.DRAG]: '/images/expressions/running-sm.webp',
  [PetState.HAPPY]: '/images/expressions/happy-sm.webp',
  [PetState.THINKING]: '/images/expressions/thinking-sm.webp',
  [PetState.PAT]: '/images/expressions/kawaii-sm.webp',
  [PetState.EAT]: '/images/expressions/laughing-sm.webp',
  [PetState.DIZZY]: '/images/expressions/confused-sm.webp',
  [PetState.ENTER]: '/images/expressions/running-sm.webp',
  [PetState.PERCH]: '/images/expressions/standing-sm.webp',
  [PetState.TRACK]: '/images/expressions/surprised-sm.webp',
  [PetState.LEAP]: '/images/expressions/55-sm.webp',
  [PetState.PEEK]: '/images/expressions/22-sm.webp',
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
const PET_SIZE = 80
const EDGE_SNAP = 20
const DEFAULT_PET_EDGE_GAP = 16
const HERO_BUTTON_SELECTOR = '.hero-btn'
const LOOK_MAX_OFFSET = 10
const LOOK_MIN_DISTANCE = 220
const DESK_PET_POSITION_STORAGE_KEY = 'desk-pet:last-position'
const ENABLE_HOME_AUTO_PERCH = false
const DEFAULT_POSITION_OBSTACLE_SELECTORS = [
  '.back-to-top',
  '.scroll-down-fab',
  '.next-post-fab',
  '.toast-stack',
  '.settings-dropdown',
  '.user-dropdown',
] as const

// 计时器
const IDLE_TIMEOUT = 10000
let idleTimer: ReturnType<typeof setTimeout> | null = null
let stateResetTimer: ReturnType<typeof setTimeout> | null = null
let randomIdleBehaviorTimer: ReturnType<typeof setTimeout> | null = null
let peekReturnTimer: ReturnType<typeof setTimeout> | null = null
let heroIntroTimer: ReturnType<typeof setTimeout> | null = null
let heroReactionUnlockTimer: ReturnType<typeof setTimeout> | null = null
let pointerTrackRaf: number | null = null
let movementRaf: number | null = null
let movementToken = 0
let hasPlayedHeroIntro = false
let heroReactionLocked = false

const petStyle = computed<Record<string, string>>(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  '--desk-pet-scale': `${deskPetSettings.value.scale}`,
  '--pet-look-x': `${lookOffset.value.x}px`,
  '--pet-look-y': `${lookOffset.value.y}px`,
}))

// ─── 工具函数 ───
const preloadImages = () => {
  const urls = new Set([
    stateImageMap[PetState.HOVER],
    stateImageMap[PetState.CLICK],
    stateImageMap[PetState.SLEEP],
    stateImageMap[PetState.HAPPY],
    stateImageMap[PetState.PERCH],
    stateImageMap[PetState.LEAP],
    stateImageMap[PetState.PEEK],
  ])
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

const clampPosition = (pos: { x: number; y: number }) => ({
  x: Math.max(-PET_SIZE / 2, Math.min(pos.x, window.innerWidth - PET_SIZE / 2)),
  y: Math.max(0, Math.min(pos.y, window.innerHeight - PET_SIZE / 2)),
})

const clampPeekPosition = (pos: { x: number; y: number }) => ({
  x: Math.max(-PET_SIZE * 0.45, Math.min(pos.x, window.innerWidth - PET_SIZE * 0.55)),
  y: Math.max(0, Math.min(pos.y, window.innerHeight - PET_SIZE * 0.8)),
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

const preventDefaultIfCancelable = (e: Event) => {
  if (e.cancelable) e.preventDefault()
}

const readSavedPosition = (): { x: number; y: number } | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DESK_PET_POSITION_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'x' in parsed &&
      'y' in parsed &&
      typeof parsed.x === 'number' &&
      Number.isFinite(parsed.x) &&
      typeof parsed.y === 'number' &&
      Number.isFinite(parsed.y)
    ) {
      return {
        x: parsed.x,
        y: parsed.y,
      }
    }
  } catch {
    // ignore invalid storage payload
  }
  return null
}

const savePosition = (pos: { x: number; y: number }) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DESK_PET_POSITION_STORAGE_KEY, JSON.stringify(pos))
  } catch {
    // ignore storage write errors
  }
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

const rectsIntersect = (
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number }
) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

const getDefaultPlacementInsets = () => {
  const navbarRect = getVisibleRect('.navbar')
  const mobileNavRect = getVisibleRect('.mobile-nav')

  return {
    top: (navbarRect?.bottom ?? 0) + DEFAULT_PET_EDGE_GAP,
    right: DEFAULT_PET_EDGE_GAP,
    bottom:
      (mobileNavRect ? Math.max(0, window.innerHeight - mobileNavRect.top) : 0) +
      DEFAULT_PET_EDGE_GAP,
    left: DEFAULT_PET_EDGE_GAP,
  }
}

const clampDefaultPlacement = (
  pos: { x: number; y: number },
  petSize: number,
  insets: { top: number; right: number; bottom: number; left: number }
) => ({
  x: Math.max(insets.left, Math.min(pos.x, window.innerWidth - petSize - insets.right)),
  y: Math.max(insets.top, Math.min(pos.y, window.innerHeight - petSize - insets.bottom)),
})

const getDefaultPosition = () => {
  const petSize = PET_SIZE * deskPetSettings.value.scale
  const insets = getDefaultPlacementInsets()
  const obstacleRects = DEFAULT_POSITION_OBSTACLE_SELECTORS.map(getVisibleRect).filter(
    (rect): rect is DOMRect => rect !== null
  )

  const candidates = [
    {
      x: window.innerWidth - petSize - insets.right,
      y: window.innerHeight - petSize - insets.bottom,
    },
    {
      x: insets.left,
      y: window.innerHeight - petSize - insets.bottom,
    },
    {
      x: window.innerWidth - petSize - insets.right,
      y: insets.top,
    },
    {
      x: insets.left,
      y: insets.top,
    },
  ].map((candidate) => clampDefaultPlacement(candidate, petSize, insets))

  const [bestCandidate] = candidates
    .map((candidate, index) => {
      const petRect = {
        left: candidate.x,
        right: candidate.x + petSize,
        top: candidate.y,
        bottom: candidate.y + petSize,
      }

      const overlapCount = obstacleRects.reduce(
        (count, rect) => count + Number(rectsIntersect(petRect, rect)),
        0
      )

      return { candidate, overlapCount, index }
    })
    .sort((a, b) => a.overlapCount - b.overlapCount || a.index - b.index)

  return clampPosition(bestCandidate?.candidate ?? { x: insets.left, y: insets.top })
}

const isHeroTarget = (target: EventTarget | null) =>
  target instanceof Element && target.closest(HERO_BUTTON_SELECTOR)

const getHeroButton = () => document.querySelector<HTMLElement>(HERO_BUTTON_SELECTOR)

const lockHeroReaction = () => {
  heroReactionLocked = true
  if (heroReactionUnlockTimer) clearTimeout(heroReactionUnlockTimer)
  heroReactionUnlockTimer = setTimeout(() => {
    heroReactionLocked = false
    heroReactionUnlockTimer = null
  }, 900)
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
  return clampPosition({
    x: rect.left + rect.width * 0.5 - PET_SIZE / 2,
    y: rect.top - PET_SIZE * 0.56,
  })
}

const getPeekPositionFromHero = (heroBtn: HTMLElement) => {
  const rect = heroBtn.getBoundingClientRect()
  const towardRight = rect.left + rect.width * 0.5 < window.innerWidth * 0.5
  const x = towardRight ? window.innerWidth - PET_SIZE * 0.55 : -PET_SIZE * 0.45
  const y = rect.top + rect.height * 0.2
  return clampPeekPosition({ x, y })
}

const isPetTarget = (target: EventTarget | null) =>
  target instanceof Element && target.closest('.desk-pet')

const setLookOffsetByPointer = (clientX: number, clientY: number) => {
  const sensitivity = deskPetSettings.value.followSensitivity
  const lookDistance = LOOK_MIN_DISTANCE * (1 + (sensitivity - 1) * 0.6)
  const lookFactor = 0.8 + sensitivity * 0.4
  const centerX = position.value.x + PET_SIZE * 0.5
  const centerY = position.value.y + PET_SIZE * 0.5
  const dx = clientX - centerX
  const dy = clientY - centerY
  const distance = Math.hypot(dx, dy)
  if (distance > lookDistance || isDragging.value || showContextMenu.value) {
    lookOffset.value = { x: 0, y: 0 }
    return
  }
  const ratio = (lookDistance - distance) / lookDistance
  lookOffset.value = {
    x: Math.max(-LOOK_MAX_OFFSET, Math.min(LOOK_MAX_OFFSET, dx * 0.06 * ratio * lookFactor)),
    y: Math.max(-LOOK_MAX_OFFSET, Math.min(LOOK_MAX_OFFSET, dy * 0.05 * ratio * lookFactor)),
  }
}

const perchOnHeroButton = async (heroBtn: HTMLElement, fromIntro = false) => {
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

const playHeroIntroIfNeeded = () => {
  if (!ENABLE_HOME_AUTO_PERCH) return
  if (!deskPetSettings.value.autoHeroInteraction) return
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
  const delay = 5000 + Math.random() * 7000
  randomIdleBehaviorTimer = setTimeout(() => {
    if (currentState.value !== PetState.IDLE && currentState.value !== PetState.PERCH) return
    const restState = currentState.value === PetState.PERCH ? PetState.PERCH : PetState.IDLE
    const behaviors = [PetState.THINKING, PetState.HAPPY] as const
    const picked = behaviors[Math.floor(Math.random() * behaviors.length)]
    currentState.value = picked
    showStateBubble(picked, 2500)
    if (picked === PetState.HAPPY) spawnParticles('✨', 2)
    stateResetTimer = setTimeout(() => {
      currentState.value = restState
      scheduleRandomIdleBehavior()
    }, 3000)
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

const getRestState = () =>
  currentState.value === PetState.PERCH || currentState.value === PetState.TRACK
    ? PetState.PERCH
    : PetState.IDLE

const hidePet = () => {
  showContextMenu.value = false
  settings.value.deskPet.enabled = false
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
  transitionTo(PetState.PAT, 2000, getRestState())
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
    transitionTo(PetState.PAT, 2000, getRestState())
    showStateBubble(PetState.PAT, 2000)
    spawnParticles('❤️', 4)
    resetIdleTimer()
  },
  feed() {
    showContextMenu.value = false
    transitionTo(PetState.EAT, 2000, getRestState())
    showStateBubble(PetState.EAT, 2000)
    spawnParticles('🐟', 3)
    resetIdleTimer()
  },
  hide() {
    hidePet()
  },
}

// ─── 拖拽 ───
const handlePointerDown = (e: MouseEvent | TouchEvent) => {
  if (
    e.target instanceof Element &&
    e.target.closest('.desk-pet__close, .desk-pet__menu, .desk-pet__menu-item')
  ) {
    return
  }
  if (showContextMenu.value) {
    showContextMenu.value = false
    return
  }
  stopMovement()
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
  preventDefaultIfCancelable(e)
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
  if ('touches' in e) preventDefaultIfCancelable(e)
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

// ─── 生命周期 ───
onMounted(() => {
  scheduleAuxImagePreload()
  initPosition()
  resetIdleTimer()
  scheduleRandomIdleBehavior()
  heroIntroTimer = setTimeout(() => {
    playHeroIntroIfNeeded()
  }, 520)
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
  stopMovement()
  if (pointerTrackRaf !== null) cancelAnimationFrame(pointerTrackRaf)
  if (delayedPreloadTimer) clearTimeout(delayedPreloadTimer)
  if (idleTimer) clearTimeout(idleTimer)
  if (stateResetTimer) clearTimeout(stateResetTimer)
  if (clickResetTimer) clearTimeout(clickResetTimer)
  if (randomIdleBehaviorTimer) clearTimeout(randomIdleBehaviorTimer)
  if (speechTimer) clearTimeout(speechTimer)
  if (peekReturnTimer) clearTimeout(peekReturnTimer)
  if (heroIntroTimer) clearTimeout(heroIntroTimer)
  if (heroReactionUnlockTimer) clearTimeout(heroReactionUnlockTimer)
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

<style scoped>
/* ═══ 容器 ═══ */
.desk-pet {
  position: fixed;
  width: calc(clamp(3rem, 8vw, 5rem) * var(--desk-pet-scale, 1));
  aspect-ratio: 1;
  --desk-pet-scale: 1;
  --pet-look-x: 0px;
  --pet-look-y: 0px;
  z-index: 9999;
  cursor: grab;
  user-select: none;
  touch-action: none;
  will-change: transform, left, top;
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
  transform: translate3d(var(--pet-look-x), var(--pet-look-y), 0);
  opacity: 0;
  transition:
    opacity 0.15s ease,
    transform 0.12s linear;
}

.desk-pet__image--ready {
  opacity: 1;
}

.desk-pet__close {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999rem;
  border: 1px solid var(--color-divider, rgba(255, 255, 255, 0.6));
  background: var(--color-surface, rgba(255, 255, 255, 0.92));
  color: var(--color-text-secondary, #475569);
  font-size: 0.78rem;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.92);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    color 0.2s ease;
}

.desk-pet:hover .desk-pet__close,
.desk-pet:focus-within .desk-pet__close {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

.desk-pet__close:hover {
  color: var(--color-error, #ef4444);
}

@media (hover: none) {
  .desk-pet__close {
    opacity: 1;
    pointer-events: auto;
  }
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
  transform: scale(0.94);
}

/* ═══ 状态动画 ═══ */
.desk-pet--idle {
  animation: breathe 3s ease-in-out infinite;
}
@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
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

.desk-pet--enter {
  animation: intro-hop 0.85s cubic-bezier(0.2, 0.9, 0.25, 1.1);
}
@keyframes intro-hop {
  0% {
    transform: scale(0.98) rotate(-5deg);
  }
  35% {
    transform: scale(1.06) rotate(2deg);
  }
  70% {
    transform: scale(0.97) rotate(-2deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

.desk-pet--perch {
  animation: perch-sway 2.2s ease-in-out infinite;
}
@keyframes perch-sway {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-1.5deg) scale(1.01);
  }
  75% {
    transform: rotate(1.5deg) scale(1.01);
  }
}

.desk-pet--track {
  animation: curious-pop 0.5s ease-in-out;
}
@keyframes curious-pop {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

.desk-pet--leap {
  animation: leap-away 0.75s cubic-bezier(0.2, 0.85, 0.2, 1);
}
@keyframes leap-away {
  0% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(0.95) rotate(-5deg);
  }
  65% {
    transform: scale(1.05) rotate(6deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

.desk-pet--peek {
  animation: peek-bob 1.8s ease-in-out infinite;
}
@keyframes peek-bob {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(2deg);
  }
}

.desk-pet--click {
  animation: bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
@keyframes bounce {
  0% {
    transform: scale(1) rotate(0deg);
  }
  30% {
    transform: scale(0.96) rotate(-2deg);
  }
  50% {
    transform: scale(1.04) rotate(2deg);
  }
  70% {
    transform: scale(0.98) rotate(-1deg);
  }
  85% {
    transform: scale(1.02) rotate(1deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
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
    transform: scale(1);
  }
  50% {
    transform: scale(0.98);
  }
}

.desk-pet--wake {
  animation: wake 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
@keyframes wake {
  0% {
    transform: rotate(0deg) scale(0.98);
    filter: brightness(0.85);
  }
  50% {
    transform: rotate(-5deg) scale(1.03);
    filter: brightness(1);
  }
  100% {
    transform: rotate(0deg) scale(1);
    filter: brightness(1);
  }
}

.desk-pet--happy {
  animation: happy-bounce 0.8s ease-in-out infinite;
}
@keyframes happy-bounce {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(3deg) scale(1.04);
  }
  75% {
    transform: rotate(-3deg) scale(1.04);
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
    transform: rotate(-4deg) scale(1.02);
  }
  75% {
    transform: rotate(4deg) scale(1.02);
  }
}

.desk-pet--eat {
  animation: eat-chomp 0.5s ease-in-out infinite;
}
@keyframes eat-chomp {
  0%,
  100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.94);
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
  .desk-pet--enter,
  .desk-pet--perch,
  .desk-pet--track,
  .desk-pet--leap,
  .desk-pet--peek,
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

@media (max-width: 768px) {
  .desk-pet {
    display: none !important;
  }
}
</style>
