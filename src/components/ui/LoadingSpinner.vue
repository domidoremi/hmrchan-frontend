<template>
  <div :class="['spinner-wrapper', sizeClass]" aria-label="Loading">
    <div class="orbit-system" ref="orbitSystem">
      <!-- Central Core -->
      <div class="core"></div>

      <!-- Orbiting Particles -->
      <div class="orbit-ring ring-1">
        <div class="particle p1"></div>
      </div>
      <div class="orbit-ring ring-2">
        <div class="particle p2"></div>
      </div>
      <div class="orbit-ring ring-3">
        <div class="particle p3"></div>
      </div>
    </div>
    <p v-if="text" class="spinner-text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import { useAnimation } from '@/composables'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

const orbitSystem = ref<HTMLElement | null>(null)
let ctx: gsap.Context

const { shouldAnimate } = useAnimation()

const sizeClass = computed(() => `size-${props.size}`)

onMounted(() => {
  if (!shouldAnimate.value) {
    return
  }

  ctx = gsap.context(() => {
    // Core breathing
    gsap.to('.core', {
      scale: 1.2,
      opacity: 0.8,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })

    // Ring 1 rotation (Inner)
    gsap.to('.ring-1', {
      rotation: 360,
      duration: 3,
      repeat: -1,
      ease: 'none',
    })
    gsap.to('.p1', {
      scale: 1.2,
      duration: 0.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })

    // Ring 2 rotation (Middle)
    gsap.to('.ring-2', {
      rotation: -360,
      duration: 5,
      repeat: -1,
      ease: 'none',
    })
    gsap.to('.p2', {
      scale: 0.8,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 0.2,
    })

    // Ring 3 rotation (Outer)
    gsap.to('.ring-3', {
      rotation: 360,
      duration: 7,
      repeat: -1,
      ease: 'none',
    })
    gsap.to('.p3', {
      scale: 1.1,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 0.4,
    })
  }, orbitSystem.value!)
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<style scoped>
.spinner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  /* contain: layout paint; Removed to prevent clipping of orbiting particles */
  overflow: visible;
}

.orbit-system {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Sizes */
.size-sm .orbit-system {
  width: 32px;
  height: 32px;
}
.size-md .orbit-system {
  width: 64px;
  height: 64px;
}
.size-lg .orbit-system {
  width: 96px;
  height: 96px;
}

/* Core */
.core {
  position: absolute;
  border-radius: 50%;
  background-color: var(--color-primary);
  box-shadow: 0 0 20px var(--color-primary-transparent, rgba(var(--color-primary-rgb), 0.3));
}

.size-sm .core {
  width: 8px;
  height: 8px;
}
.size-md .core {
  width: 16px;
  height: 16px;
}
.size-lg .core {
  width: 24px;
  height: 24px;
}

/* Rings Container */
.orbit-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  /* Border for debugging path, can be removed or made very subtle */
  /* border: 1px solid rgba(var(--color-text-rgb), 0.05); */
}

/* Particles */
.particle {
  position: absolute;
  border-radius: 50%;
  background-color: var(--color-primary);
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
}

.size-sm .particle {
  width: 4px;
  height: 4px;
}
.size-md .particle {
  width: 8px;
  height: 8px;
}
.size-lg .particle {
  width: 12px;
  height: 12px;
}

/* Ring sizes relative to container */
.ring-1 {
  width: 60%;
  height: 60%;
}
.ring-2 {
  width: 80%;
  height: 80%;
}
.ring-3 {
  width: 100%;
  height: 100%;
}

/* Text */
.spinner-text {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  animation: pulse-text 2s ease-in-out infinite;
}

@keyframes pulse-text {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>
