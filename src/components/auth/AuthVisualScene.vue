<template>
  <div
    class="auth-scene"
    :class="{ 'auth-scene--compact': !showCopy }"
    role="presentation"
    aria-hidden="true"
  >
    <div class="scene-stage" :class="[sceneKindClass, sceneMoodClass]">
      <div class="scene-ambient" aria-hidden="true">
        <span class="scene-blob scene-blob--one" />
        <span class="scene-blob scene-blob--two" />
        <span class="scene-blob scene-blob--three" />
      </div>

      <div class="scene-fallback">
        <p class="scene-fallback__title">{{ title }}</p>
        <p class="scene-fallback__subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <p v-if="showCopy" class="scene-copy">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'AuthVisualScene' })

type VisualMood = 'idle' | 'typing' | 'dodge' | 'submitting' | 'success'
type SceneKind = 'login' | 'register' | 'forgot'

interface Props {
  title: string
  subtitle: string
  mood?: VisualMood
  sceneKind?: SceneKind
  showCopy?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mood: 'idle',
  sceneKind: 'login',
  showCopy: true,
})

const sceneKindClass = computed(() => `scene-stage--${props.sceneKind}`)
const sceneMoodClass = computed(() => `scene-stage--mood-${props.mood}`)
</script>

<style scoped>
.auth-scene {
  min-height: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: clamp(0.7rem, 1.8vw, 1.2rem);
  padding: clamp(0.9rem, 2.5vw, 1.7rem);
  background: transparent;
}

.auth-scene--compact {
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  padding: 0;
  min-height: 0;
}

.scene-stage {
  --scene-base: var(--color-surface-variant);
  --scene-top-wash: rgba(255, 255, 255, 0.82);
  --scene-bottom-wash: rgba(244, 246, 248, 0.92);
  --scene-fog: rgba(241, 243, 247, 0.96);
  --scene-blob-1: rgba(var(--color-primary-rgb), 0.18);
  --scene-blob-2: rgba(var(--color-accent-rgb), 0.18);
  --scene-blob-3: rgba(251, 146, 60, 0.18);
  --scene-blob-4: rgba(59, 130, 246, 0.16);
  --scene-blob-opacity: 0.86;
  --scene-blob-blur: 3.1rem;
  --fallback-title: #f8fafc;
  --fallback-subtitle: rgba(241, 245, 249, 0.84);
  position: relative;
  width: 100%;
  height: 100%;
  min-height: clamp(12rem, 22vw, 17.6rem);
  display: grid;
  align-items: end;
  overflow: hidden;
  border-radius: inherit;
  padding: clamp(1.15rem, 2.8vw, 1.9rem);
  background:
    linear-gradient(180deg, var(--scene-top-wash), var(--scene-bottom-wash) 72%, var(--scene-fog)),
    linear-gradient(
      145deg,
      var(--scene-base),
      color-mix(in srgb, var(--scene-base) 86%, #ffffff 14%)
    );
}

.auth-scene--compact .scene-stage {
  min-height: 0;
  border-radius: 0;
  padding: clamp(1rem, 2.8vw, 1.7rem);
}

.scene-stage::before,
.scene-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-stage::before {
  z-index: 0;
  background:
    radial-gradient(68% 58% at 18% 16%, var(--scene-blob-1), transparent 74%),
    radial-gradient(66% 54% at 84% 24%, var(--scene-blob-3), transparent 76%);
  filter: blur(3rem);
  opacity: 0.56;
}

.scene-stage::after {
  z-index: 2;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 34%, rgba(7, 20, 28, 0.34) 100%);
}

.scene-stage--login {
  --scene-blob-1: rgba(var(--color-primary-rgb), 0.22);
}

.scene-stage--register {
  --scene-blob-2: rgba(var(--color-accent-rgb), 0.24);
  --scene-blob-3: rgba(251, 146, 60, 0.22);
}

.scene-stage--forgot {
  --scene-blob-1: rgba(59, 130, 246, 0.22);
  --scene-blob-2: rgba(var(--color-accent-rgb), 0.18);
  --scene-blob-3: rgba(245, 158, 11, 0.18);
}

.scene-stage--mood-typing .scene-blob,
.scene-stage--mood-dodge .scene-blob {
  animation-duration: calc(var(--blob-duration) * 0.84);
}

.scene-stage--mood-submitting .scene-blob,
.scene-stage--mood-success .scene-blob {
  animation-duration: calc(var(--blob-duration) * 0.74);
}

.scene-ambient {
  position: absolute;
  inset: -12% -10% -18% -12%;
  pointer-events: none;
  z-index: 1;
}

.scene-blob {
  position: absolute;
  display: block;
  filter: blur(var(--scene-blob-blur));
  opacity: var(--scene-blob-opacity);
  transform-origin: center;
  will-change: transform, opacity;
  animation: scene-blob-breathe var(--blob-duration) ease-in-out infinite alternate;
  animation-delay: var(--blob-delay);
}

.scene-blob--one {
  top: 6%;
  left: -8%;
  width: 54%;
  height: 44%;
  border-radius: 61% 39% 54% 46% / 43% 58% 42% 57%;
  background: var(--scene-blob-1);
  --blob-rot: -12deg;
  --blob-x-start: -0.28rem;
  --blob-x-end: 0.72rem;
  --blob-y-start: 0rem;
  --blob-y-end: -0.56rem;
  --blob-scale-min: 0.96;
  --blob-scale-max: 1.05;
  --blob-duration: 8.6s;
  --blob-delay: -0.9s;
}

.scene-blob--two {
  top: -4%;
  right: -6%;
  width: 42%;
  height: 52%;
  border-radius: 42% 58% 36% 64% / 57% 39% 61% 43%;
  background: var(--scene-blob-3);
  --blob-rot: 17deg;
  --blob-x-start: -0.68rem;
  --blob-x-end: 0.42rem;
  --blob-y-start: -0.34rem;
  --blob-y-end: 0.56rem;
  --blob-scale-min: 0.95;
  --blob-scale-max: 1.06;
  --blob-duration: 9.4s;
  --blob-delay: -2.2s;
}

.scene-blob--three {
  bottom: -8%;
  right: 6%;
  width: 56%;
  height: 42%;
  border-radius: 66% 34% 47% 53% / 52% 38% 62% 48%;
  background: var(--scene-blob-4);
  --blob-rot: 8deg;
  --blob-x-start: -0.48rem;
  --blob-x-end: 0.24rem;
  --blob-y-start: 0.58rem;
  --blob-y-end: -0.36rem;
  --blob-scale-min: 0.97;
  --blob-scale-max: 1.07;
  --blob-duration: 10.4s;
  --blob-delay: -1.4s;
}

.scene-fallback {
  position: relative;
  z-index: 3;
  display: grid;
  gap: clamp(0.5rem, 1vw, 0.8rem);
  max-inline-size: min(100%, 34ch);
}

.scene-fallback__title {
  margin: 0;
  font-size: clamp(1.55rem, 1.2rem + 0.9vw, 2.3rem);
  font-weight: var(--font-semibold);
  color: var(--fallback-title);
  line-height: 1.08;
  letter-spacing: -0.03em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.scene-fallback__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--fallback-subtitle);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.scene-copy {
  margin: 0;
  max-width: 30ch;
  font-size: var(--text-sm);
  line-height: 1.58;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

@keyframes scene-blob-breathe {
  0% {
    transform: translate3d(var(--blob-x-start), var(--blob-y-start), 0) rotate(var(--blob-rot))
      scale(var(--blob-scale-min));
    opacity: calc(var(--scene-blob-opacity) * 0.88);
  }

  100% {
    transform: translate3d(var(--blob-x-end), var(--blob-y-end), 0) rotate(var(--blob-rot))
      scale(var(--blob-scale-max));
    opacity: calc(var(--scene-blob-opacity) * 1.06);
  }
}

@media (max-width: 56rem) {
  .auth-scene {
    min-height: 13rem;
    padding: clamp(0.75rem, 3.2vw, 1.15rem);
  }

  .auth-scene--compact {
    min-height: 0;
    padding: 0;
  }

  .scene-stage {
    min-height: clamp(10.5rem, 36vw, 13rem);
  }

  .scene-copy {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-blob {
    animation: none;
  }
}
</style>
