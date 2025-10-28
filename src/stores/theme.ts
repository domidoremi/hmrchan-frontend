/**
 * 主题状态管理
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Theme } from '@/types'

export const useThemeStore = defineStore('theme', () => {
  // 状态
  const theme = ref<Theme>('auto')
  const isDark = ref(false)

  // 初始化主题
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      theme.value = savedTheme
    }

    updateTheme()
  }

  // 更新主题
  function updateTheme() {
    let shouldBeDark = false

    if (theme.value === 'dark') {
      shouldBeDark = true
    } else if (theme.value === 'auto') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    isDark.value = shouldBeDark

    // 更新DOM
    if (shouldBeDark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }

  // 设置主题
  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    updateTheme()
  }

  // 切换主题
  function toggleTheme() {
    if (theme.value === 'light') {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }

  // 监听系统主题变化
  watch(
    () => theme.value,
    () => {
      if (theme.value === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = () => updateTheme()
        mediaQuery.addEventListener('change', handleChange)

        return () => mediaQuery.removeEventListener('change', handleChange)
      }
    },
  )

  return {
    theme,
    isDark,
    initTheme,
    setTheme,
    toggleTheme,
  }
})
