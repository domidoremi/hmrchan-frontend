<template>
  <div
    class="auth-scene"
    :class="{ 'auth-scene--compact': !showCopy }"
    role="presentation"
    aria-hidden="true"
  >
    <div class="scene-stage" :class="[sceneKindClass, sceneMoodClass]">
      <div class="scene-sky">
        <span class="scene-cloud scene-cloud--one" />
        <span class="scene-cloud scene-cloud--two" />
      </div>

      <div class="scene-canopy">
        <span class="scene-leaf scene-leaf--one" />
        <span class="scene-leaf scene-leaf--two" />
        <span class="scene-leaf scene-leaf--three" />
      </div>

      <div class="scene-ground">
        <span class="scene-hill scene-hill--back" />
        <span class="scene-hill scene-hill--front" />
        <span class="scene-ripple scene-ripple--one" />
        <span class="scene-ripple scene-ripple--two" />
      </div>

      <div class="scene-copy-card">
        <p class="scene-copy-card__eyebrow">{{ sceneLabel }}</p>
        <h2 class="scene-copy-card__title">{{ title }}</h2>
        <p class="scene-copy-card__subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <p v-if="showCopy" class="scene-caption">{{ subtitle }}</p>
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
const sceneLabel = computed(() => {
  if (props.sceneKind === 'register') return 'Grow'
  if (props.sceneKind === 'forgot') return 'Restore'
  return 'Return'
})
</script>

<style scoped>
.auth-scene {
  --auth-visual-ink-a: color-mix(
    in srgb,
    var(--page-shell-surface-bg-strong) 78%,
    rgba(56, 189, 248, 0.22)
  );
  --auth-visual-ink-b: color-mix(
    in srgb,
    var(--page-shell-surface-bg) 82%,
    rgba(14, 165, 233, 0.18)
  );
  --auth-visual-ink-c: color-mix(
    in srgb,
    var(--page-shell-surface-bg-strong) 88%,
    rgba(15, 23, 42, 0.1)
  );
  --auth-visual-ground-a: color-mix(
    in srgb,
    var(--page-shell-surface-bg-strong) 72%,
    rgba(16, 185, 129, 0.22)
  );
  --auth-visual-ground-b: color-mix(
    in srgb,
    var(--page-shell-surface-bg-strong) 74%,
    rgba(59, 130, 246, 0.2)
  );
  --auth-visual-copy: color-mix(in srgb, var(--color-text-primary) 92%, white 8%);
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 0.9rem;
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 100%;
  padding: clamp(0.9rem, 2vw, 1.2rem);
}

.auth-scene--compact {
  padding: 0;
  gap: 0;
}

.scene-stage {
  --scene-leaf-duration: 8.6s;
  --scene-cloud-duration: 18s;
  position: relative;
  overflow: hidden;
  display: grid;
  align-items: end;
  min-block-size: clamp(12rem, 24vw, 18rem);
  padding: clamp(1.1rem, 2.4vw, 1.6rem);
  border-radius: inherit;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 32%),
    linear-gradient(180deg, rgba(5, 20, 28, 0.06), rgba(4, 16, 24, 0.22)),
    linear-gradient(
      145deg,
      var(--auth-visual-ink-a),
      var(--auth-visual-ink-b) 56%,
      var(--auth-visual-ink-c)
    );
}

.scene-sky,
.scene-canopy,
.scene-ground {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-cloud,
.scene-leaf,
.scene-hill,
.scene-ripple {
  position: absolute;
  display: block;
}

.scene-cloud {
  block-size: 1.6rem;
  border-radius: 999rem;
  background: rgba(255, 255, 255, 0.12);
  filter: blur(0.18rem);
  animation: scene-cloud-drift var(--scene-cloud-duration) linear infinite;
}

.scene-cloud--one {
  inset-block-start: 16%;
  inset-inline-start: 12%;
  inline-size: 7rem;
}

.scene-cloud--two {
  inset-block-start: 26%;
  inset-inline-end: 16%;
  inline-size: 5.5rem;
  animation-duration: calc(var(--scene-cloud-duration) * 0.82);
}

.scene-leaf {
  inline-size: clamp(3.2rem, 10vw, 5rem);
  aspect-ratio: 1 / 1.6;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 42%),
    linear-gradient(160deg, rgba(110, 183, 171, 0.82), rgba(21, 111, 108, 0.34));
  clip-path: path(
    'M 50 0 C 82 10 100 42 98 76 C 95 120 63 156 50 176 C 38 155 4 118 2 76 C 0 42 18 10 50 0 Z'
  );
  transform-origin: top center;
  filter: drop-shadow(0 0.65rem 1rem rgba(0, 0, 0, 0.12));
  animation: scene-leaf-sway var(--scene-leaf-duration) ease-in-out infinite alternate;
}

.scene-leaf--one {
  inset-block-start: -2%;
  inset-inline-start: 10%;
}

.scene-leaf--two {
  inset-block-start: 8%;
  inset-inline-end: 14%;
  animation-duration: calc(var(--scene-leaf-duration) * 0.9);
}

.scene-leaf--three {
  inset-block-start: 18%;
  inset-inline-end: 4%;
  inline-size: clamp(2.6rem, 8vw, 4rem);
  animation-duration: calc(var(--scene-leaf-duration) * 1.14);
}

.scene-hill {
  inset-block-end: 0;
  border-radius: 50% 50% 0 0;
}

.scene-hill--back {
  inset-inline-start: -8%;
  inline-size: 74%;
  block-size: 34%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(10, 32, 38, 0.32)),
    color-mix(in srgb, var(--auth-visual-ground-a) 58%, rgba(12, 32, 36, 0.42));
}

.scene-hill--front {
  inset-inline-end: -10%;
  inline-size: 76%;
  block-size: 28%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(8, 24, 32, 0.42)),
    color-mix(in srgb, var(--auth-visual-ground-b) 52%, rgba(7, 22, 30, 0.52));
}

.scene-ripple {
  inset-inline-start: 50%;
  inset-block-end: 10%;
  inline-size: 9rem;
  block-size: 2.2rem;
  border: 0.0625rem solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  transform: translateX(-50%);
  opacity: 0.5;
  animation: scene-ripple-expand 6.8s ease-out infinite;
}

.scene-ripple--two {
  inset-block-end: 6%;
  inline-size: 6.5rem;
  animation-delay: 1.4s;
}

.scene-copy-card {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.45rem;
  max-inline-size: min(100%, 32ch);
  padding: 0.95rem 1rem;
  border: 0.0625rem solid rgba(255, 255, 255, 0.14);
  border-radius: var(--appearance-radius-panel);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05));
}

.scene-copy-card__eyebrow,
.scene-copy-card__title,
.scene-copy-card__subtitle,
.scene-caption {
  margin: 0;
}

.scene-copy-card__eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(247, 243, 236, 0.72);
}

.scene-copy-card__title {
  font-size: clamp(1.45rem, 1rem + 1vw, 2.1rem);
  line-height: 1.08;
  color: var(--auth-visual-copy);
}

.scene-copy-card__subtitle,
.scene-caption {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: rgba(247, 243, 236, 0.8);
}

.scene-caption {
  max-inline-size: 28ch;
  color: var(--color-text-secondary);
}

.scene-stage--register {
  --scene-leaf-duration: 7.2s;
}

.scene-stage--forgot .scene-cloud {
  opacity: 0.72;
}

.scene-stage--forgot .scene-ripple {
  border-color: rgba(191, 219, 254, 0.22);
}

.scene-stage--mood-typing .scene-leaf,
.scene-stage--mood-dodge .scene-leaf {
  animation-duration: calc(var(--scene-leaf-duration) * 0.82);
}

.scene-stage--mood-submitting .scene-cloud,
.scene-stage--mood-success .scene-cloud {
  animation-duration: calc(var(--scene-cloud-duration) * 0.72);
}

@keyframes scene-cloud-drift {
  from {
    transform: translateX(-0.4rem);
  }

  to {
    transform: translateX(0.7rem);
  }
}

@keyframes scene-leaf-sway {
  from {
    transform: rotate(-4deg) translateY(-0.1rem);
  }

  to {
    transform: rotate(5deg) translateY(0.2rem);
  }
}

@keyframes scene-ripple-expand {
  0% {
    transform: translateX(-50%) scale(0.94);
    opacity: 0.28;
  }

  60% {
    opacity: 0.52;
  }

  100% {
    transform: translateX(-50%) scale(1.08);
    opacity: 0;
  }
}

@media (max-width: 56rem) {
  .auth-scene {
    padding: 0;
  }

  .scene-stage {
    min-block-size: clamp(11rem, 34vw, 14rem);
  }

  .scene-caption {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-cloud,
  .scene-leaf,
  .scene-ripple {
    animation: none;
  }
}
</style>
