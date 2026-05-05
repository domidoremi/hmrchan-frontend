import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useHmrScrollProgress() {
  const progress = ref(0)

  function updateProgress(): void {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    progress.value = scrollable <= 0 ? 0 : Math.min(Math.max(window.scrollY / scrollable, 0), 1)
  }

  onMounted(() => {
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', updateProgress)
    window.removeEventListener('resize', updateProgress)
  })

  return { progress, updateProgress }
}
