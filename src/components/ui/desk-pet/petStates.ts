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
  MEMORY_LINKING = 'memoryLinking',
  GRAPH_MAPPING = 'graphMapping',
  CITATION_REVIEW = 'citationReview',
  KNOWLEDGE_INDEXING = 'knowledgeIndexing',
  TOOL_WORKING = 'toolWorking',
  MCP_WORKING = 'mcpWorking',
  SKILL_RUNNING = 'skillRunning',
  ATTACHMENT_READING = 'attachmentReading',
  WEB_SEARCHING = 'webSearching',
  SUCCESS = 'success',
  MODEL_TESTING = 'modelTesting',
  MODEL_UNCONFIGURED = 'modelUnconfigured',
  MODEL_UNAVAILABLE = 'modelUnavailable',
  SYNCING_MODELS = 'syncingModels',
  PROVIDER_ISSUE = 'providerIssue',
  OFFLINE_WAITING = 'offlineWaiting',
  WARNING_RECOVER = 'warningRecover',
  UPDATE_CHECK = 'updateCheck',
  HUNGRY = 'hungry',
  TIRED = 'tired',
  BORED = 'bored',
  EXCITED = 'excited',
  FOCUSED = 'focused',
  SICK = 'sick',
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
  [PetState.MEMORY_LINKING]: '/images/expressions/thinking-sm.webp',
  [PetState.GRAPH_MAPPING]: '/images/expressions/55-sm.webp',
  [PetState.CITATION_REVIEW]: '/images/expressions/thinking-sm.webp',
  [PetState.KNOWLEDGE_INDEXING]: '/images/expressions/running-sm.webp',
  [PetState.TOOL_WORKING]: '/images/expressions/kawaii-sm.webp',
  [PetState.MCP_WORKING]: '/images/expressions/55-sm.webp',
  [PetState.SKILL_RUNNING]: '/images/expressions/happy-sm.webp',
  [PetState.ATTACHMENT_READING]: '/images/expressions/confused-sm.webp',
  [PetState.WEB_SEARCHING]: '/images/expressions/22-sm.webp',
  [PetState.SUCCESS]: '/images/expressions/happy-sm.webp',
  [PetState.MODEL_TESTING]: '/images/expressions/surprised-sm.webp',
  [PetState.MODEL_UNCONFIGURED]: '/images/expressions/confused-sm.webp',
  [PetState.MODEL_UNAVAILABLE]: '/images/expressions/sleeping-sm.webp',
  [PetState.SYNCING_MODELS]: '/images/expressions/running-sm.webp',
  [PetState.PROVIDER_ISSUE]: '/images/expressions/angry-sm.webp',
  [PetState.OFFLINE_WAITING]: '/images/expressions/sleeping-sm.webp',
  [PetState.WARNING_RECOVER]: '/images/expressions/confused-sm.webp',
  [PetState.UPDATE_CHECK]: '/images/expressions/running-sm.webp',
  [PetState.HUNGRY]: '/images/expressions/kawaii-sm.webp',
  [PetState.TIRED]: '/images/expressions/sleeping-sm.webp',
  [PetState.BORED]: '/images/expressions/sitting-sm.webp',
  [PetState.EXCITED]: '/images/expressions/happy-sm.webp',
  [PetState.FOCUSED]: '/images/expressions/thinking-sm.webp',
  [PetState.SICK]: '/images/expressions/confused-sm.webp',
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
  PetState.MEMORY_LINKING,
  PetState.GRAPH_MAPPING,
  PetState.CITATION_REVIEW,
  PetState.KNOWLEDGE_INDEXING,
  PetState.TOOL_WORKING,
  PetState.PROVIDER_ISSUE,
  PetState.SUCCESS,
  PetState.HUNGRY,
  PetState.TIRED,
  PetState.EXCITED,
  PetState.FOCUSED,
] as const

export type DeskPetReactionSource = 'pointer' | 'focus' | 'input' | 'submit' | 'click'

export function getWorkflowPetStateDuration(state: PetState): number {
  switch (state) {
    case PetState.SENDING_PROMPT:
    case PetState.RETRIEVING:
    case PetState.WEB_SEARCHING:
    case PetState.UPDATE_CHECK:
      return 1800
    case PetState.TOOL_WORKING:
    case PetState.MCP_WORKING:
    case PetState.SKILL_RUNNING:
    case PetState.ATTACHMENT_READING:
    case PetState.MEMORY_LINKING:
    case PetState.GRAPH_MAPPING:
    case PetState.CITATION_REVIEW:
    case PetState.KNOWLEDGE_INDEXING:
      return 2200
    case PetState.SUCCESS:
    case PetState.EXCITED:
      return 2000
    case PetState.HUNGRY:
    case PetState.TIRED:
    case PetState.BORED:
    case PetState.FOCUSED:
      return 2400
    case PetState.MODEL_UNCONFIGURED:
    case PetState.MODEL_UNAVAILABLE:
    case PetState.PROVIDER_ISSUE:
    case PetState.WARNING_RECOVER:
    case PetState.FAILED:
    case PetState.SICK:
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
    case PetState.MEMORY_LINKING:
    case PetState.GRAPH_MAPPING:
    case PetState.CITATION_REVIEW:
    case PetState.KNOWLEDGE_INDEXING:
      return { emoji: '*', count: 2 }
    case PetState.TOOL_WORKING:
    case PetState.MCP_WORKING:
    case PetState.SKILL_RUNNING:
      return { emoji: '*', count: 2 }
    case PetState.SUCCESS:
    case PetState.EXCITED:
      return { emoji: '*', count: 3 }
    case PetState.HUNGRY:
      return { emoji: '+', count: 2 }
    case PetState.PROVIDER_ISSUE:
    case PetState.WARNING_RECOVER:
    case PetState.FAILED:
    case PetState.MODEL_UNCONFIGURED:
    case PetState.MODEL_UNAVAILABLE:
    case PetState.SICK:
      return { emoji: '!', count: 2 }
    case PetState.SYNCING_MODELS:
    case PetState.UPDATE_CHECK:
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

  const explicitState = resolveExplicitPetState(element)
  if (explicitState) return explicitState

  const activityState = resolveActivityPetState(element)
  if (activityState) return activityState

  const stateIndicator = element.closest('.state-indicator')
  if (stateIndicator) {
    const stateIndicatorActivity = resolveActivityPetState(stateIndicator)
    if (stateIndicatorActivity) return stateIndicatorActivity
    if (stateIndicator.classList.contains('state-indicator--service-unavailable')) {
      return PetState.PROVIDER_ISSUE
    }
    if (stateIndicator.classList.contains('state-indicator--error')) return PetState.WARNING_RECOVER
    if (stateIndicator.classList.contains('state-indicator--loading')) return PetState.RETRIEVING
    if (stateIndicator.classList.contains('state-indicator--success')) return PetState.SUCCESS
    if (stateIndicator.classList.contains('state-indicator--model-testing')) {
      return PetState.MODEL_TESTING
    }
    if (stateIndicator.classList.contains('state-indicator--model-unconfigured')) {
      return PetState.MODEL_UNCONFIGURED
    }
    if (stateIndicator.classList.contains('state-indicator--model-unavailable')) {
      return PetState.MODEL_UNAVAILABLE
    }
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
  if (isKnowledgeTarget(element)) return PetState.RETRIEVING
  if (isSuccessTarget(element)) return PetState.SUCCESS
  if (source === 'input' && isTextEntryTarget(element)) return PetState.SENDING_PROMPT
  if (source !== 'pointer' && isLoadingTarget(element)) return PetState.RETRIEVING
  if (source !== 'pointer' && isErrorTarget(element)) return PetState.WARNING_RECOVER
  if (source === 'click' && isSubmitTarget(element)) return PetState.TOOL_WORKING

  return null
}

const PET_STATE_ALIASES: Record<string, PetState> = {
  idle: PetState.IDLE,
  hover: PetState.HOVER,
  click: PetState.CLICK,
  angry: PetState.ANGRY,
  sleep: PetState.SLEEP,
  sleeping: PetState.SLEEP,
  wake: PetState.WAKE,
  drag: PetState.DRAG,
  happy: PetState.HAPPY,
  thinking: PetState.THINKING,
  pat: PetState.PAT,
  eat: PetState.EAT,
  eating: PetState.EAT,
  dizzy: PetState.DIZZY,
  blink: PetState.BLINK,
  enter: PetState.ENTER,
  perch: PetState.PERCH,
  track: PetState.TRACK,
  leap: PetState.LEAP,
  peek: PetState.PEEK,
  sending: PetState.SENDING_PROMPT,
  sendingPrompt: PetState.SENDING_PROMPT,
  promptSending: PetState.SENDING_PROMPT,
  review: PetState.REVIEW,
  failed: PetState.FAILED,
  waiting: PetState.WAITING,
  deep: PetState.DEEP_THINKING,
  deepThinking: PetState.DEEP_THINKING,
  retrieving: PetState.RETRIEVING,
  retrieval: PetState.RETRIEVING,
  context: PetState.CONTEXT_COMPRESSING,
  contextCompressing: PetState.CONTEXT_COMPRESSING,
  compressing: PetState.CONTEXT_COMPRESSING,
  flare: PetState.FLARE_SCAN,
  flareScan: PetState.FLARE_SCAN,
  memory: PetState.MEMORY_LINKING,
  memoryLinking: PetState.MEMORY_LINKING,
  graph: PetState.GRAPH_MAPPING,
  graphMapping: PetState.GRAPH_MAPPING,
  citation: PetState.CITATION_REVIEW,
  citationReview: PetState.CITATION_REVIEW,
  indexing: PetState.KNOWLEDGE_INDEXING,
  knowledgeIndexing: PetState.KNOWLEDGE_INDEXING,
  tool: PetState.TOOL_WORKING,
  toolWorking: PetState.TOOL_WORKING,
  mcp: PetState.MCP_WORKING,
  mcpWorking: PetState.MCP_WORKING,
  skill: PetState.SKILL_RUNNING,
  skillRunning: PetState.SKILL_RUNNING,
  attachment: PetState.ATTACHMENT_READING,
  attachmentReading: PetState.ATTACHMENT_READING,
  search: PetState.WEB_SEARCHING,
  webSearch: PetState.WEB_SEARCHING,
  webSearching: PetState.WEB_SEARCHING,
  success: PetState.SUCCESS,
  modelTesting: PetState.MODEL_TESTING,
  modelUnconfigured: PetState.MODEL_UNCONFIGURED,
  modelUnavailable: PetState.MODEL_UNAVAILABLE,
  syncing: PetState.SYNCING_MODELS,
  syncingModels: PetState.SYNCING_MODELS,
  providerIssue: PetState.PROVIDER_ISSUE,
  offline: PetState.OFFLINE_WAITING,
  offlineWaiting: PetState.OFFLINE_WAITING,
  warning: PetState.WARNING_RECOVER,
  warningRecover: PetState.WARNING_RECOVER,
  update: PetState.UPDATE_CHECK,
  updateCheck: PetState.UPDATE_CHECK,
  hungry: PetState.HUNGRY,
  tired: PetState.TIRED,
  bored: PetState.BORED,
  excited: PetState.EXCITED,
  focused: PetState.FOCUSED,
  focus: PetState.FOCUSED,
  sick: PetState.SICK,
}

const PET_STATE_TOKEN_MAP: Record<string, PetState> = Object.fromEntries(
  Object.entries(PET_STATE_ALIASES).flatMap(([key, state]) => [
    [key, state],
    [key.toLowerCase(), state],
    [normalizeStateToken(key).toLowerCase(), state],
  ])
) as Record<string, PetState>

function normalizeStateToken(value: string): string {
  return value.trim().replace(/[-_\s]+([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase())
}

function stateFromToken(value: string | null | undefined): PetState | null {
  if (!value) return null
  const normalized = normalizeStateToken(value)
  return PET_STATE_TOKEN_MAP[normalized] ?? PET_STATE_TOKEN_MAP[normalized.toLowerCase()] ?? null
}

function resolveExplicitPetState(element: Element): PetState | null {
  const target = element.closest('[data-pet-state], [data-desk-pet-state]')
  if (!target) return null
  return (
    stateFromToken(target.getAttribute('data-pet-state')) ??
    stateFromToken(target.getAttribute('data-desk-pet-state'))
  )
}

function resolveActivityPetState(element: Element): PetState | null {
  const target = element.closest(
    '[data-rag-activity], [data-tool-activity], [data-provider-activity], [data-model-status], [data-update-activity]'
  )
  if (!target) return null

  return (
    stateFromRagActivity(target.getAttribute('data-rag-activity')) ??
    stateFromToolActivity(target.getAttribute('data-tool-activity')) ??
    stateFromProviderActivity(target.getAttribute('data-provider-activity')) ??
    stateFromModelStatus(target.getAttribute('data-model-status')) ??
    stateFromUpdateActivity(target.getAttribute('data-update-activity'))
  )
}

function stateFromRagActivity(value: string | null): PetState | null {
  switch (normalizeStateToken(value ?? '').toLowerCase()) {
    case 'retrieving':
    case 'retrieval':
      return PetState.RETRIEVING
    case 'deep':
    case 'reasoning':
      return PetState.DEEP_THINKING
    case 'fallback':
    case 'recovering':
      return PetState.WARNING_RECOVER
    case 'compressing':
    case 'contextcompressing':
      return PetState.CONTEXT_COMPRESSING
    case 'flare':
    case 'flarescan':
      return PetState.FLARE_SCAN
    case 'memory':
    case 'memorylinking':
      return PetState.MEMORY_LINKING
    case 'graph':
    case 'graphmapping':
      return PetState.GRAPH_MAPPING
    case 'citation':
    case 'citationreview':
      return PetState.CITATION_REVIEW
    case 'indexing':
    case 'knowledgeindexing':
      return PetState.KNOWLEDGE_INDEXING
    default:
      return null
  }
}

function stateFromToolActivity(value: string | null): PetState | null {
  switch (normalizeStateToken(value ?? '').toLowerCase()) {
    case 'mcp':
    case 'mcpworking':
      return PetState.MCP_WORKING
    case 'skill':
    case 'skillrunning':
      return PetState.SKILL_RUNNING
    case 'attachment':
    case 'attachmentreading':
      return PetState.ATTACHMENT_READING
    case 'search':
    case 'websearch':
    case 'websearching':
      return PetState.WEB_SEARCHING
    case 'tool':
    case 'toolworking':
      return PetState.TOOL_WORKING
    default:
      return null
  }
}

function stateFromProviderActivity(value: string | null): PetState | null {
  switch (normalizeStateToken(value ?? '').toLowerCase()) {
    case 'syncing':
    case 'providersync':
      return PetState.SYNCING_MODELS
    case 'testing':
      return PetState.MODEL_TESTING
    case 'partialfailure':
    case 'failed':
    case 'issue':
      return PetState.PROVIDER_ISSUE
    default:
      return null
  }
}

function stateFromModelStatus(value: string | null): PetState | null {
  switch (normalizeStateToken(value ?? '').toLowerCase()) {
    case 'testing':
      return PetState.MODEL_TESTING
    case 'syncing':
      return PetState.SYNCING_MODELS
    case 'unconfigured':
      return PetState.MODEL_UNCONFIGURED
    case 'unavailable':
      return PetState.MODEL_UNAVAILABLE
    default:
      return null
  }
}

function stateFromUpdateActivity(value: string | null): PetState | null {
  switch (normalizeStateToken(value ?? '').toLowerCase()) {
    case 'checking':
    case 'updatecheck':
      return PetState.UPDATE_CHECK
    case 'failed':
      return PetState.PROVIDER_ISSUE
    default:
      return null
  }
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

function isKnowledgeTarget(element: Element): boolean {
  const target = element.closest(
    '[data-knowledge], [data-retrieval], [data-citation], [data-memory], [data-indexing], .knowledge-panel, .retrieval-panel, .citation-list, .memory-panel'
  )
  return target !== null
}

function isSuccessTarget(element: Element): boolean {
  const target = element.closest('[data-success], [data-complete="true"], .success-message')
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
