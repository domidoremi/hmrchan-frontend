<template>
  <div v-if="show" class="image-viewer-overlay" @click="close">
    <div class="image-viewer" @click.stop>
      <!-- 关闭按钮 -->
      <button class="viewer-btn close-btn" @click="close">
        <X :size="24" />
      </button>

      <!-- 上一张按钮 -->
      <button
        v-if="images.length > 1"
        class="viewer-btn prev-btn"
        @click="prev"
        :disabled="currentIndex === 0"
      >
        <ChevronLeft :size="32" />
      </button>

      <!-- 图片 -->
      <div class="image-container">
        <img
          :src="currentImage"
          :alt="`Image ${currentIndex + 1}`"
          @load="onImageLoad"
          :style="imageStyle"
        />
        <div v-if="loading" class="loading-spinner">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- 下一张按钮 -->
      <button
        v-if="images.length > 1"
        class="viewer-btn next-btn"
        @click="next"
        :disabled="currentIndex === images.length - 1"
      >
        <ChevronRight :size="32" />
      </button>

      <!-- 图片信息 -->
      <div class="image-info">
        <span>{{ currentIndex + 1 }} / {{ images.length }}</span>
        <div class="zoom-controls">
          <button @click="zoomOut" class="zoom-btn">
            <ZoomOut :size="20" />
          </button>
          <span>{{ Math.round(zoom * 100) }}%</span>
          <button @click="zoomIn" class="zoom-btn">
            <ZoomIn :size="20" />
          </button>
          <button @click="resetZoom" class="zoom-btn">
            <Maximize2 :size="20" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-vue-next'

interface Props {
  show: boolean
  images: string[]
  initialIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0,
})

const emit = defineEmits<{
  close: []
}>()

const currentIndex = ref(props.initialIndex)
const loading = ref(true)
const zoom = ref(1)

const currentImage = computed(() => props.images[currentIndex.value])

const imageStyle = computed(() => ({
  transform: `scale(${zoom.value})`,
  transition: 'transform 0.3s ease',
}))

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      currentIndex.value = props.initialIndex
      zoom.value = 1
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
)

watch(currentIndex, () => {
  loading.value = true
  zoom.value = 1
})

const close = () => {
  emit('close')
}

const prev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const next = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
  }
}

const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.25, 3)
}

const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.25, 0.5)
}

const resetZoom = () => {
  zoom.value = 1
}

const onImageLoad = () => {
  loading.value = false
}

// 键盘快捷键
const handleKeydown = (e: KeyboardEvent) => {
  if (!props.show) return

  switch (e.key) {
    case 'Escape':
      close()
      break
    case 'ArrowLeft':
      prev()
      break
    case 'ArrowRight':
      next()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}
</script>

<style scoped>
.image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-btn {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.viewer-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.viewer-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.close-btn {
  top: 20px;
  right: 20px;
}

.prev-btn {
  left: 40px;
  top: 50%;
  transform: translateY(-50%);
}

.next-btn {
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
}

.image-container {
  position: relative;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-container img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  cursor: zoom-in;
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.image-info {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 30px;
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zoom-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: background 0.3s ease;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
  .prev-btn {
    left: 10px;
  }

  .next-btn {
    right: 10px;
  }

  .viewer-btn {
    padding: 8px;
  }

  .image-info {
    bottom: 10px;
    padding: 8px 16px;
    font-size: 12px;
    gap: 12px;
  }
}
</style>
