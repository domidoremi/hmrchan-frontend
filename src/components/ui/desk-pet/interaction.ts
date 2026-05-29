import { LOOK_MAX_OFFSET, LOOK_MIN_DISTANCE, PET_SIZE } from './config'
import { PetState } from './petStates'

export interface DeskPetPoint {
  x: number
  y: number
}

export interface DeskPetParticle {
  id: number
  emoji: string
  x: number
  y: number
}

export interface DeskPetRectLike {
  left: number
  top: number
  width: number
  height: number
  bottom?: number
}

export type DeskPetCareAction = 'pat' | 'feed' | 'play' | 'focus' | 'rest'

export interface DeskPetCareActionPlan {
  state: PetState
  duration: number
  bubbleDuration: number
  particle: { emoji: string; count: number } | null
}

export const DEFAULT_DESK_PET_SETTINGS = {
  enabled: false,
  autoHomeEnabled: false,
  dismissedAutoHome: false,
  scale: 1,
  speechEnabled: false,
  autoHeroInteraction: false,
  followSensitivity: 1,
}

export function getDeskPetGreetingKey(hour: number): string {
  if (hour < 6) return 'deskPet.greeting.lateNight'
  if (hour < 12) return 'deskPet.greeting.morning'
  if (hour < 18) return 'deskPet.greeting.afternoon'
  return 'deskPet.greeting.evening'
}

function isFinitePoint(value: unknown): value is DeskPetPoint {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y)
  )
}

export function parseStoredDeskPetPosition(raw: string | null): DeskPetPoint | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isFinitePoint(parsed) ? { x: parsed.x, y: parsed.y } : null
  } catch {
    return null
  }
}

export function readStoredDeskPetPosition(
  storage: Pick<Storage, 'getItem'> | null | undefined,
  key: string
): DeskPetPoint | null {
  try {
    return parseStoredDeskPetPosition(storage?.getItem(key) ?? null)
  } catch {
    return null
  }
}

export function writeStoredDeskPetPosition(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  key: string,
  position: DeskPetPoint
): void {
  try {
    storage?.setItem(key, JSON.stringify(position))
  } catch {
    // ignore storage write errors
  }
}

export function resolveDeskPetRestState(currentState: PetState): PetState {
  return currentState === PetState.PERCH || currentState === PetState.TRACK
    ? PetState.PERCH
    : PetState.IDLE
}

export function getDeskPetCareActionPlan(action: DeskPetCareAction): DeskPetCareActionPlan {
  switch (action) {
    case 'pat':
      return {
        state: PetState.PAT,
        duration: 2000,
        bubbleDuration: 2000,
        particle: { emoji: '❤️', count: 4 },
      }
    case 'feed':
      return {
        state: PetState.EAT,
        duration: 2000,
        bubbleDuration: 2000,
        particle: { emoji: '+', count: 3 },
      }
    case 'play':
      return {
        state: PetState.EXCITED,
        duration: 2000,
        bubbleDuration: 2000,
        particle: { emoji: '*', count: 3 },
      }
    case 'focus':
      return {
        state: PetState.FOCUSED,
        duration: 2400,
        bubbleDuration: 2400,
        particle: null,
      }
    case 'rest':
      return {
        state: PetState.TIRED,
        duration: 2200,
        bubbleDuration: 2200,
        particle: null,
      }
  }
}

export function getDeskPetEventPosition(event: MouseEvent | TouchEvent): DeskPetPoint {
  const touch = 'touches' in event ? event.touches?.[0] : null
  return {
    x: touch?.clientX ?? (event instanceof MouseEvent ? event.clientX : 0),
    y: touch?.clientY ?? (event instanceof MouseEvent ? event.clientY : 0),
  }
}

export function findClosestDeskPetElement<T extends Element = Element>(
  target: EventTarget | null,
  selector: string
): T | null {
  return target instanceof Element ? (target.closest(selector) as T | null) : null
}

export function resolveDeskPetLookOffset({
  clientX,
  clientY,
  position,
  sensitivity,
  isDragging,
  showContextMenu,
  petSize = PET_SIZE,
  minDistance = LOOK_MIN_DISTANCE,
  maxOffset = LOOK_MAX_OFFSET,
}: {
  clientX: number
  clientY: number
  position: DeskPetPoint
  sensitivity: number
  isDragging: boolean
  showContextMenu: boolean
  petSize?: number
  minDistance?: number
  maxOffset?: number
}): DeskPetPoint {
  const lookDistance = minDistance * (1 + (sensitivity - 1) * 0.6)
  const lookFactor = 0.8 + sensitivity * 0.4
  const centerX = position.x + petSize * 0.5
  const centerY = position.y + petSize * 0.5
  const dx = clientX - centerX
  const dy = clientY - centerY
  const distance = Math.hypot(dx, dy)

  if (distance > lookDistance || isDragging || showContextMenu) {
    return { x: 0, y: 0 }
  }

  const ratio = (lookDistance - distance) / lookDistance
  return {
    x: Math.max(-maxOffset, Math.min(maxOffset, dx * 0.06 * ratio * lookFactor)),
    y: Math.max(-maxOffset, Math.min(maxOffset, dy * 0.05 * ratio * lookFactor)),
  }
}

export function createDeskPetParticleBurst({
  emoji,
  count,
  startId,
  random = Math.random,
}: {
  emoji: string
  count: number
  startId: number
  random?: () => number
}): { particles: DeskPetParticle[]; nextId: number } {
  const particles = Array.from({ length: count }, (_, index) => ({
    id: startId + index,
    emoji,
    x: (random() - 0.5) * 40,
    y: -random() * 10,
  }))

  return {
    particles,
    nextId: startId + particles.length,
  }
}

export function resolveDeskPetDefaultPlacementInsets({
  navbarRect,
  mobileNavRect,
  viewportHeight,
  edgeGap,
}: {
  navbarRect: DeskPetRectLike | null
  mobileNavRect: DeskPetRectLike | null
  viewportHeight: number
  edgeGap: number
}) {
  return {
    top: (navbarRect?.bottom ?? 0) + edgeGap,
    right: edgeGap,
    bottom: (mobileNavRect ? Math.max(0, viewportHeight - mobileNavRect.top) : 0) + edgeGap,
    left: edgeGap,
  }
}

export function resolveDeskPetHeroPerchPosition(
  heroRect: DeskPetRectLike,
  petSize = PET_SIZE
): DeskPetPoint {
  return {
    x: heroRect.left + heroRect.width * 0.5 - petSize / 2,
    y: heroRect.top - petSize * 0.56,
  }
}

export function resolveDeskPetHeroPeekPosition({
  heroRect,
  viewportWidth,
  petSize = PET_SIZE,
}: {
  heroRect: DeskPetRectLike
  viewportWidth: number
  petSize?: number
}): DeskPetPoint {
  const towardRight = heroRect.left + heroRect.width * 0.5 < viewportWidth * 0.5
  return {
    x: towardRight ? viewportWidth - petSize * 0.55 : -petSize * 0.45,
    y: heroRect.top + heroRect.height * 0.2,
  }
}
