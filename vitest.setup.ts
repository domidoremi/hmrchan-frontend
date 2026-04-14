import { afterEach, vi } from 'vitest'

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

const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
}

const KNOWN_TEST_NOISE_PATTERNS = [
  /Not implemented: HTMLCanvasElement(?:\.prototype)?\.getContext/i,
  /Not implemented: HTMLCanvasElement(?:'s)?\.toDataURL/i,
  /Not implemented: window\.scrollTo/i,
  /Not implemented: navigation(?: to another Document)?/i,
  /You are running a development build of Vue/i,
  /<Suspense> is an experimental feature/i,
  /\[Turnstile\]/i,
  /\[SW Update\]/i,
  /\[Sync\]/i,
  /\[SyncManager\]/i,
  /\[OfflineQueue\]/i,
  /\[API Proxy\].*VPC fetch failed/i,
  /\[API Proxy\].*falling back to public/i,
  /\[Uploads Proxy\].*upstream unavailable/i,
  /\[SyncManager\] Background sync registration failed/i,
  /\[OfflineQueue\] Background sync registration failed/i,
]

const KNOWN_PROCESS_WRITE_NOISE_PATTERNS = [/Not implemented: navigation(?: to another Document)?/i]

function shouldIgnoreConsoleNoise(args: unknown[]): boolean {
  const text = args
    .map((arg) => {
      if (typeof arg === 'string') return arg
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')

  return KNOWN_TEST_NOISE_PATTERNS.some((pattern) => pattern.test(text))
}

function stripKnownProcessNoise(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !KNOWN_PROCESS_WRITE_NOISE_PATTERNS.some((pattern) => pattern.test(line)))
    .join('\n')
}

const originalStdoutWrite = process.stdout.write.bind(process.stdout)
const originalStderrWrite = process.stderr.write.bind(process.stderr)

function wrapProcessWrite(originalWrite: typeof process.stdout.write): typeof process.stdout.write {
  return ((chunk: unknown, encoding?: unknown, callback?: unknown) => {
    const rawText =
      typeof chunk === 'string'
        ? chunk
        : Buffer.isBuffer(chunk)
          ? chunk.toString(typeof encoding === 'string' ? encoding : undefined)
          : String(chunk)
    const filteredText = stripKnownProcessNoise(rawText)

    if (!filteredText) {
      if (typeof encoding === 'function') {
        ;(encoding as (error?: Error | null) => void)(null)
      } else if (typeof callback === 'function') {
        ;(callback as (error?: Error | null) => void)(null)
      }
      return true
    }

    const nextChunk =
      typeof chunk === 'string'
        ? filteredText
        : Buffer.isBuffer(chunk)
          ? Buffer.from(filteredText)
          : filteredText

    return originalWrite(nextChunk as never, encoding as never, callback as never)
  }) as typeof process.stdout.write
}

Object.defineProperty(process.stdout, 'write', {
  configurable: true,
  value: wrapProcessWrite(originalStdoutWrite),
})

Object.defineProperty(process.stderr, 'write', {
  configurable: true,
  value: wrapProcessWrite(originalStderrWrite),
})

Object.defineProperty(console, 'log', {
  configurable: true,
  value: (...args: Parameters<typeof console.log>) => {
    if (shouldIgnoreConsoleNoise(args)) return
    originalConsole.log(...args)
  },
})

Object.defineProperty(console, 'error', {
  configurable: true,
  value: (...args: Parameters<typeof console.error>) => {
    if (shouldIgnoreConsoleNoise(args)) return
    originalConsole.error(...args)
  },
})

Object.defineProperty(console, 'warn', {
  configurable: true,
  value: (...args: Parameters<typeof console.warn>) => {
    if (shouldIgnoreConsoleNoise(args)) return
    originalConsole.warn(...args)
  },
})

Object.defineProperty(console, 'info', {
  configurable: true,
  value: (...args: Parameters<typeof console.info>) => {
    if (shouldIgnoreConsoleNoise(args)) return
    originalConsole.info(...args)
  },
})

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
}

if (typeof HTMLCanvasElement !== 'undefined') {
  const gradientStub = { addColorStop: vi.fn() }
  const canvasContextStub = {
    clearRect: vi.fn(),
    createImageData: vi.fn(),
    createLinearGradient: vi.fn(() => gradientStub),
    createRadialGradient: vi.fn(() => gradientStub),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
    putImageData: vi.fn(),
    resetTransform: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    strokeRect: vi.fn(),
    transform: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
  }

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => canvasContextStub),
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    configurable: true,
    value: vi.fn(() => 'data:image/png;base64,'),
  })
}

afterEach(() => {
  const scrollTo = window.scrollTo as ReturnType<typeof vi.fn>
  scrollTo?.mockClear?.()
  const getContext = HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>
  getContext?.mockClear?.()
  const toDataURL = HTMLCanvasElement.prototype.toDataURL as ReturnType<typeof vi.fn>
  toDataURL?.mockClear?.()
})
