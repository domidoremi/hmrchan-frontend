import { describe, expect, it } from 'vitest'
import {
  DESK_PET_AUX_PRELOAD_STATES,
  PET_STATE_IMAGE_MAP,
  PetState,
  getWorkflowPetStateDuration,
  getWorkflowPetStateParticle,
  resolveWorkflowPetState,
} from '../petStates'

describe('desk pet workflow states', () => {
  it('keeps every pet state mapped to an expression image', () => {
    for (const state of Object.values(PetState)) {
      expect(PET_STATE_IMAGE_MAP[state]).toMatch(/^\/images\/expressions\/.+-sm\.webp$/)
    }
  })

  it('preloads only states that have expression assets', () => {
    expect(DESK_PET_AUX_PRELOAD_STATES.length).toBeGreaterThan(0)

    for (const state of DESK_PET_AUX_PRELOAD_STATES) {
      expect(PET_STATE_IMAGE_MAP[state]).toBeTruthy()
    }
  })

  it('resolves state indicator variants to recovery-oriented workflow states', () => {
    const serviceUnavailable = document.createElement('section')
    serviceUnavailable.className = 'state-indicator state-indicator--service-unavailable'

    const loading = document.createElement('section')
    loading.className = 'state-indicator state-indicator--loading'

    const empty = document.createElement('section')
    empty.className = 'state-indicator state-indicator--empty'

    const success = document.createElement('section')
    success.className = 'state-indicator state-indicator--success'

    const modelTesting = document.createElement('section')
    modelTesting.className = 'state-indicator state-indicator--model-testing'

    expect(resolveWorkflowPetState(serviceUnavailable, 'pointer')).toBe(PetState.PROVIDER_ISSUE)
    expect(resolveWorkflowPetState(loading, 'focus')).toBe(PetState.RETRIEVING)
    expect(resolveWorkflowPetState(empty, 'click')).toBe(PetState.REVIEW)
    expect(resolveWorkflowPetState(success, 'focus')).toBe(PetState.SUCCESS)
    expect(resolveWorkflowPetState(modelTesting, 'pointer')).toBe(PetState.MODEL_TESTING)
  })

  it('resolves explicit pet state and IsleMind-inspired activity hints', () => {
    const explicit = document.createElement('section')
    explicit.dataset.petState = 'memory-linking'

    const rag = document.createElement('section')
    rag.dataset.ragActivity = 'citation'

    const tool = document.createElement('button')
    tool.dataset.toolActivity = 'mcp'

    const model = document.createElement('section')
    model.className = 'state-indicator'
    model.dataset.modelStatus = 'unavailable'

    const update = document.createElement('section')
    update.dataset.updateActivity = 'checking'

    expect(resolveWorkflowPetState(explicit, 'pointer')).toBe(PetState.MEMORY_LINKING)
    expect(resolveWorkflowPetState(rag, 'focus')).toBe(PetState.CITATION_REVIEW)
    expect(resolveWorkflowPetState(tool, 'click')).toBe(PetState.MCP_WORKING)
    expect(resolveWorkflowPetState(model, 'pointer')).toBe(PetState.MODEL_UNAVAILABLE)
    expect(resolveWorkflowPetState(update, 'pointer')).toBe(PetState.UPDATE_CHECK)
  })

  it('resolves common virtual pet moods from data attributes', () => {
    const hungry = document.createElement('button')
    hungry.dataset.petState = 'hungry'

    const focused = document.createElement('button')
    focused.dataset.deskPetState = 'focused'

    const sick = document.createElement('button')
    sick.dataset.petState = 'SICK'

    expect(resolveWorkflowPetState(hungry, 'click')).toBe(PetState.HUNGRY)
    expect(resolveWorkflowPetState(focused, 'focus')).toBe(PetState.FOCUSED)
    expect(resolveWorkflowPetState(sick, 'pointer')).toBe(PetState.SICK)
  })

  it('resolves search, text entry, attachment, and submit targets', () => {
    const search = document.createElement('input')
    search.type = 'search'

    const text = document.createElement('textarea')

    const file = document.createElement('input')
    file.type = 'file'

    const submit = document.createElement('button')
    submit.type = 'submit'

    expect(resolveWorkflowPetState(search, 'focus')).toBe(PetState.WEB_SEARCHING)
    expect(resolveWorkflowPetState(text, 'input')).toBe(PetState.SENDING_PROMPT)
    expect(resolveWorkflowPetState(file, 'click')).toBe(PetState.ATTACHMENT_READING)
    expect(resolveWorkflowPetState(submit, 'click')).toBe(PetState.TOOL_WORKING)
  })

  it('uses longer durations and particles for blocking or active workflow states', () => {
    expect(getWorkflowPetStateDuration(PetState.OFFLINE_WAITING)).toBeGreaterThan(
      getWorkflowPetStateDuration(PetState.WEB_SEARCHING)
    )
    expect(getWorkflowPetStateDuration(PetState.CITATION_REVIEW)).toBeGreaterThan(
      getWorkflowPetStateDuration(PetState.WEB_SEARCHING)
    )
    expect(getWorkflowPetStateParticle(PetState.PROVIDER_ISSUE)).toEqual({ emoji: '!', count: 2 })
    expect(getWorkflowPetStateParticle(PetState.SUCCESS)).toEqual({ emoji: '*', count: 3 })
    expect(getWorkflowPetStateParticle(PetState.IDLE)).toBeNull()
  })
})
