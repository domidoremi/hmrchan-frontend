import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

function formatTimeZoneLabel(value: string): string {
  const city = value.split('/').pop()?.replaceAll('_', ' ') ?? value
  return city || 'Local'
}

export function useHmrCurrentTime(timeZone?: string) {
  const now = ref(new Date())
  let timer: number | undefined
  const timeZoneLabel = computed(() => (timeZone ? formatTimeZoneLabel(timeZone) : 'Local'))

  const currentTime = computed(() =>
    new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    }).format(now.value)
  )

  onMounted(() => {
    timer = window.setInterval(() => {
      now.value = new Date()
    }, 1000)
  })

  onBeforeUnmount(() => {
    if (timer !== undefined) {
      window.clearInterval(timer)
    }
  })

  return { currentTime, timeZoneLabel }
}
