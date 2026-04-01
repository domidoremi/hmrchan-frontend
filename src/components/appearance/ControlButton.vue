<template>
  <component
    :is="tag"
    v-bind="forwardedAttrs"
    :type="resolvedType"
    class="page-control"
    :class="{
      'page-control--compact': size === 'compact',
      'page-control--square': size === 'square',
      'page-control--icon-only': iconOnly,
      'page-control--active': active || pressed || current,
    }"
  >
    <span v-if="$slots.start" class="page-control__icon page-control__icon--start">
      <slot name="start" />
    </span>
    <span v-if="$slots.default" class="page-control__label">
      <slot />
    </span>
    <span v-if="$slots.end" class="page-control__meta">
      <slot name="end" />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, useAttrs, type Component } from 'vue'

defineOptions({
  inheritAttrs: false,
})

interface Props {
  tag?: string | Component
  type?: 'button' | 'submit' | 'reset'
  size?: 'default' | 'compact' | 'square'
  iconOnly?: boolean
  active?: boolean
  pressed?: boolean
  current?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'button',
  type: 'button',
  size: 'default',
  iconOnly: false,
  active: false,
  pressed: false,
  current: false,
})

const attrs = useAttrs()

const isNativeButton = computed(() => props.tag === 'button')

const resolvedType = computed(() => (isNativeButton.value ? props.type : undefined))

const forwardedAttrs = computed(() => {
  const nextAttrs = { ...attrs }

  if (props.pressed && nextAttrs['aria-pressed'] === undefined) {
    nextAttrs['aria-pressed'] = 'true'
  }

  if (props.current && nextAttrs['aria-current'] === undefined) {
    nextAttrs['aria-current'] = 'page'
  }

  return nextAttrs
})
</script>
