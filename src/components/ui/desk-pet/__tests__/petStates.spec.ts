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

    expect(resolveWorkflowPetState(serviceUnavailable, 'pointer')).toBe(PetState.PROVIDER_ISSUE)
    expect(resolveWorkflowPetState(loading, 'focus')).toBe(PetState.RETRIEVING)
    expect(resolveWorkflowPetState(empty, 'click')).toBe(PetState.REVIEW)
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
    expect(getWorkflowPetStateParticle(PetState.PROVIDER_ISSUE)).toEqual({ emoji: '!', count: 2 })
    expect(getWorkflowPetStateParticle(PetState.IDLE)).toBeNull()
  })
})
