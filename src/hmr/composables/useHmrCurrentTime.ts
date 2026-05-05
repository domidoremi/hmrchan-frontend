import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export function useHmrCurrentTime(timeZone = 'Asia/Taipei') {
  const now = ref(new Date())
  let timer: number | undefined

  const currentTime = computed(() =>
    new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
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

  return { currentTime }
}
