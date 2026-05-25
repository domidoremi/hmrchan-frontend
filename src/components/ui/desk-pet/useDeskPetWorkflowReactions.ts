import {
  PetState,
  getWorkflowPetStateDuration,
  getWorkflowPetStateParticle,
  resolveWorkflowPetState,
  type DeskPetReactionSource,
} from './petStates'

interface DeskPetWorkflowReactionOptions {
  cooldownMs: number
  getRestState: () => PetState
  isDragging: () => boolean
  isPetTarget: (target: EventTarget | null) => boolean
  isVisible: () => boolean
  resetIdleTimer: () => void
  shouldAnimate: () => boolean
  showStateBubble: (state: PetState, duration: number) => void
  spawnParticles: (emoji: string, count: number) => void
  transitionTo: (state: PetState, duration: number, afterState?: PetState) => void
}

export function createDeskPetWorkflowReactions(options: DeskPetWorkflowReactionOptions) {
  let locked = false
  let unlockTimer: ReturnType<typeof setTimeout> | null = null

  function cleanup() {
    if (unlockTimer) clearTimeout(unlockTimer)
    unlockTimer = null
    locked = false
    document.removeEventListener('click', handleClick)
    document.removeEventListener('focusin', handleFocusIn)
    document.removeEventListener('input', handleInput)
    document.removeEventListener('pointerover', handlePointerOver)
    document.removeEventListener('submit', handleSubmit)
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('online', handleOnline)
  }

  function mount() {
    document.addEventListener('click', handleClick)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('input', handleInput)
    document.addEventListener('pointerover', handlePointerOver, { passive: true })
    document.addEventListener('submit', handleSubmit)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
  }

  function reactTo(target: EventTarget | null, source: DeskPetReactionSource): boolean {
    if (!canReact(target)) return false
    const state = resolveWorkflowPetState(target, source)
    if (!state) return false
    playState(state)
    return true
  }

  function canReact(target: EventTarget | null): boolean {
    return (
      options.isVisible() &&
      options.shouldAnimate() &&
      !options.isDragging() &&
      !locked &&
      !options.isPetTarget(target)
    )
  }

  function playState(state: PetState) {
    const duration = getWorkflowPetStateDuration(state)
    options.transitionTo(state, duration, options.getRestState())
    options.showStateBubble(state, duration)
    const particle = getWorkflowPetStateParticle(state)
    if (particle) options.spawnParticles(particle.emoji, particle.count)
    options.resetIdleTimer()
    lock()
  }

  function lock() {
    locked = true
    if (unlockTimer) clearTimeout(unlockTimer)
    unlockTimer = setTimeout(() => {
      unlockTimer = null
      locked = false
    }, options.cooldownMs)
  }

  function handleClick(event: MouseEvent) {
    reactTo(event.target, 'click')
  }

  function handleFocusIn(event: FocusEvent) {
    reactTo(event.target, 'focus')
  }

  function handleInput(event: Event) {
    reactTo(event.target, 'input')
  }

  function handlePointerOver(event: PointerEvent) {
    reactTo(event.target, 'pointer')
  }

  function handleSubmit(event: SubmitEvent) {
    reactTo(event.target, 'submit')
  }

  function handleOffline() {
    if (!canReact(null)) return
    playState(PetState.OFFLINE_WAITING)
  }

  function handleOnline() {
    if (!canReact(null)) return
    playState(PetState.SYNCING_MODELS)
  }

  return {
    cleanup,
    mount,
    reactTo,
  }
}
