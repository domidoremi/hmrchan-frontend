<template>
  <span
    class="brand-pet-logo"
    :class="[`brand-pet-logo--${props.variant}`, { 'brand-pet-logo--tracking': isTracking }]"
    :style="logoStyle"
    aria-hidden="true"
    @pointermove="handlePointerMove"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <span class="brand-pet-logo__orbit brand-pet-logo__orbit--outer" />
    <span class="brand-pet-logo__orbit brand-pet-logo__orbit--inner" />
    <span class="brand-pet-logo__stage">
      <img
        class="brand-pet-logo__pet brand-pet-logo__pet--idle"
        :src="idlePetSrc"
        alt=""
        decoding="async"
        draggable="false"
      />
      <img
        class="brand-pet-logo__pet brand-pet-logo__pet--active"
        :src="activePetSrc"
        alt=""
        decoding="async"
        draggable="false"
      />
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'rail' | 'inline' | 'footer'
  }>(),
  {
    variant: 'inline',
  }
)

const idlePetSrc = '/images/expressions/standing-sm.webp'
const activePetSrc = '/images/expressions/running-sm.webp'

const pointerOffset = ref({ x: 0, y: 0 })
const isPointerInside = ref(false)
const isFocused = ref(false)
const isPressed = ref(false)

const isTracking = computed(() => isPointerInside.value || isFocused.value || isPressed.value)
const logoStyle = computed<Record<string, string>>(() => ({
  '--brand-pet-follow-x': `${pointerOffset.value.x.toFixed(2)}rem`,
  '--brand-pet-follow-y': `${pointerOffset.value.y.toFixed(2)}rem`,
  '--brand-pet-press-scale': isPressed.value ? '0.94' : '1',
}))

function setPointerOffset(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.72
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.58
  pointerOffset.value = { x, y }
}

function handlePointerEnter(event: PointerEvent) {
  isPointerInside.value = true
  setPointerOffset(event)
}

function handlePointerMove(event: PointerEvent) {
  if (!isPointerInside.value) {
    isPointerInside.value = true
  }
  setPointerOffset(event)
}

function handlePointerLeave() {
  isPointerInside.value = false
  isPressed.value = false
  pointerOffset.value = { x: 0, y: 0 }
}

function handlePointerDown(event: PointerEvent) {
  isPressed.value = true
  setPointerOffset(event)
}

function handlePointerUp() {
  isPressed.value = false
}

function handleFocusIn() {
  isFocused.value = true
  pointerOffset.value = { x: 0.18, y: -0.1 }
}

function handleFocusOut() {
  isFocused.value = false
  if (!isPointerInside.value) {
    pointerOffset.value = { x: 0, y: 0 }
  }
}
</script>

<style scoped>
.brand-pet-logo {
  --brand-pet-size: clamp(2.25rem, 4vw, 2.75rem);
  --brand-pet-follow-x: 0rem;
  --brand-pet-follow-y: 0rem;
  --brand-pet-press-scale: 1;
  position: relative;
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  inline-size: var(--brand-pet-size);
  block-size: var(--brand-pet-size);
  border: 0.0625rem solid color-mix(in srgb, var(--ui-compat-border-strong) 56%, transparent);
  border-radius: clamp(0.95rem, 2vw, 1.18rem);
  overflow: visible;
  background:
    radial-gradient(
      circle at 42% 28%,
      color-mix(in srgb, var(--color-primary) 28%, white) 0 18%,
      transparent 36%
    ),
    linear-gradient(
      140deg,
      color-mix(in srgb, var(--color-primary) 18%, var(--ui-compat-surface-elevated)) 0%,
      var(--ui-compat-surface-interactive) 58%,
      color-mix(in srgb, var(--color-primary) 12%, transparent) 100%
    );
  box-shadow:
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.26),
    0 1rem 1.7rem -1.35rem rgba(15, 23, 42, 0.36);
  transform: scale(var(--brand-pet-press-scale));
  transition:
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    transform 180ms var(--ease-spring);
  contain: layout paint;
}

.brand-pet-logo--rail {
  --brand-pet-size: clamp(2.25rem, 3.6vw, 2.7rem);
  border: 0;
  border-radius: calc(var(--app-side-nav-item-radius, 1.1rem) - 0.25rem);
  background: transparent;
  box-shadow: none;
}

.brand-pet-logo--footer {
  --brand-pet-size: 2.65rem;
}

.brand-pet-logo__orbit {
  position: absolute;
  inset: 14%;
  border-radius: inherit;
  opacity: 0.72;
  pointer-events: none;
  transition:
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-normal) var(--ease-out);
}

.brand-pet-logo__orbit--outer {
  border: 0.0625rem solid color-mix(in srgb, var(--color-primary) 34%, transparent);
  transform: translate3d(
      calc(var(--brand-pet-follow-x) * -0.38),
      calc(var(--brand-pet-follow-y) * -0.38),
      0
    )
    rotate(-10deg);
}

.brand-pet-logo__orbit--inner {
  inset: 28% 22% 20% 24%;
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
  filter: blur(0.45rem);
  transform: translate3d(
      calc(var(--brand-pet-follow-x) * 0.2),
      calc(var(--brand-pet-follow-y) * 0.2),
      0
    )
    scale(0.92);
}

.brand-pet-logo__stage {
  position: relative;
  z-index: 1;
  inline-size: 82%;
  block-size: 82%;
  transform: translate3d(var(--brand-pet-follow-x), var(--brand-pet-follow-y), 0);
  transform-origin: 50% 78%;
  transition: transform 220ms var(--ease-spring);
  animation: brand-pet-breathe 3.4s ease-in-out infinite;
}

.brand-pet-logo__pet {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: contain;
  object-position: center;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 0.36rem 0.42rem rgba(15, 23, 42, 0.16));
  transition:
    opacity 180ms var(--ease-out),
    transform 220ms var(--ease-spring),
    filter 180ms var(--ease-out);
}

.brand-pet-logo__pet--idle {
  opacity: 1;
  transform: translate3d(0, 0, 0) rotate(0deg);
}

.brand-pet-logo__pet--active {
  opacity: 0;
  transform: translate3d(-0.08rem, 0.08rem, 0) rotate(-6deg) scale(0.96);
}

.brand-pet-logo--tracking {
  border-color: color-mix(in srgb, var(--color-primary) 48%, var(--ui-compat-border-strong));
  box-shadow:
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.3),
    0 1.05rem 1.95rem -1.3rem rgba(var(--color-primary-rgb), 0.44);
}

.brand-pet-logo--tracking .brand-pet-logo__stage {
  animation-duration: 1.55s;
}

.brand-pet-logo--tracking .brand-pet-logo__orbit--outer {
  opacity: 1;
  transform: translate3d(
      calc(var(--brand-pet-follow-x) * -0.46),
      calc(var(--brand-pet-follow-y) * -0.46),
      0
    )
    rotate(7deg) scale(1.06);
}

.brand-pet-logo--tracking .brand-pet-logo__orbit--inner {
  opacity: 0.92;
  transform: translate3d(
      calc(var(--brand-pet-follow-x) * 0.34),
      calc(var(--brand-pet-follow-y) * 0.34),
      0
    )
    scale(1.1);
}

.brand-pet-logo--tracking .brand-pet-logo__pet--idle {
  opacity: 0;
  transform: translate3d(0.08rem, 0.04rem, 0) rotate(5deg) scale(0.96);
}

.brand-pet-logo--tracking .brand-pet-logo__pet--active {
  opacity: 1;
  transform: translate3d(0, 0, 0) rotate(0deg) scale(1.04);
  filter: drop-shadow(0 0.5rem 0.7rem rgba(var(--color-primary-rgb), 0.22));
}

@keyframes brand-pet-breathe {
  0%,
  100% {
    transform: translate3d(var(--brand-pet-follow-x), var(--brand-pet-follow-y), 0) scale(1);
  }

  48% {
    transform: translate3d(var(--brand-pet-follow-x), calc(var(--brand-pet-follow-y) - 0.08rem), 0)
      scale(1.035);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-pet-logo,
  .brand-pet-logo__orbit,
  .brand-pet-logo__stage,
  .brand-pet-logo__pet {
    transition: none;
    animation: none;
  }

  .brand-pet-logo__stage {
    transform: none;
  }
}
</style>
