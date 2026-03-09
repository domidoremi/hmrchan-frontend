import { computed, onMounted, ref } from 'vue'
import { authService } from '@/api'

export function useTurnstileConfig() {
  const turnstileSiteKey = ref((import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim())
  const turnstileEnabled = computed(() => turnstileSiteKey.value.length > 0)

  onMounted(async () => {
    try {
      const config = await authService.getTurnstileConfig()
      if (!config.enabled) {
        turnstileSiteKey.value = ''
        return
      }

      turnstileSiteKey.value = (config.site_key ?? '').trim()
    } catch {
      // 降级到环境变量配置
    }
  })

  return {
    turnstileSiteKey,
    turnstileEnabled,
  }
}
