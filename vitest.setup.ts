import { vi } from 'vitest'

type LottieListener = () => void

type LottieListeners = Record<string, LottieListener[]>

const createMockAnimation = () => {
  const listeners: LottieListeners = {}

  return {
    isPaused: true,
    currentFrame: 0,
    totalFrames: 0,
    addEventListener(event: string, handler: LottieListener) {
      if (!listeners[event]) {
        listeners[event] = []
      }
      listeners[event].push(handler)
    },
    removeEventListener(event: string, handler: LottieListener) {
      if (!listeners[event]) return
      listeners[event] = listeners[event].filter((item) => item !== handler)
    },
    play() {
      this.isPaused = false
    },
    pause() {
      this.isPaused = true
    },
    stop() {
      this.isPaused = true
      this.currentFrame = 0
    },
    destroy() {
      Object.keys(listeners).forEach((key) => {
        listeners[key] = []
      })
    },
    setSpeed() {},
    setDirection() {},
    goToAndPlay(frame: number) {
      this.currentFrame = frame
      this.isPaused = false
    },
    goToAndStop(frame: number) {
      this.currentFrame = frame
      this.isPaused = true
    },
  }
}

vi.mock('lottie-web', () => {
  return {
    default: {
      loadAnimation: () => createMockAnimation(),
    },
  }
})
