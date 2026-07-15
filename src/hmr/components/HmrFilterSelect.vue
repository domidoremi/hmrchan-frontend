<template>
  <div class="hmr-data-field hmr-filter-field">
    <span :id="labelId">{{ label }}</span>
    <div class="hmr-filter-select" :class="{ 'is-open': open }">
      <button
        :id="valueId"
        class="hmr-filter-trigger"
        type="button"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-controls="menuId"
        :aria-labelledby="`${labelId} ${valueId}`"
        @click="emit('toggle')"
        @keydown.esc.prevent="emit('close')"
      >
        {{ selectedLabel }}
      </button>
      <div
        v-show="open"
        :id="menuId"
        class="hmr-filter-menu"
        role="listbox"
        :hidden="!open"
        :aria-labelledby="labelId"
      >
        <button
          v-for="item in options"
          :key="`filter-${filterId}-${item.id}`"
          class="hmr-filter-option"
          :class="{ 'is-selected': item.id === modelValue }"
          type="button"
          role="option"
          :aria-selected="item.id === modelValue"
          @click="emit('select', item.id)"
        >
          <span>{{ item.label }}</span>
          <em v-if="typeof item.count === 'number'">{{ item.count }}</em>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type HmrFilterOption = {
  id: string
  label: string
  count?: number
}

const props = defineProps<{
  filterId: string
  label: string
  modelValue: string
  open: boolean
  options: HmrFilterOption[]
}>()

const emit = defineEmits<{
  close: []
  select: [value: string]
  toggle: []
}>()

const labelId = computed(() => `hmr-filter-label-${props.filterId}`)
const valueId = computed(() => `hmr-filter-value-${props.filterId}`)
const menuId = computed(() => `hmr-filter-menu-${props.filterId}`)
const selectedLabel = computed(
  () => props.options.find((item) => item.id === props.modelValue)?.label ?? props.modelValue
)
</script>
