export enum PetState {
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
  BLINK = 'blink',
  ENTER = 'enter',
  PERCH = 'perch',
  TRACK = 'track',
  LEAP = 'leap',
  PEEK = 'peek',
  SENDING_PROMPT = 'sendingPrompt',
  REVIEW = 'review',
  FAILED = 'failed',
  WAITING = 'waiting',
  DEEP_THINKING = 'deepThinking',
  RETRIEVING = 'retrieving',
  CONTEXT_COMPRESSING = 'contextCompressing',
  FLARE_SCAN = 'flareScan',
  TOOL_WORKING = 'toolWorking',
  MCP_WORKING = 'mcpWorking',
  SKILL_RUNNING = 'skillRunning',
  ATTACHMENT_READING = 'attachmentReading',
  WEB_SEARCHING = 'webSearching',
  MODEL_TESTING = 'modelTesting',
  SYNCING_MODELS = 'syncingModels',
  PROVIDER_ISSUE = 'providerIssue',
  OFFLINE_WAITING = 'offlineWaiting',
  WARNING_RECOVER = 'warningRecover',
}

export const PET_STATE_IMAGE_MAP: Record<PetState, string> = {
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
  [PetState.BLINK]: '/images/expressions/standing-sm.webp',
  [PetState.ENTER]: '/images/expressions/running-sm.webp',
  [PetState.PERCH]: '/images/expressions/standing-sm.webp',
  [PetState.TRACK]: '/images/expressions/surprised-sm.webp',
  [PetState.LEAP]: '/images/expressions/55-sm.webp',
  [PetState.PEEK]: '/images/expressions/22-sm.webp',
  [PetState.SENDING_PROMPT]: '/images/expressions/running-sm.webp',
  [PetState.REVIEW]: '/images/expressions/thinking-sm.webp',
  [PetState.FAILED]: '/images/expressions/angry-sm.webp',
  [PetState.WAITING]: '/images/expressions/sitting-sm.webp',
  [PetState.DEEP_THINKING]: '/images/expressions/thinking-sm.webp',
  [PetState.RETRIEVING]: '/images/expressions/running-sm.webp',
  [PetState.CONTEXT_COMPRESSING]: '/images/expressions/thinking-sm.webp',
  [PetState.FLARE_SCAN]: '/images/expressions/surprised-sm.webp',
  [PetState.TOOL_WORKING]: '/images/expressions/kawaii-sm.webp',
  [PetState.MCP_WORKING]: '/images/expressions/55-sm.webp',
  [PetState.SKILL_RUNNING]: '/images/expressions/happy-sm.webp',
  [PetState.ATTACHMENT_READING]: '/images/expressions/confused-sm.webp',
  [PetState.WEB_SEARCHING]: '/images/expressions/22-sm.webp',
  [PetState.MODEL_TESTING]: '/images/expressions/surprised-sm.webp',
  [PetState.SYNCING_MODELS]: '/images/expressions/running-sm.webp',
  [PetState.PROVIDER_ISSUE]: '/images/expressions/angry-sm.webp',
  [PetState.OFFLINE_WAITING]: '/images/expressions/sleeping-sm.webp',
  [PetState.WARNING_RECOVER]: '/images/expressions/confused-sm.webp',
}

export const DESK_PET_AUX_PRELOAD_STATES = [
  PetState.HOVER,
  PetState.CLICK,
  PetState.SLEEP,
  PetState.HAPPY,
  PetState.PERCH,
  PetState.LEAP,
  PetState.PEEK,
  PetState.RETRIEVING,
  PetState.WEB_SEARCHING,
  PetState.TOOL_WORKING,
  PetState.PROVIDER_ISSUE,
] as const

export type DeskPetReactionSource = 'pointer' | 'focus' | 'input' | 'submit' | 'click'

export function getWorkflowPetStateDuration(state: PetState): number {
  switch (state) {
    case PetState.SENDING_PROMPT:
    case PetState.RETRIEVING:
    case PetState.WEB_SEARCHING:
      return 1800
    case PetState.TOOL_WORKING:
    case PetState.MCP_WORKING:
    case PetState.SKILL_RUNNING:
    case PetState.ATTACHMENT_READING:
      return 2200
    case PetState.PROVIDER_ISSUE:
    case PetState.WARNING_RECOVER:
    case PetState.FAILED:
      return 2600
    case PetState.OFFLINE_WAITING:
      return 3600
    case PetState.SYNCING_MODELS:
      return 2000
    default:
      return 2400
  }
}

export function getWorkflowPetStateParticle(
  state: PetState
): { emoji: string; count: number } | null {
  switch (state) {
    case PetState.WEB_SEARCHING:
    case PetState.FLARE_SCAN:
      return { emoji: '*', count: 2 }
    case PetState.TOOL_WORKING:
    case PetState.MCP_WORKING:
    case PetState.SKILL_RUNNING:
      return { emoji: '*', count: 2 }
    case PetState.PROVIDER_ISSUE:
    case PetState.WARNING_RECOVER:
    case PetState.FAILED:
      return { emoji: '!', count: 2 }
    case PetState.SYNCING_MODELS:
      return { emoji: '~', count: 2 }
    default:
      return null
  }
}

export function resolveWorkflowPetState(
  target: EventTarget | null,
  source: DeskPetReactionSource
): PetState | null {
  const element = target instanceof Element ? target : null
  if (!element) return null

  const stateIndicator = element.closest('.state-indicator')
  if (stateIndicator) {
    if (stateIndicator.classList.contains('state-indicator--service-unavailable')) {
      return PetState.PROVIDER_ISSUE
    }
    if (stateIndicator.classList.contains('state-indicator--error')) return PetState.WARNING_RECOVER
    if (stateIndicator.classList.contains('state-indicator--loading')) return PetState.RETRIEVING
    if (
      stateIndicator.classList.contains('state-indicator--empty') ||
      stateIndicator.classList.contains('state-indicator--no-results') ||
      stateIndicator.classList.contains('state-indicator--not-found')
    ) {
      return PetState.REVIEW
    }
  }

  if (source === 'submit') return PetState.TOOL_WORKING
  if (isAttachmentTarget(element)) return PetState.ATTACHMENT_READING
  if (isSearchTarget(element)) return PetState.WEB_SEARCHING
  if (source === 'input' && isTextEntryTarget(element)) return PetState.SENDING_PROMPT
  if (source !== 'pointer' && isLoadingTarget(element)) return PetState.RETRIEVING
  if (source !== 'pointer' && isErrorTarget(element)) return PetState.WARNING_RECOVER
  if (source === 'click' && isSubmitTarget(element)) return PetState.TOOL_WORKING

  return null
}

function isSearchTarget(element: Element): boolean {
  const control = element.closest('input, textarea, [role="searchbox"], [type="search"]')
  if (!control) return false
  if (control instanceof HTMLInputElement && control.type === 'search') return true
  return /search|\u641c\u7d22|\u641c\u5c0b|\u691c\u7d22/i.test(
    [
      control.getAttribute('role'),
      control.getAttribute('aria-label'),
      control.getAttribute('placeholder'),
      control.getAttribute('name'),
      control.getAttribute('id'),
      control.getAttribute('class'),
    ]
      .filter(Boolean)
      .join(' ')
  )
}

function isTextEntryTarget(element: Element): boolean {
  const control = element.closest('input, textarea, [contenteditable="true"]')
  if (!control) return false
  if (control instanceof HTMLTextAreaElement) return true
  if (control instanceof HTMLInputElement) {
    return ['email', 'number', 'password', 'search', 'tel', 'text', 'url'].includes(control.type)
  }
  return control.getAttribute('contenteditable') === 'true'
}

function isAttachmentTarget(element: Element): boolean {
  const target = element.closest('input[type="file"], [data-attachment], [data-upload], .upload')
  return target !== null
}

function isSubmitTarget(element: Element): boolean {
  const target = element.closest('button[type="submit"], input[type="submit"], [data-submit]')
  return target !== null
}

function isLoadingTarget(element: Element): boolean {
  const target = element.closest('[aria-busy="true"], [data-loading="true"], .loading, .skeleton')
  return target !== null
}

function isErrorTarget(element: Element): boolean {
  const target = element.closest('[data-error], [aria-invalid="true"], .error, .form-error')
  return target !== null
}
