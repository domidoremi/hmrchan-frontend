import { describe, expect, it, vi } from 'vitest'
import {
  createDeskPetParticleBurst,
  findClosestDeskPetElement,
  getDeskPetCareActionPlan,
  getDeskPetEventPosition,
  getDeskPetGreetingKey,
  parseStoredDeskPetPosition,
  readStoredDeskPetPosition,
  resolveDeskPetDefaultPlacementInsets,
  resolveDeskPetHeroPeekPosition,
  resolveDeskPetHeroPerchPosition,
  resolveDeskPetLookOffset,
  resolveDeskPetRestState,
  writeStoredDeskPetPosition,
} from '../interaction'
import { PetState } from '../petStates'

describe('desk pet interaction model', () => {
  it('resolves greeting keys by hour boundary', () => {
    expect(getDeskPetGreetingKey(2)).toBe('deskPet.greeting.lateNight')
    expect(getDeskPetGreetingKey(8)).toBe('deskPet.greeting.morning')
    expect(getDeskPetGreetingKey(14)).toBe('deskPet.greeting.afternoon')
    expect(getDeskPetGreetingKey(22)).toBe('deskPet.greeting.evening')
  })

  it('parses only finite stored positions', () => {
    expect(parseStoredDeskPetPosition('{"x":12,"y":34}')).toEqual({ x: 12, y: 34 })
    expect(parseStoredDeskPetPosition('{"x":null,"y":34}')).toBeNull()
    expect(parseStoredDeskPetPosition('{"x":12,"y":"34"}')).toBeNull()
    expect(parseStoredDeskPetPosition('not-json')).toBeNull()
  })

  it('reads and writes stored positions defensively', () => {
    const storage = {
      getItem: vi.fn(() => '{"x":4,"y":8}'),
      setItem: vi.fn(),
    }

    expect(readStoredDeskPetPosition(storage, 'pet')).toEqual({ x: 4, y: 8 })
    writeStoredDeskPetPosition(storage, 'pet', { x: 16, y: 32 })
    expect(storage.setItem).toHaveBeenCalledWith('pet', '{"x":16,"y":32}')

    const throwingStorage = {
      getItem: vi.fn(() => {
        throw new Error('blocked')
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    }
    expect(readStoredDeskPetPosition(throwingStorage, 'pet')).toBeNull()
    expect(() => writeStoredDeskPetPosition(throwingStorage, 'pet', { x: 1, y: 2 })).not.toThrow()
  })

  it('resolves rest state from active pet states', () => {
    expect(resolveDeskPetRestState(PetState.PERCH)).toBe(PetState.PERCH)
    expect(resolveDeskPetRestState(PetState.TRACK)).toBe(PetState.PERCH)
    expect(resolveDeskPetRestState(PetState.HOVER)).toBe(PetState.IDLE)
  })

  it('maps care menu actions to runtime state plans', () => {
    expect(getDeskPetCareActionPlan('pat')).toEqual({
      state: PetState.PAT,
      duration: 2000,
      bubbleDuration: 2000,
      particle: { emoji: '❤️', count: 4 },
    })
    expect(getDeskPetCareActionPlan('focus')).toEqual({
      state: PetState.FOCUSED,
      duration: 2400,
      bubbleDuration: 2400,
      particle: null,
    })
  })

  it('normalizes mouse and touch event positions', () => {
    expect(
      getDeskPetEventPosition(new MouseEvent('mousedown', { clientX: 10, clientY: 20 }))
    ).toEqual({
      x: 10,
      y: 20,
    })

    const touchEvent = {
      touches: [{ clientX: 30, clientY: 40 }],
    } as unknown as TouchEvent
    expect(getDeskPetEventPosition(touchEvent)).toEqual({ x: 30, y: 40 })
  })

  it('finds closest elements from event targets without throwing on non-elements', () => {
    const button = document.createElement('button')
    button.innerHTML = '<span>child</span>'
    const child = button.querySelector('span')!

    expect(findClosestDeskPetElement(child, 'button')).toBe(button)
    expect(findClosestDeskPetElement(window, 'button')).toBeNull()
  })

  it('calculates pointer look offset and resets when interaction is blocked', () => {
    expect(
      resolveDeskPetLookOffset({
        clientX: 130,
        clientY: 120,
        position: { x: 80, y: 80 },
        sensitivity: 1,
        isDragging: false,
        showContextMenu: false,
      })
    ).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
    })

    expect(
      resolveDeskPetLookOffset({
        clientX: 500,
        clientY: 500,
        position: { x: 80, y: 80 },
        sensitivity: 1,
        isDragging: false,
        showContextMenu: false,
      })
    ).toEqual({ x: 0, y: 0 })

    expect(
      resolveDeskPetLookOffset({
        clientX: 130,
        clientY: 120,
        position: { x: 80, y: 80 },
        sensitivity: 1,
        isDragging: true,
        showContextMenu: false,
      })
    ).toEqual({ x: 0, y: 0 })
  })

  it('creates deterministic particle bursts from an injected random source', () => {
    const randomValues = [0.75, 0.4, 0.25, 0.8]
    const burst = createDeskPetParticleBurst({
      emoji: '*',
      count: 2,
      startId: 5,
      random: () => randomValues.shift() ?? 0.5,
    })

    expect(burst).toEqual({
      particles: [
        { id: 5, emoji: '*', x: 10, y: -4 },
        { id: 6, emoji: '*', x: -10, y: -8 },
      ],
      nextId: 7,
    })
  })

  it('resolves layout positions around shell chrome and hero buttons', () => {
    expect(
      resolveDeskPetDefaultPlacementInsets({
        navbarRect: { left: 0, top: 0, width: 400, height: 56, bottom: 56 },
        mobileNavRect: { left: 0, top: 720, width: 400, height: 80 },
        viewportHeight: 800,
        edgeGap: 16,
      })
    ).toEqual({
      top: 72,
      right: 16,
      bottom: 96,
      left: 16,
    })

    const heroRect = { left: 240, top: 280, width: 120, height: 40 }
    expect(resolveDeskPetHeroPerchPosition(heroRect)).toEqual({ x: 260, y: 235.2 })
    expect(resolveDeskPetHeroPeekPosition({ heroRect, viewportWidth: 800 })).toEqual({
      x: 756,
      y: 288,
    })
  })
})
