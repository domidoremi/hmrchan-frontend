import { useSettingsStore, useThemeStore } from '@/stores'

/**
 * 初始化应用状态（主题与本地设置）
 *
 * - 默认情况下内部获取 store 并完成初始化
 * - 也可以传入已存在的 store 实例以复用调用方的上下文
 */
export function initAppState(
  themeStoreParam?: ReturnType<typeof useThemeStore>,
  settingsStoreParam?: ReturnType<typeof useSettingsStore>,
) {
  const themeStore = themeStoreParam ?? useThemeStore()
  const settingsStore = settingsStoreParam ?? useSettingsStore()

  themeStore.initTheme()
  settingsStore.initSettings()
}
