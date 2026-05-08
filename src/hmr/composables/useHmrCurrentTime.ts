import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

function formatTimeZoneLabel(value: string): string {
  const parts = new Intl.DateTimeFormat(navigator.language, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: value,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date())
  const offset = parts.find((item) => item.type === 'timeZoneName')?.value
  return offset?.replace('GMT', 'UTC') || 'Local'
}

export function useHmrCurrentTime(timeZone?: string) {
  const now = ref(new Date())
  let timer: number | undefined
  const resolvedTimeZone = computed(() => {
    if (timeZone) return timeZone
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  })
  const timeZoneLabel = computed(() =>
    resolvedTimeZone.value ? formatTimeZoneLabel(resolvedTimeZone.value) : 'Local'
  )

  const currentTime = computed(() =>
    new Intl.DateTimeFormat(navigator.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...(resolvedTimeZone.value ? { timeZone: resolvedTimeZone.value } : {}),
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
