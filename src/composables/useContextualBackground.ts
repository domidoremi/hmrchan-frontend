import { ref, computed, watch, readonly, onScopeDispose } from 'vue'
import { useRoute } from 'vue-router'

export type BackgroundState =
  | 'home'
  | 'explore-default'
  | 'explore-instagram'
  | 'explore-tiktok'
  | 'explore-youtube'
  | 'explore-twitter'

export type PlatformFilter = 'all' | 'instagram' | 'tiktok' | 'youtube' | 'twitter'

export interface BackgroundConfig {
  readonly state: BackgroundState
  readonly className: string
  readonly label: string
  readonly description: string
}

const BACKGROUND_CONFIGS: Readonly<Record<BackgroundState, BackgroundConfig>> = {
  home: {
    state: 'home',
    className: 'bg-home-core',
    label: 'Home',
    description: 'The Core - Crystalline prism',
  },
  'explore-default': {
    state: 'explore-default',
    className: 'bg-explore-aerogel',
    label: 'All Content',
    description: 'Aerogel - Floating potential',
  },
  'explore-instagram': {
    state: 'explore-instagram',
    className: 'bg-explore-glass',
    label: 'Instagram',
    description: 'Optical Glass - Frozen moments',
  },
  'explore-tiktok': {
    state: 'explore-tiktok',
    className: 'bg-explore-liquid',
    label: 'TikTok',
    description: 'Liquid Silk - Flowing trends',
  },
  'explore-youtube': {
    state: 'explore-youtube',
    className: 'bg-explore-ripples',
    label: 'YouTube',
    description: 'Sonar Ripples - Immersive depth',
  },
  'explore-twitter': {
    state: 'explore-twitter',
    className: 'bg-explore-network',
    label: 'X/Twitter',
    description: 'Fiber Optic - Connected nodes',
  },
} as const

const PLATFORM_TO_STATE_MAP: Readonly<Record<PlatformFilter, BackgroundState>> = {
  all: 'explore-default',
  instagram: 'explore-instagram',
  tiktok: 'explore-tiktok',
  youtube: 'explore-youtube',
  twitter: 'explore-twitter',
} as const

const TRANSITION_DURATION = 800 // ms

// Singleton state - explicitly shared across all instances
let globalState: ReturnType<typeof createBackgroundState> | null = null

function createBackgroundState() {
  const currentState = ref<BackgroundState>('home')
  const isTransitioning = ref(false)
  const transitionTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  return {
    currentState,
    isTransitioning,
    transitionTimer,
  }
}

function getOrCreateGlobalState() {
  if (!globalState) {
    globalState = createBackgroundState()
  }
  return globalState
}

export function useContextualBackground() {
  const route = useRoute()
  const state = getOrCreateGlobalState()

  const config = computed(() => BACKGROUND_CONFIGS[state.currentState.value])

  const setState = (newState: BackgroundState): void => {
    if (state.currentState.value === newState || state.isTransitioning.value) {
      return
    }

    // Clear any pending transition
    if (state.transitionTimer.value) {
      clearTimeout(state.transitionTimer.value)
    }

    state.isTransitioning.value = true
    state.currentState.value = newState

    // Schedule transition end
    state.transitionTimer.value = setTimeout(() => {
      state.isTransitioning.value = false
      state.transitionTimer.value = null
    }, TRANSITION_DURATION)
  }

  const setExploreFilter = (platform: PlatformFilter): void => {
    const newState = PLATFORM_TO_STATE_MAP[platform]
    setState(newState)
  }

  // Auto-detect route changes - only for relevant routes
  const stopWatcher = watch(
    () => route.path,
    (path) => {
      if (path === '/' || path === '/home') {
        setState('home')
      } else if (path.startsWith('/explore')) {
        // Only reset to default if not already on an explore state
        if (!state.currentState.value.startsWith('explore-')) {
          setState('explore-default')
        }
      }
    },
    { immediate: true }
  )

  // Cleanup on scope disposal
  onScopeDispose(() => {
    stopWatcher()
    if (state.transitionTimer.value) {
      clearTimeout(state.transitionTimer.value)
      state.transitionTimer.value = null
    }
  })

  return {
    currentState: readonly(state.currentState),
    config,
    isTransitioning: readonly(state.isTransitioning),
    setState,
    setExploreFilter,
    backgroundConfigs: BACKGROUND_CONFIGS,
  }
}
