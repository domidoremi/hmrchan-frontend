<template>
  <Teleport to="body">
    <Transition name="drawer-slide">
      <div v-if="visible" class="drawer-overlay">
        <!-- 背景遮罩 -->
        <div class="drawer-backdrop" @click="handleClose" aria-hidden="true"></div>

        <!-- 抽屉面板 -->
        <div
          ref="drawerRef"
          class="drawer-panel"
          :style="drawerStyle"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('post.preview')"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <!-- 拖拽手柄 -->
          <div class="drawer-handle">
            <div class="drawer-handle-bar"></div>
          </div>

          <!-- 内容区域 -->
          <div class="drawer-content">
            <PostPreviewPanel :post="post" :loading="loading" :error="error" @close="handleClose" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import PostPreviewPanel from '@/components/business/PostPreviewPanel.vue'
import { useMobileDrawer } from '../composables/useMobileDrawer'
import type { PostDetail } from '@/types'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  /** 是否显示抽屉 */
  visible: boolean
  /** 预览的帖子 */
  post: PostDetail | null
  /** 是否加载中 */
  loading?: boolean
  /** 错误信息 */
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:visible', value: boolean): void
}>()

// ============================================================================
// Composables
// ============================================================================

const { drawerRef, drawerStyle, onTouchStart, onTouchMove, onTouchEnd, reset } = useMobileDrawer({
  closeThreshold: 120,
  handleHeight: 48,
  onClose: handleClose,
})

// ============================================================================
// Methods
// ============================================================================

/**
 * 关闭抽屉
 */
function handleClose() {
  reset()
  emit('close')
  emit('update:visible', false)
}

// ============================================================================
// Body Scroll Lock
// ============================================================================

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.body.classList.add('no-scroll')
    } else {
      document.body.classList.remove('no-scroll')
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  document.body.classList.remove('no-scroll')
})
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 120;
}

.drawer-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
}

.drawer-panel {
  position: relative;
  width: 100%;
  max-height: 85vh;
  background: var(--color-bg-primary);
  border-radius: 20px 20px 0 0;
  box-shadow:
    0 -8px 32px rgba(0, 0, 0, 0.15),
    0 -2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  touch-action: none;
}

.drawer-handle {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0 8px;
  cursor: grab;
  touch-action: none;
}

.drawer-handle:active {
  cursor: grabbing;
}

.drawer-handle-bar {
  width: 36px;
  height: 4px;
  background: var(--color-border-secondary);
  border-radius: 2px;
  transition: background 0.2s ease;
}

.drawer-handle:hover .drawer-handle-bar,
.drawer-handle:active .drawer-handle-bar {
  background: var(--color-text-tertiary);
}

.drawer-content {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 0 16px 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

/* ========== 动画 ========== */
.drawer-slide-enter-active {
  transition: opacity 0.3s ease;
}

.drawer-slide-enter-active .drawer-panel {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.drawer-slide-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-slide-leave-active .drawer-panel {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
}

.drawer-slide-enter-from .drawer-panel,
.drawer-slide-leave-to .drawer-panel {
  transform: translateY(100%);
}

/* ========== 深色模式 ========== */
[data-theme='dark'] .drawer-panel {
  background: var(--color-bg-secondary);
  box-shadow:
    0 -8px 32px rgba(0, 0, 0, 0.4),
    0 -2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

[data-theme='dark'] .drawer-backdrop {
  background: rgba(0, 0, 0, 0.7);
}
</style>
