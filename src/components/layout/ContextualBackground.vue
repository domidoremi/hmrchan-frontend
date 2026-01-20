<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useContextualBackground } from '@/composables/useContextualBackground'
import { useThemeStore } from '@/stores/theme'

const { config, isTransitioning } = useContextualBackground()
const themeStore = useThemeStore()

const scrollY = ref(0)
const mouseX = ref(0)
const mouseY = ref(0)

let rafId: number | null = null
let pendingScroll = false
let pendingMouse = false
let lastMouseX = 0
let lastMouseY = 0

const handleScroll = () => {
  if (!pendingScroll) {
    pendingScroll = true
    rafId = requestAnimationFrame(() => {
      scrollY.value = window.scrollY
      pendingScroll = false
    })
  }
}

const handleMouseMove = (e: MouseEvent) => {
  lastMouseX = (e.clientX / window.innerWidth - 0.5) * 20
  lastMouseY = (e.clientY / window.innerHeight - 0.5) * 20

  if (!pendingMouse) {
    pendingMouse = true
    rafId = requestAnimationFrame(() => {
      mouseX.value = lastMouseX
      mouseY.value = lastMouseY
      pendingMouse = false
    })
  }
}

const transformStyle = computed(() => {
  const parallax = scrollY.value * 0.3
  return `translate3d(${mouseX.value}px, ${mouseY.value - parallax}px, 0)`
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('mousemove', handleMouseMove, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('mousemove', handleMouseMove)
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<template>
  <div class="contextual-background" :data-theme="themeStore.resolvedTheme">
    <!-- Base layer with overlay for content readability -->
    <div class="background-overlay" />

    <!-- 3D background layer -->
    <div
      class="background-layer"
      :class="[config.className, { 'is-transitioning': isTransitioning }]"
      :style="{ transform: transformStyle }"
    >
      <div class="background-content" />
    </div>
  </div>
</template>

<style scoped>
.contextual-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
  background: var(--color-background);
  transition: background-color 0.3s ease;
}

.background-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 2;
  pointer-events: none;
  transition: background-color 0.3s ease;
}

/* Dark mode overlay */
.contextual-background[data-theme='dark'] .background-overlay {
  background: rgba(6, 8, 16, 0.85);
}

.background-layer {
  position: absolute;
  inset: -10%;
  width: 120%;
  height: 120%;
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.background-layer.is-transitioning {
  opacity: 0.5;
}

.background-content {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  animation: float 20s ease-in-out infinite;
}

/* ========== Home - The Core ========== */
.bg-home-core .background-content {
  background-image: radial-gradient(
    ellipse at center,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(99, 102, 241, 0.05) 50%,
    transparent 100%
  );
}

.bg-home-core .background-content::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 400px;
  height: 400px;
  transform: translate(-50%, -50%) rotate(0deg);
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.3) 0%,
    rgba(129, 140, 248, 0.2) 50%,
    rgba(165, 180, 252, 0.1) 100%
  );
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  filter: blur(1px) drop-shadow(0 20px 40px rgba(99, 102, 241, 0.3));
  animation: rotate-core 30s linear infinite;
}

/* Dark mode - Home Core */
.contextual-background[data-theme='dark'] .bg-home-core .background-content {
  background-image: radial-gradient(
    ellipse at center,
    rgba(129, 140, 248, 0.25) 0%,
    rgba(129, 140, 248, 0.1) 50%,
    transparent 100%
  );
}

.contextual-background[data-theme='dark'] .bg-home-core .background-content::before {
  background: linear-gradient(
    135deg,
    rgba(129, 140, 248, 0.4) 0%,
    rgba(165, 180, 252, 0.3) 50%,
    rgba(199, 210, 254, 0.15) 100%
  );
  filter: blur(2px) drop-shadow(0 20px 60px rgba(129, 140, 248, 0.5));
}

/* ========== Explore Default - Aerogel ========== */
.bg-explore-aerogel .background-content {
  background:
    radial-gradient(circle at 30% 40%, rgba(165, 180, 252, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(129, 140, 248, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 50% 80%, rgba(199, 210, 254, 0.1) 0%, transparent 50%);
  animation: float-bubbles 25s ease-in-out infinite;
}

/* Dark mode - Aerogel */
.contextual-background[data-theme='dark'] .bg-explore-aerogel .background-content {
  background:
    radial-gradient(circle at 30% 40%, rgba(129, 140, 248, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(99, 102, 241, 0.12) 0%, transparent 50%),
    radial-gradient(circle at 50% 80%, rgba(165, 180, 252, 0.08) 0%, transparent 50%);
}

/* ========== Explore Instagram - Optical Glass ========== */
.bg-explore-glass .background-content {
  background-image:
    linear-gradient(
      45deg,
      transparent 48%,
      rgba(99, 102, 241, 0.1) 49%,
      rgba(99, 102, 241, 0.1) 51%,
      transparent 52%
    ),
    linear-gradient(
      -45deg,
      transparent 48%,
      rgba(129, 140, 248, 0.08) 49%,
      rgba(129, 140, 248, 0.08) 51%,
      transparent 52%
    );
  background-size: 80px 80px;
  background-position:
    0 0,
    40px 40px;
  animation: prism-shift 15s linear infinite;
}

.bg-explore-glass .background-content::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
}

/* Dark mode - Glass */
.contextual-background[data-theme='dark'] .bg-explore-glass .background-content {
  background-image:
    linear-gradient(
      45deg,
      transparent 48%,
      rgba(129, 140, 248, 0.15) 49%,
      rgba(129, 140, 248, 0.15) 51%,
      transparent 52%
    ),
    linear-gradient(
      -45deg,
      transparent 48%,
      rgba(165, 180, 252, 0.12) 49%,
      rgba(165, 180, 252, 0.12) 51%,
      transparent 52%
    );
}

.contextual-background[data-theme='dark'] .bg-explore-glass .background-content::after {
  background: radial-gradient(circle at 50% 50%, rgba(129, 140, 248, 0.1) 0%, transparent 70%);
}

/* ========== Explore TikTok - Liquid Silk ========== */
.bg-explore-liquid .background-content {
  background: linear-gradient(
    120deg,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(129, 140, 248, 0.1) 25%,
    rgba(165, 180, 252, 0.15) 50%,
    rgba(129, 140, 248, 0.1) 75%,
    rgba(99, 102, 241, 0.15) 100%
  );
  background-size: 200% 200%;
  animation: liquid-flow 8s ease-in-out infinite;
}

.bg-explore-liquid .background-content::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 40%);
  animation: silk-shimmer 6s ease-in-out infinite;
}

/* Dark mode - Liquid */
.contextual-background[data-theme='dark'] .bg-explore-liquid .background-content {
  background: linear-gradient(
    120deg,
    rgba(129, 140, 248, 0.2) 0%,
    rgba(165, 180, 252, 0.15) 25%,
    rgba(199, 210, 254, 0.2) 50%,
    rgba(165, 180, 252, 0.15) 75%,
    rgba(129, 140, 248, 0.2) 100%
  );
}

.contextual-background[data-theme='dark'] .bg-explore-liquid .background-content::before {
  background: radial-gradient(ellipse at 30% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 40%);
}

/* ========== Explore YouTube - Deep Ripples ========== */
.bg-explore-ripples .background-content {
  background:
    radial-gradient(
      circle at center,
      transparent 30%,
      rgba(67, 56, 202, 0.03) 31%,
      transparent 32%
    ),
    radial-gradient(
      circle at center,
      transparent 45%,
      rgba(67, 56, 202, 0.05) 46%,
      transparent 47%
    ),
    radial-gradient(
      circle at center,
      transparent 60%,
      rgba(67, 56, 202, 0.04) 61%,
      transparent 62%
    ),
    radial-gradient(circle at center, transparent 75%, rgba(67, 56, 202, 0.03) 76%, transparent 77%);
  background-size: 100% 100%;
  animation: ripple-expand 12s ease-out infinite;
}

/* Dark mode - Ripples */
.contextual-background[data-theme='dark'] .bg-explore-ripples .background-content {
  background:
    radial-gradient(
      circle at center,
      transparent 30%,
      rgba(129, 140, 248, 0.08) 31%,
      transparent 32%
    ),
    radial-gradient(
      circle at center,
      transparent 45%,
      rgba(129, 140, 248, 0.12) 46%,
      transparent 47%
    ),
    radial-gradient(
      circle at center,
      transparent 60%,
      rgba(129, 140, 248, 0.1) 61%,
      transparent 62%
    ),
    radial-gradient(
      circle at center,
      transparent 75%,
      rgba(129, 140, 248, 0.08) 76%,
      transparent 77%
    );
}

/* ========== Explore Twitter - Fiber Optic Network ========== */
.bg-explore-network .background-content {
  background-image:
    radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 2%),
    radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 2%),
    radial-gradient(circle at 40% 70%, rgba(99, 102, 241, 0.15) 0%, transparent 2%),
    radial-gradient(circle at 70% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 2%),
    radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 2%);
  animation: network-pulse 4s ease-in-out infinite;
}

.bg-explore-network .background-content::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      45deg,
      transparent 48%,
      rgba(99, 102, 241, 0.05) 49%,
      rgba(99, 102, 241, 0.05) 50%,
      transparent 51%
    ),
    linear-gradient(
      -45deg,
      transparent 48%,
      rgba(99, 102, 241, 0.05) 49%,
      rgba(99, 102, 241, 0.05) 50%,
      transparent 51%
    );
  background-size: 200px 200px;
}

/* Dark mode - Network */
.contextual-background[data-theme='dark'] .bg-explore-network .background-content {
  background-image:
    radial-gradient(circle at 20% 30%, rgba(129, 140, 248, 0.25) 0%, transparent 2%),
    radial-gradient(circle at 80% 20%, rgba(129, 140, 248, 0.25) 0%, transparent 2%),
    radial-gradient(circle at 40% 70%, rgba(129, 140, 248, 0.25) 0%, transparent 2%),
    radial-gradient(circle at 70% 80%, rgba(129, 140, 248, 0.25) 0%, transparent 2%),
    radial-gradient(circle at 50% 50%, rgba(129, 140, 248, 0.25) 0%, transparent 2%);
}

.contextual-background[data-theme='dark'] .bg-explore-network .background-content::before {
  background:
    linear-gradient(
      45deg,
      transparent 48%,
      rgba(129, 140, 248, 0.1) 49%,
      rgba(129, 140, 248, 0.1) 50%,
      transparent 51%
    ),
    linear-gradient(
      -45deg,
      transparent 48%,
      rgba(129, 140, 248, 0.1) 49%,
      rgba(129, 140, 248, 0.1) 50%,
      transparent 51%
    );
}

/* ========== Animations ========== */
@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.02);
  }
}

@keyframes rotate-core {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes float-bubbles {
  0%,
  100% {
    transform: translate(0, 0);
  }
  33% {
    transform: translate(20px, -30px);
  }
  66% {
    transform: translate(-20px, 20px);
  }
}

@keyframes prism-shift {
  from {
    background-position:
      0 0,
      40px 40px;
  }
  to {
    background-position:
      80px 80px,
      120px 120px;
  }
}

@keyframes liquid-flow {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes silk-shimmer {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(50px);
  }
}

@keyframes ripple-expand {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0.3;
  }
}

@keyframes network-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* ========== Responsive adjustments ========== */
@media (max-width: 768px) {
  .bg-home-core .background-content::before {
    width: 250px;
    height: 250px;
  }
}
</style>
