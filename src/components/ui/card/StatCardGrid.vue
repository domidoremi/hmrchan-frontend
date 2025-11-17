<template>
  <div class="stat-card-grid">
    <!-- Desktop: Grid Layout -->
    <div class="stat-grid stat-grid--desktop">
      <slot />
    </div>

    <!-- Mobile: Carousel Layout -->
    <div class="stat-carousel stat-carousel--mobile">
      <div class="carousel-container glass-card" @mouseenter="pauseAutoplay" @mouseleave="resumeAutoplay"
        @touchstart="pauseAutoplay" @touchend="resumeAutoplay">
        <button class="carousel-btn carousel-prev" @click="prevSlide" :aria-label="$t('common.previous', 'Previous')"
          :disabled="!canNavigate">
          <ChevronLeft :size="20" />
        </button>

        <div class="carousel-track-container">
          <div class="carousel-track" :style="trackStyle">
            <div v-for="(_, index) in slideCount" :key="index" class="carousel-slide">
              <slot :name="`slide-${index}`" />
            </div>
          </div>
        </div>

        <button class="carousel-btn carousel-next" @click="nextSlide" :aria-label="$t('common.next', 'Next')"
          :disabled="!canNavigate">
          <ChevronRight :size="20" />
        </button>
      </div>

      <!-- Progress Indicators -->
      <div v-if="slideCount > 1" class="carousel-indicators">
        <div v-for="index in slideCount" :key="index" class="indicator-progress"
          :class="{ active: currentSlide === index - 1 }" @click="goToSlide(index - 1)">
          <div class="progress-bar" :class="{ animating: currentSlide === index - 1 && !isPaused }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useSlots } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

export interface StatCardGridProps {
  autoplay?: boolean
  autoplayDuration?: number
  columns?: number | 'auto'
}

const props = withDefaults(defineProps<StatCardGridProps>(), {
  autoplay: true,
  autoplayDuration: 3000,
  columns: 'auto',
})

useI18n() // For i18n support in template
const slots = useSlots()

// Carousel state
const currentSlide = ref(0)
const isPaused = ref(false)
const autoplayInterval = ref<number | null>(null)

// Calculate slide count from named slots (for mobile carousel)
const slideCount = computed(() => {
  // 计算具名插槽 slide-0, slide-1, ... 的数量
  let count = 0
  while (slots[`slide-${count}`]) {
    count++
  }
  // 如果没有具名插槽，则使用default slot的长度
  if (count === 0) {
    const defaultSlot = slots.default?.()
    return defaultSlot?.length || 0
  }
  return count
})

const canNavigate = computed(() => slideCount.value > 1)

// Track transform style
const trackStyle = computed(() => ({
  transform: `translateX(-${currentSlide.value * 100}%)`,
}))

// Navigation functions
const prevSlide = () => {
  if (!canNavigate.value) return
  currentSlide.value = currentSlide.value > 0 ? currentSlide.value - 1 : slideCount.value - 1
  resetAutoplay()
}

const nextSlide = () => {
  if (!canNavigate.value) return
  currentSlide.value = currentSlide.value < slideCount.value - 1 ? currentSlide.value + 1 : 0
  resetAutoplay()
}

const goToSlide = (index: number) => {
  if (!canNavigate.value) return
  currentSlide.value = index
  isPaused.value = false
  resetAutoplay()
}

// Autoplay controls
const pauseAutoplay = () => {
  isPaused.value = true
  if (autoplayInterval.value) {
    clearInterval(autoplayInterval.value)
    autoplayInterval.value = null
  }
}

const resumeAutoplay = () => {
  isPaused.value = false
  if (props.autoplay) {
    startAutoplay()
  }
}

const resetAutoplay = () => {
  if (autoplayInterval.value) {
    clearInterval(autoplayInterval.value)
  }
  if (props.autoplay && !isPaused.value) {
    startAutoplay()
  }
}

const startAutoplay = () => {
  if (!props.autoplay || isPaused.value || !canNavigate.value) return
  autoplayInterval.value = window.setInterval(() => {
    nextSlide()
  }, props.autoplayDuration)
}

onMounted(() => {
  if (props.autoplay && canNavigate.value) {
    startAutoplay()
  }
})

onUnmounted(() => {
  if (autoplayInterval.value) {
    clearInterval(autoplayInterval.value)
  }
})
</script>

<style scoped>
.stat-card-grid {
  width: 100%;
}

/* Desktop Grid Layout */
.stat-grid--desktop {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

/* Mobile Carousel - Hidden by default */
.stat-carousel--mobile {
  display: none;
}

/* Carousel Container */
.carousel-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
}

.carousel-track-container {
  flex: 1;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.carousel-track {
  display: flex;
  transition: transform 0.3s ease-in-out;
}

.carousel-slide {
  min-width: 100%;
  flex-shrink: 0;
}

/* Carousel Buttons */
.carousel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.carousel-btn:hover:not(:disabled) {
  background: rgba(139, 92, 246, 0.15);
  border-color: var(--color-primary);
  transform: scale(1.05);
}

.carousel-btn:active:not(:disabled) {
  transform: scale(0.95);
  background: var(--glass-bg-light);
}

.carousel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Progress Indicators */
.carousel-indicators {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
  padding: 0 var(--spacing-md);
}

.indicator-progress {
  flex: 1;
  height: 4px;
  background: rgba(139, 92, 246, 0.2);
  border-radius: var(--radius-full);
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all var(--transition-fast);
}

.indicator-progress:hover {
  height: 6px;
  background: rgba(139, 92, 246, 0.3);
}

.indicator-progress.active {
  background: rgba(139, 92, 246, 0.4);
}

.progress-bar {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, var(--color-primary), #c084fc);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
}

.progress-bar.animating {
  animation: progressAnimation 3s linear forwards;
}

@keyframes progressAnimation {
  from {
    width: 0;
  }

  to {
    width: 100%;
  }
}

/* Responsive: Show carousel on mobile */
@media (max-width: 768px) {
  .stat-grid--desktop {
    display: none;
  }

  .stat-carousel--mobile {
    display: block;
  }
}

/* Tablet: 2 columns */
@media (min-width: 769px) and (max-width: 1100px) {
  .stat-grid--desktop {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
}
</style>
