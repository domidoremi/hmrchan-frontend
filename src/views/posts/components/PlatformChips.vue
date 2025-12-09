<template>
  <div class="platform-chips-wrapper">
    <div ref="chipsRef" class="platform-chips" @scroll="checkScrollIndicators">
      <button
        v-for="platform in platforms"
        :key="platform.value"
        :class="['chip', { active: modelValue === platform.value }]"
        type="button"
        @click="selectPlatform(platform.value)"
        :aria-label="`${$t('filter.filterBy')} ${platform.label}`"
        :aria-pressed="modelValue === platform.value"
      >
        <span class="chip-icon" aria-hidden="true">
          <component :is="platform.icon" :size="18" />
        </span>
        <span class="chip-label">{{ platform.label }}</span>
        <Transition name="scale-in">
          <span v-if="modelValue === platform.value" class="chip-check" aria-hidden="true">
            <Check :size="14" />
          </span>
        </Transition>
      </button>
    </div>

    <!-- 滚动指示器 -->
    <Transition name="fade">
      <div v-if="showLeftScroll" class="chips-indicator left" aria-hidden="true"></div>
    </Transition>
    <Transition name="fade">
      <div v-if="showRightScroll" class="chips-indicator right" aria-hidden="true"></div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Check } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores'
import { storeToRefs } from 'pinia'
import gsap from 'gsap'
import type { PlatformOption } from '@/types'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  /** 平台选项列表 */
  platforms: PlatformOption[]
  /** 当前选中的平台值 */
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

// ============================================================================
// Refs & Stores
// ============================================================================

const chipsRef = ref<HTMLElement | null>(null)
const showLeftScroll = ref(false)
const showRightScroll = ref(false)

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

// ============================================================================
// Methods
// ============================================================================

/**
 * 检查滚动指示器显示状态
 */
const checkScrollIndicators = () => {
  const el = chipsRef.value
  if (!el) return

  showLeftScroll.value = el.scrollLeft > 10
  showRightScroll.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 10
}

/**
 * 选择平台
 */
const selectPlatform = (platform: string) => {
  if (props.modelValue === platform) return

  emit('update:modelValue', platform)
  emit('change', platform)

  // Haptic feedback 动画
  if (settings.value.enableAnimations) {
    gsap.to('.chip.active', {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
    })
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  checkScrollIndicators()

  // 监听窗口大小变化
  window.addEventListener('resize', checkScrollIndicators, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScrollIndicators)
})
</script>

<style scoped>
.platform-chips-wrapper {
  position: relative;
  flex: 1 1 100%;
}

.platform-chips {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
  scroll-behavior: smooth;
}

.platform-chips::-webkit-scrollbar {
  display: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-size: 0.9rem;
  font-weight: 500;
}

.chip:hover {
  border-color: rgba(139, 92, 246, 0.4);
  background: rgba(139, 92, 246, 0.08);
}

.chip:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.chip.active {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(192, 132, 252, 0.15));
  border-color: rgba(139, 92, 246, 0.6);
  color: var(--color-primary);
  box-shadow: 0 8px 22px -12px rgba(139, 92, 246, 0.45);
}

.chip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chip-label {
  line-height: 1;
}

.chip-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.chips-indicator {
  position: absolute;
  top: 0;
  bottom: 4px;
  width: 36px;
  pointer-events: none;
  z-index: 1;
}

.chips-indicator.left {
  left: 0;
  background: linear-gradient(to right, var(--color-bg-primary), transparent);
}

.chips-indicator.right {
  right: 0;
  background: linear-gradient(to left, var(--color-bg-primary), transparent);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .platform-chips {
    padding-inline: 2px;
  }

  .chip {
    padding: 8px 14px;
    font-size: 0.85rem;
  }
}

/* ========== 深色模式 ========== */
[data-theme='dark'] .chip {
  background: rgba(15, 23, 42, 0.72);
  color: rgba(226, 232, 240, 0.85);
}

[data-theme='dark'] .chip:hover {
  background: rgba(139, 92, 246, 0.12);
}

[data-theme='dark'] .chips-indicator.left {
  background: linear-gradient(to right, var(--color-bg-secondary), transparent);
}

[data-theme='dark'] .chips-indicator.right {
  background: linear-gradient(to left, var(--color-bg-secondary), transparent);
}

/* ========== 动画 ========== */
.scale-in-enter-active,
.scale-in-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.scale-in-enter-from,
.scale-in-leave-to {
  opacity: 0;
  transform: scale(0);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
