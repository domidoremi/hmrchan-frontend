<template>
  <div class="optimized-image" :class="{ loaded: isLoaded, error: hasError }">
    <img
      ref="imgRef"
      :src="src"
      :alt="alt"
      :loading="lazy ? 'lazy' : 'eager'"
      :class="imgClass"
      @load="onLoad"
      @error="onError"
    />
    <div v-if="!isLoaded && !hasError" class="image-placeholder">
      <slot name="placeholder">
        <div class="placeholder-shimmer" />
      </slot>
    </div>
    <div v-if="hasError" class="image-error">
      <slot name="error">
        <ImageIcon :size="24" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ImageIcon } from 'lucide-vue-next'

interface Props {
  src: string
  alt?: string
  lazy?: boolean
  placeholder?: string
  imgClass?: string
}

withDefaults(defineProps<Props>(), {
  alt: '',
  lazy: true,
  placeholder: '',
  imgClass: '',
})

const imgRef = ref<HTMLImageElement | null>(null)
const isLoaded = ref(false)
const hasError = ref(false)

const onLoad = () => {
  isLoaded.value = true
}

const onError = () => {
  hasError.value = true
}

onMounted(() => {
  if (imgRef.value?.complete && imgRef.value.naturalHeight > 0) {
    isLoaded.value = true
  }
})
</script>

<style scoped>
.optimized-image {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.optimized-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.optimized-image:not(.loaded) img {
  opacity: 0;
}

.optimized-image.loaded img {
  opacity: 1;
}

.image-placeholder,
.image-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-secondary, #f0f0f0);
}

.placeholder-shimmer {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--color-surface-secondary, #f0f0f0) 25%,
    var(--color-surface, #e0e0e0) 50%,
    var(--color-surface-secondary, #f0f0f0) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.image-error {
  color: var(--color-text-tertiary, #999);
}
</style>
