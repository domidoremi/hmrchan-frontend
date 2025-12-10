<template>
  <div
    class="search-input-wrapper"
    :class="{
      'is-focused': isFocused,
      'is-loading': loading,
      'has-value': modelValue,
    }"
  >
    <div class="search-input-inner">
      <Search :size="18" class="search-icon" />
      <input
        ref="inputRef"
        type="search"
        class="search-input"
        :value="modelValue"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown.enter="handleSubmit"
        @keydown.escape="handleClear"
      />
      <Transition name="fade">
        <button
          v-if="modelValue && !loading"
          type="button"
          class="clear-button"
          :aria-label="$t('common.clear', 'Clear')"
          @click="handleClear"
        >
          <X :size="16" />
        </button>
      </Transition>
      <Transition name="fade">
        <div v-if="loading" class="loading-spinner">
          <Loader2 :size="16" class="spinner-icon" />
        </div>
      </Transition>
    </div>
    <kbd v-if="showShortcut && !isFocused" class="search-shortcut">
      <span>{{ isMac ? '⌘' : 'Ctrl' }}</span>
      <span>K</span>
    </kbd>
  </div>
</template>

<script setup lang="ts">
/**
 * SearchInput - 现代化搜索输入组件
 *
 * 功能特点：
 * - 防抖搜索（300ms 默认）
 * - 清除按钮
 * - 加载状态指示
 * - 键盘快捷键支持 (Ctrl/Cmd + K)
 * - 无障碍支持
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, X, Loader2 } from 'lucide-vue-next'

interface Props {
  /** 输入值 (v-model) */
  modelValue?: string
  /** 占位文本 */
  placeholder?: string
  /** 无障碍标签 */
  ariaLabel?: string
  /** 防抖延迟 (ms) */
  debounceMs?: number
  /** 是否加载中 */
  loading?: boolean
  /** 是否显示快捷键提示 */
  showShortcut?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '搜索内容...',
  ariaLabel: 'Search',
  debounceMs: 300,
  loading: false,
  showShortcut: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  clear: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)

// 检测是否为 Mac 系统
const isMac = computed(() => {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform)
})

// 防抖更新
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const debouncedEmit = (value: string) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('search', value)
  }, props.debounceMs)
}

const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  debouncedEmit(value)
}

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
}

const handleSubmit = () => {
  emit('search', props.modelValue)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  emit('search', '')
  inputRef.value?.focus()
}

// 全局键盘快捷键
const handleGlobalKeydown = (event: KeyboardEvent) => {
  const isMeta = isMac.value ? event.metaKey : event.ctrlKey
  if (isMeta && event.key === 'k') {
    event.preventDefault()
    inputRef.value?.focus()
  }
}

// 暴露方法
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  clear: handleClear,
})

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  max-width: 400px;
}

.search-input-inner {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 var(--spacing-md);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-input-wrapper.is-focused .search-input-inner {
  background: var(--color-bg-primary);
  border-color: var(--color-primary);
  box-shadow:
    0 0 0 4px rgba(139, 92, 246, 0.2),
    0 4px 16px rgba(139, 92, 246, 0.15);
  transform: translateY(-1px);
}

.search-input-wrapper.is-loading .search-input-inner {
  border-color: var(--color-primary);
}

.search-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  transition: color 0.2s ease;
}

.search-input-wrapper.is-focused .search-icon {
  color: var(--color-primary);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 var(--spacing-sm);
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-family: inherit;
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

/* 移除搜索框默认样式 */
.search-input::-webkit-search-cancel-button,
.search-input::-webkit-search-decoration,
.search-input::-webkit-search-results-button,
.search-input::-webkit-search-results-decoration {
  display: none;
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-text-tertiary);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.clear-button:hover {
  background: var(--color-text-secondary);
  transform: scale(1.1);
}

.clear-button:active {
  transform: scale(0.95);
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.spinner-icon {
  color: var(--color-primary);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.search-shortcut {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
}

.search-shortcut span {
  padding: 0 2px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .search-input-wrapper {
    max-width: none;
  }

  .search-input-inner {
    height: 40px;
  }

  .search-shortcut {
    display: none;
  }
}

@media (max-width: 480px) {
  .search-input-inner {
    height: 38px;
    padding: 0 var(--spacing-sm);
  }

  .search-input {
    font-size: var(--text-base);
  }
}
</style>
