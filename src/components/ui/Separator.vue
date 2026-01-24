<template>
  <component :is="as" :class="separatorClass" role="separator" :aria-orientation="orientation" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'UiSeparator' })

interface Props {
  as?: string
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  orientation: 'horizontal',
  decorative: false,
})

const separatorClass = computed(() => ['ui-separator', `ui-separator--${props.orientation}`])
</script>

<style scoped>
.ui-separator {
  flex-shrink: 0;
  background: var(--glass-border);
}

.ui-separator--horizontal {
  width: 100%;
  height: 1px;
}

.ui-separator--vertical {
  width: 1px;
  height: 100%;
}
</style>
