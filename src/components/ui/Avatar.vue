<template>
  <span :class="avatarClass" :style="avatarStyle">
    <img
      v-if="src && !hasError"
      :src="src"
      :alt="alt"
      :loading="loading"
      :decoding="decoding"
      :fetchpriority="fetchPriority"
      class="ui-avatar__image"
      @error="handleError"
    />
    <span v-else-if="fallback" class="ui-avatar__fallback">
      {{ fallback }}
    </span>
    <span v-else class="ui-avatar__fallback">
      <slot name="fallback">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="ui-avatar__icon"
        >
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
      </slot>
    </span>
  </span>
</template>

<script setup lang="ts" vapor>
import { computed, ref } from 'vue'

defineOptions({ name: 'UiAvatar' })

interface Props {
  src?: string
  alt?: string
  fallback?: string
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'custom'
  shape?: 'circle' | 'square'
  loading?: 'eager' | 'lazy'
  decoding?: 'sync' | 'async' | 'auto'
  fetchPriority?: 'high' | 'low' | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  size: 'default',
  shape: 'circle',
  loading: 'lazy',
  decoding: 'async',
  fetchPriority: 'auto',
})
defineSlots<{
  fallback?: () => unknown
}>()

const hasError = ref(false)

const avatarClass = computed(() => [
  'ui-avatar',
  `ui-avatar--${props.size}`,
  `ui-avatar--${props.shape}`,
])

const avatarStyle = computed(() => {
  if (props.size === 'custom') return undefined

  const sizes: Record<string, string> = {
    xs: '1.5rem',
    sm: '2rem',
    default: '2.5rem',
    lg: '3rem',
    xl: '4rem',
  }
  return {
    '--avatar-size': sizes[props.size] || sizes.default,
  }
})

function handleError() {
  hasError.value = true
}
</script>

<style scoped>
.ui-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--avatar-size);
  height: var(--avatar-size);
  flex-shrink: 0;
  overflow: hidden;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}

.ui-avatar--circle {
  border-radius: var(--radius-full);
}

.ui-avatar--square {
  border-radius: var(--radius);
}

.ui-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ui-avatar__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: calc(var(--avatar-size) * 0.4);
  font-weight: var(--font-medium);
  color: var(--color-muted-foreground);
  text-transform: uppercase;
  background: var(--color-muted);
}

.ui-avatar__icon {
  width: 50%;
  height: 50%;
}

/* Size variations */
.ui-avatar--xs {
  font-size: var(--text-xs);
}

.ui-avatar--sm {
  font-size: var(--text-xs);
}

.ui-avatar--default {
  font-size: var(--text-sm);
}

.ui-avatar--lg {
  font-size: var(--text-base);
}

.ui-avatar--xl {
  font-size: var(--text-lg);
}
</style>
