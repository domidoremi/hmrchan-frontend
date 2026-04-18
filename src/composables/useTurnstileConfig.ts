import { computed, ref } from 'vue'

const sharedTurnstileSiteKey = ref((import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim())

export function useTurnstileConfig() {
  const turnstileEnabled = computed(() => sharedTurnstileSiteKey.value.length > 0)

  return {
    turnstileSiteKey: sharedTurnstileSiteKey,
    turnstileEnabled,
  }
}
